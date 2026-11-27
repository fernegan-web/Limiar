import test from 'node:test';
import assert from 'node:assert/strict';
import type { collections, products } from '@wix/stores';
import {
  buildCatalogCollectionsAndCategories,
  filterAndSortProducts,
  isOptionChoiceCompatibleWithSelection,
  isOptionChoiceGloballyInStock,
  mapWixProductToAppProduct,
  resolveProductVariant,
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
  assert.equal(product.formattedOriginalPrice, 'R$ 200,00');
  assert.equal(product.collectionSlug, 'destaque');
  assert.equal(product.categoryName, 'Destaque');
  assert.equal(product.featured, true);
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
