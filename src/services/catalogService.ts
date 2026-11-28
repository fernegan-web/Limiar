import type { collections, products } from '@wix/stores';
import type {
  AccentTone,
  CatalogFacetMetadata,
  CatalogQuery,
  Category,
  Collection,
  Product,
  ProductOption,
  ProductOptionChoice,
  ProductSize,
  ProductVariant,
} from '../types/commerce';
import { initWixVisitorAuth, myWixClient } from './wix/wixClient';

const CACHE_TTL = 30 * 1000;
const PAGE_SIZE = 100;
const ALL_PRODUCTS_COLLECTION_SLUG = 'all-products';

let cachedRawCollections: collections.Collection[] | null = null;
let cachedProducts: Product[] | null = null;
let cachedCategories: Category[] | null = null;
let cachedCollections: Collection[] | null = null;
let lastCatalogFetchTime = 0;

let inFlightCatalogLoad: Promise<{
  products: Product[];
  categories: Category[];
  collections: Collection[];
}> | null = null;

export function invalidateCatalogCache(): void {
  cachedRawCollections = null;
  cachedProducts = null;
  cachedCategories = null;
  cachedCollections = null;
  lastCatalogFetchTime = 0;
}

function formatPriceByCurrency(amount: number, currency = 'BRL'): string {
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency,
    }).format(amount);
  } catch {
    return `R$ ${amount.toFixed(2).replace('.', ',')}`;
  }
}

/**
 * Remove tags HTML retornadas pela Wix para gerar texto limpo em cards, busca e resumos.
 */
export function stripHtmlToPlainText(input: string, maxLength = 150): string {
  if (!input) return '';
  const withoutTags = input
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6])>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();

  if (withoutTags.length <= maxLength) return withoutTags;
  const sliced = withoutTags.slice(0, maxLength);
  const lastSpace = sliced.lastIndexOf(' ');
  return `${(lastSpace > 40 ? sliced.slice(0, lastSpace) : sliced).trim()}…`;
}

interface LegacyPriceShape {
  currency?: string | null;
  price?: number | null;
  discountedPrice?: number | null;
  formatted?: {
    price?: string | null;
    discountedPrice?: string | null;
  } | null;
}

function resolvePriceInfo(
  priceData?: products.PriceData | null,
  legacyPrice?: LegacyPriceShape | null
): {
  currency: string;
  price: number;
  formattedPrice: string;
  originalPrice?: number;
  formattedOriginalPrice?: string;
  discountAmount?: number;
  discountPercentage?: number;
} {
  const currency = priceData?.currency || legacyPrice?.currency || 'BRL';
  const basePrice = priceData?.price ?? legacyPrice?.price ?? 0;
  const discounted = priceData?.discountedPrice ?? legacyPrice?.discountedPrice;
  const hasDiscount =
    typeof discounted === 'number' && discounted > 0 && basePrice > 0 && discounted < basePrice;

  const finalPrice = hasDiscount ? discounted : basePrice;
  const formattedFinal = hasDiscount
    ? priceData?.formatted?.discountedPrice ||
      legacyPrice?.formatted?.discountedPrice ||
      formatPriceByCurrency(finalPrice, currency)
    : priceData?.formatted?.price ||
      legacyPrice?.formatted?.price ||
      formatPriceByCurrency(finalPrice, currency);

  const formattedOriginal = hasDiscount
    ? priceData?.formatted?.price ||
      legacyPrice?.formatted?.price ||
      formatPriceByCurrency(basePrice, currency)
    : undefined;

  const discountAmount = hasDiscount ? Number((basePrice - finalPrice).toFixed(2)) : undefined;
  const rawPct = hasDiscount ? Math.round(((basePrice - finalPrice) / basePrice) * 100) : 0;
  const discountPercentage = hasDiscount && rawPct >= 1 ? Math.min(99, rawPct) : undefined;

  return {
    currency,
    price: finalPrice,
    formattedPrice: formattedFinal,
    originalPrice: hasDiscount ? basePrice : undefined,
    formattedOriginalPrice: formattedOriginal,
    discountAmount,
    discountPercentage,
  };
}

