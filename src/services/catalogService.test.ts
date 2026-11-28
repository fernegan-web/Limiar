import test from 'node:test';
import assert from 'node:assert/strict';
import type { collections, products } from '@wix/stores';
import {
  buildCatalogCollectionsAndCategories,
  extractCatalogFacetMetadata,
  filterAndSortProducts,
  isOptionChoiceCompatibleWithSelection,
  isOptionChoiceGloballyInStock,
  mapWixProductToAppProduct,
  resolveProductVariant,
  searchCatalogSuggestions,
  selectProductOptionWithReconciliation,
  stripHtmlToPlainText,
} from './catalogService';

test('stripHtmlToPlainText strips HTML tags cleanly without truncating mid-tag', () => {
  const html = '<p>Camiseta <strong>Heavyweight</strong> &amp; acabamentos.<br/>Edição limitada.</p>';
  assert.equal(
    stripHtmlToPlainText(html, 120),
    'Camiseta Heavyweight & acabamentos. Edição limitada.'
  );
});

test('mapWixProductToAppProduct maps promo prices, multi-options, variants, stock, and primary collection', () => {
  const colIndex = new Map<string, collections.Collection>([
    ['all-id', { _id: 'all-id', slug: 'all-products', name: 'All Products', numberOfProducts: 20 }],
    ['dest-id', { _id: 'dest-id', slug: 'destaque', name: 'Destaque', numberOfProducts: 1 }],
  ]);

  const wixProduct = {
    _id: 'prod-1',
    slug: 'void-tee',
    name: 'Void Tee',
    description: '<p>Algodão <strong>280gsm</strong>.</p>',
    manageVariants: true,
    collectionIds: ['all-id', 'dest-id'],
    priceData: {
      currency: 'BRL',
      price: 200,
      discountedPrice: 159.9,
      formatted: { price: 'R$ 200,00', discountedPrice: 'R$ 159,90' },
    },
    media: {
      mainMedia: { image: { url: 'https://static.wixstatic.com/media/main.jpg' } },
      items: [],
    },
    productOptions: [
      {
        name: 'Cor',
        optionType: 'color',
        choices: [
          {
            value: 'Preto',
            description: 'Preto',
            inStock: true,
            visible: true,
            media: { mainMedia: { image: { url: 'https://static.wixstatic.com/media/preto.jpg' } } },
          },
          {
            value: 'Chumbo',
            description: 'Chumbo',
            inStock: true,
            visible: true,
          },
        ],
      },
      {
        name: 'Tamanho',
        optionType: 'drop_down',
        choices: [
          { value: 'P', description: 'P', inStock: true, visible: true },
          { value: 'M', description: 'M', inStock: false, visible: true },
        ],
      },
    ],
    variants: [
      {
        _id: 'var-preto-p',
        choices: { Cor: 'Preto', Tamanho: 'P' },
        variant: {
          priceData: {
            currency: 'BRL',
            price: 200,
            discountedPrice: 159.9,
            formatted: { price: 'R$ 200,00', discountedPrice: 'R$ 159,90' },
          },
          visible: true,
          sku: 'VT-P-P',
        },
        stock: { trackQuantity: true, quantity: 3, inStock: true },
      },
      {
        _id: 'var-chumbo-m',
        choices: { Cor: 'Chumbo', Tamanho: 'M' },
        variant: { visible: true, sku: 'VT-C-M' },
        stock: { trackQuantity: true, quantity: 0, inStock: false },
      },
    ],
  } as unknown as products.Product;

  const product = mapWixProductToAppProduct(wixProduct, colIndex);
  assert.equal(product.price, 159.9);
  assert.equal(product.originalPrice, 200);
  assert.equal(product.discountAmount, 40.1);
  assert.equal(product.discountPercentage, 20);
  assert.equal(product.formattedOriginalPrice, 'R$ 200,00');
  assert.equal(product.collectionSlug, 'destaque');
  assert.equal(product.categoryName, 'Destaque');
  assert.equal(product.featured, true);
  assert.equal(product.freeShippingEligible, false);
  assert.equal(product.options?.length, 2);

  const exact = resolveProductVariant(product, { Cor: 'Preto', Tamanho: 'P' });
  assert.equal(exact?.id, 'var-preto-p');
  assert.equal(exact?.imageUrl, 'https://static.wixstatic.com/media/preto.jpg');
  assert.equal(isOptionChoiceGloballyInStock(product, 'Tamanho', 'P'), true);
  assert.equal(isOptionChoiceGloballyInStock(product, 'Tamanho', 'M'), false);
  assert.equal(
    isOptionChoiceCompatibleWithSelection(product, 'Cor', 'Chumbo', { Tamanho: 'P' }),
    false
  );

  // Selecting an incompatible choice switches secondary option smoothly or resolves cleanly
  const reconciled = selectProductOptionWithReconciliation(
    product,
    { Cor: 'Chumbo', Tamanho: 'M' },
    'Cor',
    'Preto'
  );
  assert.deepEqual(reconciled, { Cor: 'Preto', Tamanho: 'P' });

  // Filter matching by slug and collectionIds
  const filtered = filterAndSortProducts([product], { collection: 'all-products' });
  assert.equal(filtered.length, 1);

  const built = buildCatalogCollectionsAndCategories(
    Array.from(colIndex.values()),
    [product]
  );
  assert.equal(built.collections.length, 1);
  assert.equal(built.collections[0].slug, 'destaque');
  assert.equal(built.collections[0].image, 'https://static.wixstatic.com/media/main.jpg');
  assert.equal(built.categories[0].productCount, 1);
});

