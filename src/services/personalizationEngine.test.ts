import test from 'node:test';
import assert from 'node:assert/strict';
import type { Product } from '../types/commerce';
import {
  computePersonalizedRecommendations,
  createEmptyPersonalizationState,
  DEFAULT_PERSONALIZATION_TTL_MS,
  MAX_RECENT_SEARCHES,
  mergeBehavioralHistories,
  pruneExpiredPersonalizationState,
  recordBehaviorInState,
  SEARCH_DEDUPE_WINDOW_MS,
  VIEW_DEDUPE_WINDOW_MS,
} from './personalizationEngine';

function makeProduct(overrides: Partial<Product> & { id: string; name: string }): Product {
  return {
    slug: overrides.id,
    price: 200,
    currency: 'BRL',
    formattedPrice: 'R$ 200,00',
    categoryId: 'cat-1',
    categoryName: 'Camisetas',
    collectionSlug: 'drops',
    collectionName: 'Drops',
    collectionIds: ['cat-1'],
    collectionSlugs: ['drops'],
    shortDescription: 'Peça editorial',
    description: 'Peça editorial',
    composition: 'Algodão',
    careInstructions: 'Lavar à mão',
    accentTone: 'uv',
    images: ['https://example.com/img.jpg'],
    variants: [
      {
        id: `${overrides.id}-v1`,
        size: 'M',
        colorName: 'Preto',
        colorHex: '#111111',
        price: 200,
        formattedPrice: 'R$ 200,00',
        inStock: true,
      },
    ],
    availableSizes: ['M'],
    availableColors: ['Preto'],
    inStock: true,
    featured: false,
    isDemoData: false,
    ...overrides,
  };
}

test('recordBehaviorInState deduplicates product views within 30 minutes and searches within 10 minutes', () => {
  const t0 = 1_700_000_000_000;
  let state = createEmptyPersonalizationState(t0);

  const prod = makeProduct({
    id: 'p1',
    name: 'Void Hoodie',
    categoryId: 'cat-hoodies',
    collectionSlugs: ['obsidian', 'all-products'],
  });

  // First view records event + affinity
  const first = recordBehaviorInState(state, { type: 'view_product', product: prod, now: t0 });
  assert.ok(first.recordedEvent);
  assert.equal(first.nextState.viewedProducts.p1.viewCount, 1);
  assert.ok(first.nextState.categoryAffinity['cat-hoodies'].score > 0);
  assert.ok(first.nextState.collectionAffinity.obsidian.score > 0);
  assert.equal(first.nextState.collectionAffinity['all-products'], undefined);

  // Second view 5 minutes later updates timestamp only without inflating viewCount
  const second = recordBehaviorInState(first.nextState, {
    type: 'view_product',
    product: prod,
    now: t0 + 5 * 60 * 1000,
  });
  assert.equal(second.recordedEvent, null);
  assert.equal(second.nextState.viewedProducts.p1.viewCount, 1);

  // Third view past 30m increments viewCount
  const third = recordBehaviorInState(second.nextState, {
    type: 'view_product',
    product: prod,
    now: t0 + VIEW_DEDUPE_WINDOW_MS + 1000,
  });
  assert.ok(third.recordedEvent);
  assert.equal(third.nextState.viewedProducts.p1.viewCount, 2);

  // Search dedupe within 10m
  const s1 = recordBehaviorInState(third.nextState, {
    type: 'search_query',
    searchQuery: 'Moletom Void',
    now: t0 + VIEW_DEDUPE_WINDOW_MS + 2000,
  });
  assert.ok(s1.recordedEvent);
  assert.equal(s1.nextState.recentSearches.length, 1);

  const s2 = recordBehaviorInState(s1.nextState, {
    type: 'search_query',
    searchQuery: '  moletom void  ',
    now: t0 + VIEW_DEDUPE_WINDOW_MS + SEARCH_DEDUPE_WINDOW_MS - 1000,
  });
  assert.equal(s2.recordedEvent, null);
  assert.equal(s2.nextState.recentSearches.length, 1);
});