function findOptionValue(
  choices: Record<string, string> | undefined,
  patterns: RegExp[]
): string | undefined {
  if (!choices) return undefined;
  for (const [key, value] of Object.entries(choices)) {
    if (patterns.some((rx) => rx.test(key))) {
      return value;
    }
  }
  return undefined;
}

function normalizeProductSize(raw: string | undefined): ProductSize | string {
  if (!raw) return 'Único';
  const trimmed = raw.trim();
  const upper = trimmed.toUpperCase();
  if (upper === 'S') return 'P';
  if (upper === 'L') return 'G';
  if (upper === 'XL') return 'GG';
  if (upper === 'XXL') return 'XG';
  if (['P', 'M', 'G', 'GG', 'XG', 'ÚNICO', 'UNICO'].includes(upper)) {
    return upper === 'UNICO' ? 'Único' : (upper as ProductSize);
  }
  return trimmed;
}

function collectProductImages(wixProd: products.Product): string[] {
  const images: string[] = [];
  const pushUnique = (url?: string | null) => {
    if (url && typeof url === 'string' && !images.includes(url)) {
      images.push(url);
    }
  };

  pushUnique(wixProd.media?.mainMedia?.image?.url);
  pushUnique(wixProd.media?.mainMedia?.thumbnail?.url);
  for (const item of wixProd.media?.items ?? []) {
    pushUnique(item.image?.url || item.thumbnail?.url);
  }
  for (const opt of wixProd.productOptions ?? []) {
    for (const choice of opt.choices ?? []) {
      pushUnique(choice.media?.mainMedia?.image?.url);
      for (const m of choice.media?.items ?? []) {
        pushUnique(m.image?.url);
      }
    }
  }
  return images;
}

function buildOptionMediaIndex(wixProd: products.Product): Map<string, string> {
  const index = new Map<string, string>();
  for (const opt of wixProd.productOptions ?? []) {
    const optName = opt.name || '';
    for (const choice of opt.choices ?? []) {
      const choiceVal = choice.description || choice.value || '';
      const mediaUrl =
        choice.media?.mainMedia?.image?.url || choice.media?.items?.[0]?.image?.url;
      if (optName && choiceVal && mediaUrl) {
        index.set(`${optName}::${choiceVal}`, mediaUrl);
        if (choice.value) {
          index.set(`${optName}::${choice.value}`, mediaUrl);
        }
      }
    }
  }
  return index;
}

function extractProductOptions(wixProd: products.Product): ProductOption[] {
  const options: ProductOption[] = [];
  for (const opt of wixProd.productOptions ?? []) {
    const name = opt.name?.trim();
    if (!name) continue;
    const seen = new Set<string>();
    const choices: ProductOptionChoice[] = [];
    for (const c of opt.choices ?? []) {
      const label = (c.description || c.value || '').trim();
      const val = (c.value || c.description || '').trim();
      if (!val || seen.has(val)) continue;
      seen.add(val);
      choices.push({
        value: val,
        description: label || val,
        inStock: c.inStock ?? true,
        visible: c.visible ?? true,
        mediaUrl: c.media?.mainMedia?.image?.url || c.media?.items?.[0]?.image?.url,
      });
    }
    if (choices.length > 0) {
      options.push({
        name,
        optionType: String(opt.optionType || 'drop_down'),
        choices,
      });
    }
  }
  return options;
}

/**
 * Mapeia um produto do Wix Stores para o modelo Product da aplicação Limiar.
 */
