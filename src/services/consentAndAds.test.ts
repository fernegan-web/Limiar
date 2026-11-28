import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDefaultConsentState,
  hasCategoryConsent,
  loadStoredConsent,
  saveStoredConsent,
  type StorageLike,
} from './consentService';
import {
  clearGuestFavorites,
  loadGuestFavorites,
  mergeFavoriteLists,
  saveGuestFavorites,
  toggleFavoriteInList,
} from './favoritesService';
import {
  buildAdContentsFromCartItems,
  resolveAdCatalogContentId,
  resolveConfiguredAdCatalogIdMode,
} from './analytics/adCatalogMapper';

function makeMemoryStorage(): StorageLike {
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

test('consentService denies non-essential categories by default until explicit interaction', () => {
  const storage = makeMemoryStorage();
  const initial = loadStoredConsent(storage);

  assert.equal(initial.hasInteracted, false);
  assert.equal(hasCategoryConsent(initial, 'essential'), true);
  assert.equal(hasCategoryConsent(initial, 'personalization'), false);
  assert.equal(hasCategoryConsent(initial, 'analytics'), false);
  assert.equal(hasCategoryConsent(initial, 'marketing'), false);

  const saved = saveStoredConsent(
    {
      ...createDefaultConsentState(),
      hasInteracted: true,
      preferences: {
        essential: true,
        personalization: true,
        analytics: true,
        marketing: false,
      },
    },
    storage
  );
  assert.equal(hasCategoryConsent(saved, 'personalization'), true);
  assert.equal(hasCategoryConsent(saved, 'analytics'), true);
  assert.equal(hasCategoryConsent(saved, 'marketing'), false);

  const reloaded = loadStoredConsent(storage);
  assert.equal(reloaded.hasInteracted, true);
  assert.equal(hasCategoryConsent(reloaded, 'personalization'), true);
});

test('favoritesService toggles, persists, clears, and merges guest and member lists cleanly', () => {
  const storage = makeMemoryStorage();
  const first = toggleFavoriteInList([], 'prod-1');
  assert.equal(first.added, true);
  assert.deepEqual(first.next, ['prod-1']);

  const second = toggleFavoriteInList(first.next, 'prod-2');
  assert.deepEqual(second.next, ['prod-2', 'prod-1']);

  saveGuestFavorites(second.next, storage);
  assert.deepEqual(loadGuestFavorites(storage), ['prod-2', 'prod-1']);

  const merged = mergeFavoriteLists(['prod-2', 'prod-1'], ['prod-1', 'prod-3']);
  assert.deepEqual(merged, ['prod-1', 'prod-3', 'prod-2']);

  clearGuestFavorites(storage);
  assert.deepEqual(loadGuestFavorites(storage), []);
});

test('adCatalogMapper maps Wix IDs, variant IDs, SKUs, and cart contents consistently', () => {
  assert.equal(resolveConfiguredAdCatalogIdMode('sku'), 'sku');
  assert.equal(resolveConfiguredAdCatalogIdMode('wix-variant-id'), 'wix-variant-id');
  assert.equal(resolveConfiguredAdCatalogIdMode('unknown'), 'wix-product-id');

  const product = { id: 'wix-p-1', sku: 'SKU-P-1', numericId: '101' };
  const variant = { id: 'wix-v-9', sku: 'SKU-V-9' };

  assert.equal(resolveAdCatalogContentId(product, variant, 'wix-product-id'), 'wix-p-1');
  assert.equal(resolveAdCatalogContentId(product, variant, 'wix-variant-id'), 'wix-v-9');
  assert.equal(resolveAdCatalogContentId(product, variant, 'sku'), 'SKU-V-9');

  const mapped = buildAdContentsFromCartItems(
    [
      {
        productId: 'wix-p-1',
        variantId: 'wix-v-9',
        sku: 'SKU-V-9',
        name: 'Void Jacket',
        categoryName: 'Outerwear',
        price: 399.9,
        quantity: 2,
      },
    ],
    'sku'
  );
  assert.deepEqual(mapped.contentIds, ['SKU-V-9']);
  assert.equal(mapped.totalValue, 799.8);
  assert.equal(mapped.numItems, 2);
  assert.equal(mapped.contents[0].content_name, 'Void Jacket');
});
