import test from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_PRODUCTS } from '../data/demoCatalog';
import { filterAndSortProducts } from './catalogService';
import {
  addItemToCartList,
  calculateCartTotals,
  removeCartItem,
  updateCartItemQuantity,
} from './cartService';

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