export function mapWixProductToAppProduct(
  wixProd: products.Product,
  collectionsIndex: Map<string, collections.Collection> = new Map()
): Product {
  const productPriceInfo = resolvePriceInfo(wixProd.priceData, wixProd.price);
  const images = collectProductImages(wixProd);
  const optionMediaIndex = buildOptionMediaIndex(wixProd);
  const options = extractProductOptions(wixProd);
  const manageVariants = Boolean(wixProd.manageVariants);

  const variants: ProductVariant[] =
    wixProd.variants && wixProd.variants.length > 0
      ? wixProd.variants
          .filter((v) => v.variant?.visible !== false)
          .map((v, i) => {
            const rawChoices = { ...(v.choices ?? {}) };
            const sizeRaw = findOptionValue(rawChoices, [/tamanh/i, /size/i, /medid/i]);
            const colorRaw = findOptionValue(rawChoices, [/cor/i, /color/i, /acabament/i]);
            const variantPriceInfo = resolvePriceInfo(
              v.variant?.priceData ?? wixProd.priceData,
              wixProd.price
            );

            let variantImage: string | undefined;
            for (const [optKey, optVal] of Object.entries(rawChoices)) {
              const found = optionMediaIndex.get(`${optKey}::${optVal}`);
              if (found) {
                variantImage = found;
                break;
              }
            }

            const trackQuantity = Boolean(v.stock?.trackQuantity);
            const stockCount =
              typeof v.stock?.quantity === 'number' ? v.stock.quantity : undefined;
            const inStock =
              (v.stock?.inStock ?? true) && (!trackQuantity || (stockCount ?? 0) > 0);

            return {
              id: v._id || `${wixProd._id}-var-${i}`,
              size: normalizeProductSize(sizeRaw),
              colorName: colorRaw?.trim() || 'Padrão',
              colorHex: '#141516',
              choices: rawChoices,
              price: variantPriceInfo.price,
              formattedPrice: variantPriceInfo.formattedPrice,
              originalPrice: variantPriceInfo.originalPrice,
              formattedOriginalPrice: variantPriceInfo.formattedOriginalPrice,
              discountPercentage: variantPriceInfo.discountPercentage,
              imageUrl: variantImage,
              inStock,
              trackQuantity,
              stockCount,
              sku: v.variant?.sku || undefined,
            };
          })
      : [
          {
            id: `${wixProd._id}-default`,
            size: 'Único',
            colorName: 'Padrão',
            colorHex: '#141516',
            choices: {},
            price: productPriceInfo.price,
            formattedPrice: productPriceInfo.formattedPrice,
            originalPrice: productPriceInfo.originalPrice,
            formattedOriginalPrice: productPriceInfo.formattedOriginalPrice,
            discountPercentage: productPriceInfo.discountPercentage,
            imageUrl: images[0],
            inStock:
              (wixProd.stock?.inStock ?? true) &&
              (!wixProd.stock?.trackInventory || (wixProd.stock?.quantity ?? 0) > 0),
            trackQuantity: Boolean(wixProd.stock?.trackInventory),
            stockCount:
              typeof wixProd.stock?.quantity === 'number' ? wixProd.stock.quantity : undefined,
            sku: wixProd.sku || undefined,
          },
        ];

  const availableSizes = Array.from(new Set(variants.map((v) => String(v.size))));
  const availableColors = Array.from(new Set(variants.map((v) => v.colorName)));

  const numericPrices = variants
    .map((v) => v.price)
    .filter((p): p is number => typeof p === 'number' && Number.isFinite(p) && p > 0);
  const minPrice =
    numericPrices.length > 0 ? Math.min(...numericPrices) : productPriceInfo.price;
  const maxPrice =
    numericPrices.length > 0 ? Math.max(...numericPrices) : productPriceInfo.price;
  const hasVariablePrice = maxPrice - minPrice > 0.01;

  const collectionIds = (wixProd.collectionIds ?? []).filter(Boolean);
  const resolvedCollections = collectionIds
    .map((id) => collectionsIndex.get(id))
    .filter((c): c is collections.Collection => Boolean(c));
  const collectionSlugs = resolvedCollections
    .map((c) => c.slug || '')
    .filter(Boolean);

  const primaryCollection =
    resolvedCollections.find((c) => c.slug !== ALL_PRODUCTS_COLLECTION_SLUG) ||
    resolvedCollections[0];

  const isFeatured =
    collectionSlugs.some((slug) => slug === 'destaque' || slug === 'mais-vendidos') ||
    collectionIds.some(
      (id) =>
        id === 'd92151df-e4cc-4b00-98a6-41859f8804f5' ||
        id === '91a9bf1f-3b5f-4d4d-bbdb-a31c08cccb9a'
    );

  const ribbon =
    typeof wixProd.ribbon === 'string' && wixProd.ribbon.trim().length > 0
      ? wixProd.ribbon.trim()
      : undefined;

  const freeShippingEligible =
    Boolean(ribbon && /frete\s*gr[aá]tis|free\s*shipping/i.test(ribbon)) ||
    collectionSlugs.some((slug) => {
      const normalized = slug.toLowerCase();
      return normalized === 'frete-gratis' || normalized === 'free-shipping';
    });

  const bestVariantDiscountPct = variants.reduce<number | undefined>((best, v) => {
    if (!v.inStock || !v.discountPercentage) return best;
    return best === undefined ? v.discountPercentage : Math.max(best, v.discountPercentage);
  }, undefined);

  const resolvedDiscountPercentage =
    productPriceInfo.discountPercentage ?? bestVariantDiscountPct;

  const rawDescription = typeof wixProd.description === 'string' ? wixProd.description : '';
  const plainSummary = stripHtmlToPlainText(rawDescription, 140);
  const productInStock = variants.some((v) => v.inStock);
  const lastUpdatedRaw = (wixProd as unknown as { lastUpdated?: string | Date }).lastUpdated;
  const lastUpdated =
    lastUpdatedRaw instanceof Date
      ? lastUpdatedRaw.toISOString()
      : typeof lastUpdatedRaw === 'string'
        ? lastUpdatedRaw
        : undefined;

  return {
    id: wixProd._id || '',
    slug: wixProd.slug || wixProd._id || '',
    name: wixProd.name || 'Produto Limiar',
    price: productPriceInfo.price,
    currency: productPriceInfo.currency,
    formattedPrice: productPriceInfo.formattedPrice,
    originalPrice: productPriceInfo.originalPrice,
    formattedOriginalPrice: productPriceInfo.formattedOriginalPrice,
    discountAmount: productPriceInfo.discountAmount,
    discountPercentage: resolvedDiscountPercentage,
    minPrice,
    maxPrice,
    hasVariablePrice,
    ribbon,
    sku: wixProd.sku || variants.find((v) => v.sku)?.sku || undefined,
    numericId:
      typeof wixProd.numericId === 'string' && wixProd.numericId.trim()
        ? wixProd.numericId.trim()
        : undefined,
    freeShippingEligible,
    lastUpdated,
    categoryId: primaryCollection?._id || collectionIds[0] || 'all-products',
    categoryName: primaryCollection?.name || 'Catálogo',
    collectionSlug: primaryCollection?.slug || collectionSlugs[0] || ALL_PRODUCTS_COLLECTION_SLUG,
    collectionName: primaryCollection?.name || 'Coleção Limiar',
    collectionIds,
    collectionSlugs,
    shortDescription:
      plainSummary || 'Peça autoral com acabamento premium e direção visual Organic Dark Tech.',
    description:
      rawDescription ||
      'Peça autoral desenvolvida entre a intersecção da cultura underground, darkpsy e streetwear.',
    composition: 'Confira a descrição completa da peça para especificações de tecido e gramatura.',
    careInstructions: 'Lavar à mão ou ciclo delicado. Não alvejar. Secar à sombra.',
    accentTone: isFeatured ? 'uv' : 'acid',
    statusTag: ribbon || (isFeatured ? 'DESTAQUE' : undefined),
    images,
    options,
    variants,
    manageVariants,
    availableSizes,
    availableColors,
    inStock: productInStock,
    featured: isFeatured,
    isDemoData: false,
  };
}

