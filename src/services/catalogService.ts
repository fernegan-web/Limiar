import type { CatalogQuery, Category, Collection, Product, ProductSize } from '../types/commerce';
import { myWixClient } from './wix/wixClient';
import { queryWixProducts } from './wix/wixProductsService';
import type { products, collections } from '@wix/stores';

let cachedProducts: Product[] | null = null;
let cachedCategories: Category[] | null = null;
let cachedCollections: Collection[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 30 * 1000; // 30 seconds cache

/**
 * Mapeia um produto do Wix Stores para o modelo Product da aplicação Limiar.
 */
export function mapWixProductToAppProduct(wixProd: products.Product): Product {
  const price = wixProd.priceData?.price ?? wixProd.price?.price ?? 0;
  const discountedPrice = wixProd.priceData?.discountedPrice ?? price;
  const finalPrice = discountedPrice > 0 ? discountedPrice : price;
  const formattedPrice =
    wixProd.priceData?.formatted?.discountedPrice ||
    wixProd.priceData?.formatted?.price ||
    `R$ ${finalPrice.toFixed(2).replace('.', ',')}`;

  const images: string[] = [];
  const directMain = (wixProd as unknown as { mainMedia?: { image?: { url?: string }; thumbnail?: { url?: string } } }).mainMedia;
  if (directMain?.image?.url) {
    images.push(directMain.image.url);
  } else if (directMain?.thumbnail?.url) {
    images.push(directMain.thumbnail.url);
  }

  if (wixProd.media?.mainMedia?.image?.url) {
    images.push(wixProd.media.mainMedia.image.url);
  }
  if (wixProd.media?.mainMedia?.thumbnail?.url) {
    images.push(wixProd.media.mainMedia.thumbnail.url);
  }
  if (wixProd.media?.items) {
    wixProd.media.items.forEach((item) => {
      if (item.image?.url && !images.includes(item.image.url)) {
        images.push(item.image.url);
      }
    });
  }
  if (images.length === 0) {
    images.push('https://static.wixstatic.com/media/32314a_2e526d7c1fd342b18376cd518a9b8c9a~mv2.webp');
  }

  const variants =
    wixProd.variants && wixProd.variants.length > 0
      ? wixProd.variants.map((v, i) => {
          const sizeChoice =
            v.choices?.['Tamanho'] || v.choices?.['Size'] || v.choices?.['Size/Tamanho'] || 'Único';
          const colorChoice = v.choices?.['Cor'] || v.choices?.['Color'] || 'Padrão';
          return {
            id: v._id || `var-${i}`,
            size: (['P', 'M', 'G', 'GG', 'XG', 'Único'].includes(sizeChoice)
              ? sizeChoice
              : 'Único') as ProductSize,
            colorName: colorChoice,
            colorHex: '#141516',
            inStock: v.stock?.inStock ?? true,
            stockCount: v.stock?.quantity ?? undefined,
            sku: v.variant?.sku || undefined,
          };
        })
      : [
          {
            id: `${wixProd._id}-default`,
            size: 'Único' as ProductSize,
            colorName: 'Padrão',
            colorHex: '#141516',
            inStock: wixProd.stock?.inStock ?? true,
            stockCount: wixProd.stock?.quantity ?? undefined,
            sku: wixProd.sku || undefined,
          },
        ];

  const availableSizes = Array.from(new Set(variants.map((v) => v.size)));
  const availableColors = Array.from(new Set(variants.map((v) => v.colorName)));

  const collectionIds = wixProd.collectionIds || [];
  const isFeatured = collectionIds.some(
    (id: string) => id === '91a9bf1f-3b5f-4d4d-bbdb-a31c08cccb9a' || id === 'd92151df-e4cc-4b00-98a6-41859f8804f5'
  );

  let descText = '';
  if (typeof wixProd.description === 'string') {
    descText = wixProd.description;
  } else if (wixProd.description && typeof wixProd.description === 'object') {
    descText = JSON.stringify(wixProd.description);
  }

  return {
    id: wixProd._id || '',
    slug: wixProd.slug || wixProd._id || '',
    name: wixProd.name || 'Produto Limiar',
    price: finalPrice,
    currency: 'BRL',
    formattedPrice,
    categoryId: collectionIds[0] || 'geral',
    categoryName: 'Streetwear',
    collectionSlug: collectionIds[0] || 'all-products',
    collectionName: 'Coleção Limiar',
    shortDescription: descText
      ? descText.slice(0, 120)
      : 'Peça autoral com acabamento premium e direção visual Organic Dark Tech.',
    description:
      descText || 'Peça autoral desenvolvida entre a intersecção da cultura underground, darkpsy e streetwear.',
    composition: '100% Algodão Penteado Heavyweight (280g/m²)',
    careInstructions: 'Lavar à mão ou ciclo delicado. Não alvejar. Secar à sombra.',
    accentTone: 'uv',
    statusTag: isFeatured ? 'DESTAQUE' : undefined,
    images,
    variants,
    availableSizes,
    availableColors,
    featured: isFeatured,
    isDemoData: false,
  };
}

/**
 * Filtros e ordenação aplicados sobre os produtos reais consultados no Wix.
 */
export function filterAndSortProducts(productsList: Product[], query: CatalogQuery = {}): Product[] {
  let result = [...productsList];

  if (query.category && query.category !== 'todas') {
    result = result.filter(
      (p) => p.categoryId === query.category || p.categoryName.toLowerCase() === query.category?.toLowerCase()
    );
  }

  if (query.collection && query.collection !== 'todas') {
    result = result.filter((p) => p.collectionSlug === query.collection);
  }

  if (query.size) {
    result = result.filter((p) =>
      p.variants.some((variant) => variant.size === query.size && variant.inStock)
    );
  }

  if (query.search && query.search.trim().length > 0) {
    const term = query.search.trim().toLowerCase();
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.categoryName.toLowerCase().includes(term) ||
        p.collectionName.toLowerCase().includes(term) ||
        p.shortDescription.toLowerCase().includes(term)
    );
  }

  switch (query.sort) {
    case 'price-asc':
      result.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      result.sort((a, b) => b.price - a.price);
      break;
    case 'name-asc':
      result.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      break;
    case 'featured':
    default:
      result.sort((a, b) => Number(b.featured) - Number(a.featured));
      break;
  }

  return result;
}

