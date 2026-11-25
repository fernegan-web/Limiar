import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractWixProductImageUrl,
  extractWixProductPrice,
  formatWixProductSummary,
  queryWixProducts,
} from './wixProductsService';
import { getWixClientId, myWixClient } from './wixClient';

test('WIX_CLIENT_ID matches official Limiar client id', () => {
  const clientId = getWixClientId();
  assert.equal(clientId, 'e0c0f89b-7467-4c6e-aa21-b9a76203c387');
});

test('extractWixProductPrice extracts formatted price or computes BRL', () => {
  const productWithFormatted = {
    priceData: { formatted: { price: 'R$125,90', discountedPrice: 'R$89,90' } },
  };
  assert.equal(extractWixProductPrice(productWithFormatted as any), 'R$89,90');

  const productRawPrice = {
    price: { price: 199.9 },
  };
  assert.equal(extractWixProductPrice(productRawPrice as any), 'R$ 199,90');
});

test('extractWixProductImageUrl extracts main image url correctly', () => {
  const product = {
    mainMedia: {
      image: { url: 'https://static.wixstatic.com/media/test.jpg' },
    },
  };
  assert.equal(
    extractWixProductImageUrl(product as any),
    'https://static.wixstatic.com/media/test.jpg'
  );
});

test('formatWixProductSummary formats product correctly', () => {
  const product = {
    _id: 'prod-123',
    name: 'Gorro Limiar',
    slug: 'gorro-limiar',
    priceData: { formatted: { price: 'R$89,90' } },
    mainMedia: { image: { url: 'https://static.wixstatic.com/media/gorro.jpg' } },
    stock: { inStock: true },
  };
  const summary = formatWixProductSummary(product as any);
  assert.equal(summary.id, 'prod-123');
  assert.equal(summary.name, 'Gorro Limiar');
  assert.equal(summary.price, 'R$89,90');
  assert.equal(summary.imageUrl, 'https://static.wixstatic.com/media/gorro.jpg');
  assert.equal(summary.inStock, true);
});

test('queryWixProducts connects to real Wix backend with pagination', async () => {
  const page1 = await queryWixProducts({ limit: 3, skip: 0 });
  assert.ok(page1.items.length > 0);
  assert.equal(page1.items.length, 3);
  assert.ok((page1.totalCount ?? 0) >= 20);
  assert.equal(page1.hasNext(), true);
  assert.equal(page1.hasPrev(), false);

  const page2 = await queryWixProducts({ limit: 3, skip: 3 });
  assert.equal(page2.items.length, 3);
  assert.notEqual(page1.items[0]._id, page2.items[0]._id);
});