/**
 * Seleciona a melhor variante correspondente a um mapa de opções escolhidas.
 */
export function resolveProductVariant(
  product: Product,
  selectedChoices: Record<string, string>
): ProductVariant | null {
  const options = product.options ?? [];
  if (options.length === 0 || product.variants.length <= 1) {
    return product.variants[0] ?? null;
  }

  const exact = product.variants.find((variant) =>
    options.every((opt) => {
      const chosen = selectedChoices[opt.name];
      if (!chosen) return false;
      const variantChoice = variant.choices?.[opt.name];
      return variantChoice === chosen;
    })
  );

  return exact ?? null;
}

/**
 * Verifica se uma escolha de opção possui ao menos uma variante em estoque.
 */
export function isOptionChoiceGloballyInStock(
  product: Product,
  optionName: string,
  choiceValue: string
): boolean {
  if (product.variants.length === 0) return false;
  return product.variants.some(
    (v) => v.inStock && v.choices?.[optionName] === choiceValue
  );
}

/**
 * Verifica se uma escolha combina em estoque com as demais seleções atuais.
 */
export function isOptionChoiceCompatibleWithSelection(
  product: Product,
  optionName: string,
  choiceValue: string,
  selectedChoices: Record<string, string>
): boolean {
  const options = product.options ?? [];
  return product.variants.some((v) => {
    if (!v.inStock || v.choices?.[optionName] !== choiceValue) return false;
    return options.every((opt) => {
      if (opt.name === optionName) return true;
      const current = selectedChoices[opt.name];
      return !current || v.choices?.[opt.name] === current;
    });
  });
}