/**
 * Busca produtos do Wix Stores com cache e tratamento de erros.
 * Nenhuma rota de fallback com produtos fictícios é utilizada em caso de falha.
 */
export async function fetchProducts(query: CatalogQuery = {}): Promise<Product[]> {
  const now = Date.now();
  if (!cachedProducts || now - lastFetchTime > CACHE_TTL) {
    const result = await queryWixProducts({ limit: 100 });
    cachedProducts = result.items.map(mapWixProductToAppProduct);
    lastFetchTime = now;
  }

  return filterAndSortProducts(cachedProducts, query);
}

export async function fetchFeaturedProducts(): Promise<Product[]> {
  const all = await fetchProducts({ sort: 'featured' });
  const featured = all.filter((p) => p.featured);
  return featured.length > 0 ? featured : all.slice(0, 4);
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const productsList = await fetchProducts();
  return productsList.find((p) => p.slug === slug || p.id === slug) ?? null;
}

export async function fetchCategories(): Promise<Category[]> {
  if (cachedCategories) return cachedCategories;
  try {
    const res = await myWixClient.collections.queryCollections().find();
    cachedCategories = res.items.map((c: collections.Collection) => ({
      id: c._id || '',
      slug: c.slug || '',
      name: c.name || '',
      description: c.description || '',
      productCount: 10,
      isDemoData: false,
    }));
    return cachedCategories;
  } catch (err) {
    console.error('[CatalogService] Erro ao buscar categorias do Wix:', err);
    return [];
  }
}

export async function fetchCollections(): Promise<Collection[]> {
  if (cachedCollections) return cachedCollections;
  try {
    const res = await myWixClient.collections.queryCollections().find();
    cachedCollections = res.items.map((c: collections.Collection, i: number) => ({
      id: c._id || '',
      slug: c.slug || '',
      name: c.name || '',
      subtitle: 'Coleção Oficial',
      description: c.description || 'Curadoria exclusiva Limiar Stores.',
      image: i % 2 === 0 ? 'https://static.wixstatic.com/media/32314a_2e526d7c1fd342b18376cd518a9b8c9a~mv2.webp' : 'https://static.wixstatic.com/media/32314a_ec0ab79839da4a37b58bf5cd8f6a0087~mv2.webp',
      accentTone: (i % 2 === 0 ? 'uv' : 'acid') as any,
      isDemoData: false,
    }));
    return cachedCollections;
  } catch (err) {
    console.error('[CatalogService] Erro ao buscar coleções do Wix:', err);
    return [];
  }
}