test('pruneExpiredPersonalizationState drops records older than TTL and respects caps', () => {
  const now = 2_000_000_000_000;
  let state = createEmptyPersonalizationState(now);
  state.viewedProducts = {
    oldProd: { productId: 'oldProd', viewCount: 2, lastViewedAt: now - DEFAULT_PERSONALIZATION_TTL_MS - 1000 },
    freshProd: { productId: 'freshProd', viewCount: 1, lastViewedAt: now - 1000 },
  };
  state.recentSearches = Array.from({ length: 20 }, (_, i) => ({
    query: `term ${i}`,
    normalizedQuery: `term ${i}`,
    lastSearchedAt: now - i * 1000,
    count: 1,
  }));

  const pruned = pruneExpiredPersonalizationState(state, now);
  assert.equal(pruned.viewedProducts.oldProd, undefined);
  assert.ok(pruned.viewedProducts.freshProd);
  assert.equal(pruned.recentSearches.length, MAX_RECENT_SEARCHES);
});

test('mergeBehavioralHistories combines local guest state and member state without duplicating views or events', () => {
  const now = 2_000_000_000_000;
  const local = createEmptyPersonalizationState(now);
  local.viewedProducts = {
    p1: { productId: 'p1', viewCount: 3, lastViewedAt: now - 500, categoryId: 'c1' },
    p2: { productId: 'p2', viewCount: 1, lastViewedAt: now - 100, categoryId: 'c2' },
  };
  local.recentEvents = [{ id: 'ev-1', type: 'view_product', productId: 'p1', createdAt: now - 500 }];

  const remote = createEmptyPersonalizationState(now);
  remote.viewedProducts = {
    p1: { productId: 'p1', viewCount: 2, lastViewedAt: now - 200, categoryId: 'c1' },
  };
  remote.recentEvents = [
    { id: 'ev-1', type: 'view_product', productId: 'p1', createdAt: now - 500 },
    { id: 'ev-2', type: 'favorite_add', productId: 'p3', createdAt: now - 100 },
  ];

  const merged = mergeBehavioralHistories(local, remote, now);
  assert.equal(merged.viewedProducts.p1.viewCount, 3);
  assert.equal(merged.viewedProducts.p1.lastViewedAt, now - 200);
  assert.ok(merged.viewedProducts.p2);
  assert.equal(merged.recentEvents.length, 2);
});

test('computePersonalizedRecommendations respects consent and prioritizes matching affinities', () => {
  const now = 2_000_000_000_000;
  const catalog: Product[] = [
    makeProduct({ id: 'hood-1', name: 'Hoodie Alpha', categoryId: 'hoodies', collectionSlugs: ['obsidian'], featured: false }),
    makeProduct({ id: 'hood-2', name: 'Hoodie Beta', categoryId: 'hoodies', collectionSlugs: ['obsidian'], featured: false }),
    makeProduct({ id: 'tee-1', name: 'Tee Featured', categoryId: 'tees', collectionSlugs: ['core'], featured: true }),
    makeProduct({ id: 'bag-1', name: 'Bag Utility', categoryId: 'bags', collectionSlugs: ['utility'], discountPercentage: 25 }),
  ];

  let state = createEmptyPersonalizationState(now);
  state = recordBehaviorInState(state, { type: 'favorite_add', product: catalog[0], now }).nextState;
  state = recordBehaviorInState(state, { type: 'add_to_cart', product: catalog[0], now: now + 10 }).nextState;

  // When personalization is NOT consented, objective fallback applies (featured -> discounts -> recent)
  const unconsented = computePersonalizedRecommendations({
    products: catalog,
    state,
    personalizationAllowed: false,
    now,
  });
  assert.equal(unconsented.isPersonalized, false);
  assert.equal(unconsented.recentlyViewed.length, 0);
  assert.equal(unconsented.items[0].id, 'tee-1');

  // When personalization IS consented, related hoodies rank ahead of unrelated items
  const personalized = computePersonalizedRecommendations({
    products: catalog,
    state,
    personalizationAllowed: true,
    now,
  });
  assert.equal(personalized.isPersonalized, true);
  assert.equal(personalized.items[0].categoryId, 'hoodies');
});