/**
 * Ao selecionar uma opção incompatível com a seleção secundária atual,
 * reconcilia outras opções para a primeira variante em estoque disponível.
 */
export function selectProductOptionWithReconciliation(
  product: Product,
  currentChoices: Record<string, string>,
  optionName: string,
  choiceValue: string
): Record<string, string> {
  const next: Record<string, string> = {
    ...currentChoices,
    [optionName]: choiceValue,
  };

  const exact = resolveProductVariant(product, next);
  if (exact && exact.inStock) {
    return next;
  }

  const compatibleInStock =
    product.variants.find((v) => v.inStock && v.choices?.[optionName] === choiceValue) ||
    product.variants.find((v) => v.choices?.[optionName] === choiceValue);

  if (compatibleInStock?.choices) {
    return { ...compatibleInStock.choices };
  }

  return next;
}

export function isSizeOptionName(name: string): boolean {
  return /tamanh|size|medid|comprim|numera/i.test(name);
}

const LETTER_SIZE_ORDER: Record<string, number> = {
  PP: 1,
  XS: 1,
  P: 2,
  S: 2,
  M: 3,
  G: 4,
  L: 4,
  GG: 5,
  XL: 5,
  XG: 6,
  XXL: 6,
  XXG: 7,
  ÚNICO: 99,
  UNICO: 99,
};

export function compareCatalogSizes(a: string, b: string): number {
  const ua = a.trim().toUpperCase();
  const ub = b.trim().toUpperCase();
  const la = LETTER_SIZE_ORDER[ua];
  const lb = LETTER_SIZE_ORDER[ub];
  if (la !== undefined && lb !== undefined) return la - lb;
  if (la !== undefined) return -1;
  if (lb !== undefined) return 1;

  const na = Number.parseFloat(ua.replace(',', '.'));
  const nb = Number.parseFloat(ub.replace(',', '.'));
  if (!Number.isNaN(na) && !Number.isNaN(nb)) {
    return na - nb;
  }
  return a.localeCompare(b, 'pt-BR', { numeric: true });
}

