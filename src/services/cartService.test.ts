import test from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_PRODUCTS } from '../data/demoCatalog';
import type { Product, ProductVariant } from '../types/commerce';
import { filterAndSortProducts } from './catalogService';
import {
  CART_STORAGE_KEY,
  addItemToCartList,
  calculateCartTotals,
  clearStoredCart,
  findMissingGuestItemsForCart,
  formatCartVariantLabel,
  loadStoredCart,
  removeCartItem,
  saveStoredCart,
  updateCartItemQuantity,
  type CartStorageLike,
} from './cartService';

function createMemoryStorage(): CartStorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, val) => {
      map.set(key, val);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

test('catalogService filters by category, size, search and sorts reliably', () => {
  const tees = filterAndSortProducts(DEMO_PRODUCTS, { category: 'cat-camisetas' });
  assert.equal(tees.length, 2);

  const searchVoid = filterAndSortProducts(DEMO_PRODUCTS, { search: 'void' });
  assert.equal(searchVoid.length, 1);
  assert.equal(searchVoid[0].slug, 'void-hoodie');

  const outOfStockGG = filterAndSortProducts(DEMO_PRODUCTS, { size: 'GG' });
  assert.equal(outOfStockGG.some((p) => p.slug === 'void-hoodie'), false);

  const sortedDesc = filterAndSortProducts(DEMO_PRODUCTS, { sort: 'price-desc' });
  assert.equal(sortedDesc[0].slug, 'ritual-cargo');
});

test('cartService adds, merges identical variants, updates quantities and computes subtotal', () => {
  const tribal = DEMO_PRODUCTS[0];
  const hoodie = DEMO_PRODUCTS[1];

  let cart = addItemToCartList([], tribal, tribal.variants[1], 1);
  cart = addItemToCartList(cart, tribal, tribal.variants[1], 2);
  assert.equal(cart.length, 1);
  assert.equal(cart[0].quantity, 3);

  cart = addItemToCartList(cart, hoodie, hoodie.variants[1], 1);
  assert.equal(cart.length, 2);

  const totals = calculateCartTotals(cart);
  assert.equal(totals.totalItems, 4);
  assert.equal(totals.subtotal, 639.6);

  cart = updateCartItemQuantity(cart, cart[0].lineId, 0);
  assert.equal(cart.length, 1);

  cart = removeCartItem(cart, cart[0].lineId);
  assert.equal(cart.length, 0);
  assert.deepEqual(calculateCartTotals(cart), { subtotal: 0, totalItems: 0 });
});

test('cartService uses variant price/image and clamps tracked inventory quantities', () => {
  const product: Product = {
    ...DEMO_PRODUCTS[0],
    id: 'prod-stock-1',
    price: 200,
    formattedPrice: 'R$ 200,00',
    manageVariants: true,
    images: ['https://example.com/main.jpg'],
    variants: [],
  };
  const variant: ProductVariant = {
    id: 'var-stock-1',
    size: 'G',
    colorName: 'Preto',
    colorHex: '#000',
    price: 179.9,
    formattedPrice: 'R$ 179,90',
    imageUrl: 'https://example.com/variant.jpg',
    inStock: true,
    trackQuantity: true,
    stockCount: 2,
    choices: { Tamanho: 'G', Cor: 'Preto' },
  };

  let cart = addItemToCartList([], product, variant, 5);
  assert.equal(cart[0].quantity, 2);
  assert.equal(cart[0].price, 179.9);
  assert.equal(cart[0].image, 'https://example.com/variant.jpg');

  cart = updateCartItemQuantity(cart, cart[0].lineId, 10);
  assert.equal(cart[0].quantity, 2);

  assert.equal(formatCartVariantLabel(cart[0]), 'Tamanho: G · Cor: Preto');
});

test('cartService handles storage persistence, clear on logout, and guest merge without duplication', () => {
  const storage = createMemoryStorage();
  storage.setItem(CART_STORAGE_KEY, '{corrupt-json');
  assert.deepEqual(loadStoredCart(storage), []);

  const p1 = DEMO_PRODUCTS[0];
  const guestCart = addItemToCartList([], p1, p1.variants[0], 1);
  saveStoredCart(guestCart, storage);
  assert.equal(loadStoredCart(storage).length, 1);

  const memberCart = addItemToCartList([], p1, p1.variants[0], 2);
  const missing = findMissingGuestItemsForCart(guestCart, memberCart);
  assert.equal(missing.length, 0);

  const anotherGuest = addItemToCartList(guestCart, p1, p1.variants[1], 1);
  const missingWithNewVariant = findMissingGuestItemsForCart(anotherGuest, memberCart);
  assert.equal(missingWithNewVariant.length, 1);
  assert.equal(missingWithNewVariant[0].variantId, p1.variants[1].id);

  clearStoredCart(storage);
  assert.deepEqual(loadStoredCart(storage), []);
});