test('extractCatalogFacetMetadata, strict freeShippingEligible, suggestions, and extended filters work accurately', () => {
  const colIndex = new Map<string, collections.Collection>([
    ['frete-id', { _id: 'frete-id', slug: 'frete-gratis', name: 'Frete Grátis' }],
    ['drops-id', { _id: 'drops-id', slug: 'drops', name: 'Drops' }],
  ]);

  const boot = mapWixProductToAppProduct(
    {
      _id: 'boot-1',
      slug: 'obsidian-boot',
      name: 'Obsidian Boot',
      ribbon: 'Frete grátis',
      collectionIds: ['drops-id'],
      lastUpdated: '2026-10-01T10:00:00.000Z',
      priceData: { currency: 'BRL', price: 600, discountedPrice: 450 },
      productOptions: [
        {
          name: 'Tamanho',
          optionType: 'drop_down',
          choices: [
            { value: '38', description: '38', visible: true, inStock: true },
            { value: '42', description: '42', visible: true, inStock: true },
          ],
        },
      ],
      variants: [
        {
          _id: 'v-38',
          choices: { Tamanho: '38' },
          variant: { visible: true, priceData: { currency: 'BRL', price: 600, discountedPrice: 450 } },
          stock: { inStock: true },
        },
        {
          _id: 'v-42',
          choices: { Tamanho: '42' },
          variant: { visible: true, priceData: { currency: 'BRL', price: 640, discountedPrice: 490 } },
          stock: { inStock: true },
        },
      ],
    } as unknown as products.Product,
    colIndex
  );

  const belt = mapWixProductToAppProduct(
    {
      _id: 'belt-1',
      slug: 'sigil-belt',
      name: 'Sigil Belt',
      collectionIds: ['frete-id'],
      lastUpdated: '2026-11-15T10:00:00.000Z',
      priceData: { currency: 'BRL', price: 180, discountedPrice: 180 },
      productOptions: [
        {
          name: 'Tamanho',
          optionType: 'drop_down',
          choices: [{ value: '120 cm', description: '120 cm', visible: true, inStock: true }],
        },
      ],
      variants: [
        {
          _id: 'v-120',
          choices: { Tamanho: '120 cm' },
          variant: { visible: true, priceData: { currency: 'BRL', price: 180 } },
          stock: { inStock: true },
        },
      ],
    } as unknown as products.Product,
    colIndex
  );

  const regularTee = mapWixProductToAppProduct(
    {
      _id: 'tee-1',
      slug: 'nocturne-tee',
      name: 'Nocturne Tee',
      collectionIds: ['drops-id'],
      lastUpdated: '2026-09-01T10:00:00.000Z',
      priceData: { currency: 'BRL', price: 200, discountedPrice: 200 },
      productOptions: [
        {
          name: 'Tamanho',
          optionType: 'drop_down',
          choices: [{ value: 'P', description: 'P', visible: true, inStock: true }],
        },
      ],
      variants: [
        {
          _id: 'v-p',
          choices: { Tamanho: 'P' },
          variant: { visible: true, priceData: { currency: 'BRL', price: 200 } },
          stock: { inStock: true },
        },
      ],
    } as unknown as products.Product,
    colIndex
  );

  assert.equal(boot.freeShippingEligible, true);
  assert.equal(boot.hasVariablePrice, true);
  assert.equal(boot.minPrice, 450);
  assert.equal(boot.maxPrice, 490);
  assert.equal(belt.freeShippingEligible, true);
  assert.equal(regularTee.freeShippingEligible, false);

  const facets = extractCatalogFacetMetadata([boot, belt, regularTee]);
  assert.deepEqual(facets.availableSizes, ['P', '38', '42', '120 cm']);
  assert.equal(facets.minPriceBound, 180);
  assert.equal(facets.maxPriceBound, 490);
  assert.equal(facets.offersCount, 1);
  assert.equal(facets.freeShippingCount, 2);

  assert.deepEqual(
    filterAndSortProducts([boot, belt, regularTee], { onlyOffers: true }).map((p) => p.id),
    ['boot-1']
  );
  assert.deepEqual(
    filterAndSortProducts([boot, belt, regularTee], { freeShippingOnly: true, sort: 'newest' }).map(
      (p) => p.id
    ),
    ['belt-1', 'boot-1']
  );
  assert.deepEqual(
    filterAndSortProducts([boot, belt, regularTee], { minPrice: 190, maxPrice: 300 }).map((p) => p.id),
    ['tee-1']
  );
  assert.deepEqual(
    filterAndSortProducts([boot, belt, regularTee], { size: '120 cm' }).map((p) => p.id),
    ['belt-1']
  );

  const suggestions = searchCatalogSuggestions([boot, belt, regularTee], 'obsidian', 4);
  assert.deepEqual(suggestions.map((s) => s.id), ['boot-1']);
});