export function extractCatalogFacetMetadata(productsList: Product[]): CatalogFacetMetadata {
  const sizeSet = new Set<string>();
  let minBound = Number.POSITIVE_INFINITY;
  let maxBound = 0;
  let offersCount = 0;
  let freeShippingCount = 0;

  for (const product of productsList) {
    const low = product.minPrice ?? product.price;
    const high = product.maxPrice ?? product.price;
    if (Number.isFinite(low) && low > 0) minBound = Math.min(minBound, low);
    if (Number.isFinite(high) && high > 0) maxBound = Math.max(maxBound, high);
    if (product.discountPercentage && product.discountPercentage > 0) offersCount += 1;
    if (product.freeShippingEligible) freeShippingCount += 1;

    // Coleta tamanhos reais em estoque nas opções e variantes do catálogo
    const fromOptions = (product.options ?? []).filter((opt) => isSizeOptionName(opt.name));
    if (fromOptions.length > 0) {
      for (const opt of fromOptions) {
        for (const choice of opt.choices) {
          if (!choice.visible) continue;
          const label = (choice.description || choice.value || '').trim();
          if (label) sizeSet.add(label);
        }
      }
    } else {
      for (const variant of product.variants) {
        const s = String(variant.size || '').trim();
        if (s && s !== 'Único') {
          sizeSet.add(s);
        }
      }
    }
  }

  return {
    availableSizes: Array.from(sizeSet).sort(compareCatalogSizes),
    minPriceBound: Number.isFinite(minBound) ? Math.floor(minBound) : 0,
    maxPriceBound: maxBound > 0 ? Math.ceil(maxBound) : 0,
    offersCount,
    freeShippingCount,
    totalCount: productsList.length,
  };
}

export function searchCatalogSuggestions(
  productsList: Product[],
  rawQuery: string,
  limit = 6
): Product[] {
  const term = rawQuery.trim().toLowerCase();
  if (!term) return [];

  const scored: Array<{ product: Product; score: number }> = [];
  for (const p of productsList) {
    const nameLower = p.name.toLowerCase();
    const catLower = p.categoryName.toLowerCase();
    const colLower = p.collectionName.toLowerCase();
    const descLower = p.shortDescription.toLowerCase();
    const skuLower = (p.sku || '').toLowerCase();

    let score = 0;
    if (nameLower.startsWith(term)) score += 120;
    else if (nameLower.includes(term)) score += 85;
    if (catLower.includes(term) || colLower.includes(term)) score += 45;
    if (skuLower && skuLower.includes(term)) score += 40;
    if (descLower.includes(term)) score += 20;

    if (score > 0) {
      if (p.inStock !== false) score += 8;
      if (p.featured) score += 4;
      scored.push({ product: p, score });
    }
  }

  scored.sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name, 'pt-BR'));
  return scored.slice(0, Math.max(1, limit)).map((entry) => entry.product);
}

/**
 * Filtros e ordenação aplicados sobre os produtos reais consultados no Wix.
 */
export function filterAndSortProducts(productsList: Product[], query: CatalogQuery = {}): Product[] {
  let result = [...productsList];

  if (query.category && query.category !== 'todas') {
    const target = query.category.toLowerCase();
    result = result.filter(
      (p) =>
        p.categoryId === query.category ||
        Boolean(p.collectionIds?.includes(query.category || '')) ||
        Boolean(p.collectionSlugs?.some((s) => s.toLowerCase() === target)) ||
        p.categoryName.toLowerCase() === target
    );
  }

  if (query.collection && query.collection !== 'todas') {
    const target = query.collection.toLowerCase();
    result = result.filter(
      (p) =>
        p.collectionSlug.toLowerCase() === target ||
        Boolean(p.collectionSlugs?.some((s) => s.toLowerCase() === target)) ||
        Boolean(p.collectionIds?.includes(query.collection || ''))
    );
  }

  if (query.size && query.size.trim().length > 0) {
    const targetSize = query.size.trim().toUpperCase();
    result = result.filter((p) =>
      p.variants.some((variant) => {
        if (!variant.inStock) return false;
        if (String(variant.size).trim().toUpperCase() === targetSize) return true;
        return Object.values(variant.choices ?? {}).some(
          (val) => val.trim().toUpperCase() === targetSize
        );
      })
    );
  }

  if (typeof query.minPrice === 'number' && Number.isFinite(query.minPrice) && query.minPrice > 0) {
    const minP = query.minPrice;
    result = result.filter((p) => (p.maxPrice ?? p.price) >= minP);
  }

  if (typeof query.maxPrice === 'number' && Number.isFinite(query.maxPrice) && query.maxPrice > 0) {
    const maxP = query.maxPrice;
    result = result.filter((p) => (p.minPrice ?? p.price) <= maxP);
  }

  if (query.onlyOffers) {
    result = result.filter((p) => Boolean(p.discountPercentage && p.discountPercentage > 0));
  }

  if (query.freeShippingOnly) {
    result = result.filter((p) => Boolean(p.freeShippingEligible));
  }

  if (query.inStockOnly) {
    result = result.filter((p) => p.inStock !== false);
  }

  if (query.search && query.search.trim().length > 0) {
    const term = query.search.trim().toLowerCase();
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.categoryName.toLowerCase().includes(term) ||
        p.collectionName.toLowerCase().includes(term) ||
        p.shortDescription.toLowerCase().includes(term) ||
        (p.sku ? p.sku.toLowerCase().includes(term) : false)
    );
  }

  switch (query.sort) {
    case 'discount-desc':
      result.sort(
        (a, b) =>
          (b.discountPercentage ?? 0) - (a.discountPercentage ?? 0) ||
          a.price - b.price
      );
      break;
    case 'price-asc':
      result.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      result.sort((a, b) => b.price - a.price);
      break;
    case 'name-asc':
      result.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      break;
    case 'newest':
      result.sort((a, b) => {
        const ta = a.lastUpdated ? Date.parse(a.lastUpdated) : 0;
        const tb = b.lastUpdated ? Date.parse(b.lastUpdated) : 0;
        return tb - ta;
      });
      break;
    case 'featured':
    default:
      result.sort(
        (a, b) =>
          Number(b.inStock !== false) - Number(a.inStock !== false) ||
          Number(b.featured) - Number(a.featured) ||
          (b.discountPercentage ?? 0) - (a.discountPercentage ?? 0)
      );
      break;
  }

  return result;
}

async function fetchAllWixCollections(): Promise<collections.Collection[]> {
  const all: collections.Collection[] = [];
  let page = await myWixClient.collections.queryCollections().limit(PAGE_SIZE).find();
  all.push(...page.items);
  while (page.hasNext()) {
    page = await page.next();
    all.push(...page.items);
  }
  return all;
}

async function fetchAllWixProducts(): Promise<products.Product[]> {
  const all: products.Product[] = [];
  let page = await myWixClient.products.queryProducts().limit(PAGE_SIZE).find();
  all.push(...page.items);
  while (page.hasNext()) {
    page = await page.next();
    all.push(...page.items);
  }
  return all;
}

export function buildCatalogCollectionsAndCategories(
  rawCollections: collections.Collection[],
  mappedProducts: Product[]
): { categories: Category[]; collections: Collection[] } {
  const visibleCollections = rawCollections.filter(
    (c) => (c.slug || '') !== ALL_PRODUCTS_COLLECTION_SLUG
  );
  const sourceCollections =
    visibleCollections.length > 0 ? visibleCollections : rawCollections;

  const categories: Category[] = sourceCollections.map((c) => {
    const colId = c._id || '';
    const countFromProducts = mappedProducts.filter(
      (p) => p.collectionIds?.includes(colId) || p.categoryId === colId
    ).length;

    return {
      id: colId,
      slug: c.slug || colId,
      name: c.name || 'Categoria',
      description: c.description || '',
      productCount:
        typeof c.numberOfProducts === 'number' && c.numberOfProducts >= 0
          ? c.numberOfProducts
          : countFromProducts,
      isDemoData: false,
    };
  });

  const mappedCollections: Collection[] = sourceCollections.map((c, index) => {
    const colId = c._id || '';
    const colMediaUrl =
      c.media?.mainMedia?.image?.url ||
      c.media?.items?.[0]?.image?.url ||
      mappedProducts.find(
        (p) => (p.collectionIds?.includes(colId) || p.categoryId === colId) && p.images[0]
      )?.images[0] ||
      mappedProducts.find((p) => p.images[0])?.images[0] ||
      '';

    const countFromProducts = mappedProducts.filter(
      (p) => p.collectionIds?.includes(colId) || p.categoryId === colId
    ).length;
    const count =
      typeof c.numberOfProducts === 'number' && c.numberOfProducts >= 0
        ? c.numberOfProducts
        : countFromProducts;

    const tone: AccentTone = index % 2 === 0 ? 'uv' : 'acid';

    return {
      id: colId,
      slug: c.slug || colId,
      name: c.name || 'Coleção',
      subtitle: `${count} ${count === 1 ? 'peça' : 'peças'}`,
      description:
        stripHtmlToPlainText(c.description || '', 150) ||
        'Curadoria oficial conectada ao catálogo Limiar.',
      image: colMediaUrl,
      productCount: count,
      accentTone: tone,
      isDemoData: false,
    };
  });

  return { categories, collections: mappedCollections };
}

async function loadCatalogSnapshot(): Promise<{
  products: Product[];
  categories: Category[];
  collections: Collection[];
}> {
  const now = Date.now();
  if (
    cachedProducts &&
    cachedCategories &&
    cachedCollections &&
    cachedRawCollections &&
    now - lastCatalogFetchTime < CACHE_TTL
  ) {
    return {
      products: cachedProducts,
      categories: cachedCategories,
      collections: cachedCollections,
    };
  }

  if (inFlightCatalogLoad) {
    return inFlightCatalogLoad;
  }

  inFlightCatalogLoad = (async () => {
    try {
      await initWixVisitorAuth();

      const [rawCollections, rawProducts] = await Promise.all([
        fetchAllWixCollections(),
        fetchAllWixProducts(),
      ]);

      const collectionsById = new Map<string, collections.Collection>();
      for (const col of rawCollections) {
        if (col._id) collectionsById.set(col._id, col);
      }

      const dedupedRawProducts: products.Product[] = [];
      const seenIds = new Set<string>();
      for (const p of rawProducts) {
        const pid = p._id || '';
        if (pid && seenIds.has(pid)) continue;
        if (pid) seenIds.add(pid);
        dedupedRawProducts.push(p);
      }

      const mappedProducts = dedupedRawProducts.map((p) =>
        mapWixProductToAppProduct(p, collectionsById)
      );
      const { categories, collections: mappedCollections } =
        buildCatalogCollectionsAndCategories(rawCollections, mappedProducts);

      cachedRawCollections = rawCollections;
      cachedProducts = mappedProducts;
      cachedCategories = categories;
      cachedCollections = mappedCollections;
      lastCatalogFetchTime = Date.now();

      return {
        products: mappedProducts,
        categories,
        collections: mappedCollections,
      };
    } finally {
      inFlightCatalogLoad = null;
    }
  })();

  return inFlightCatalogLoad;
}

export async function fetchCatalogSnapshot(): Promise<{
  products: Product[];
  categories: Category[];
  collections: Collection[];
}> {
  return loadCatalogSnapshot();
}

/**
 * Busca produtos do Wix Stores com paginação completa, cache e deduplicação de requisições.
 * Nenhum fallback com dados fictícios é utilizado em caso de falha.
 */
export async function fetchProducts(query: CatalogQuery = {}): Promise<Product[]> {
  const snapshot = await loadCatalogSnapshot();
  return filterAndSortProducts(snapshot.products, query);
}

export async function fetchFeaturedProducts(): Promise<Product[]> {
  const all = await fetchProducts({ sort: 'featured' });
  const featured = all.filter((p) => p.featured);
  return featured.length > 0 ? featured : all.slice(0, 4);
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const snapshot = await loadCatalogSnapshot();
  return snapshot.products.find((p) => p.slug === slug || p.id === slug) ?? null;
}

export async function fetchCategories(): Promise<Category[]> {
  const snapshot = await loadCatalogSnapshot();
  return snapshot.categories;
}

export async function fetchCollections(): Promise<Collection[]> {
  const snapshot = await loadCatalogSnapshot();
  return snapshot.collections;
}
