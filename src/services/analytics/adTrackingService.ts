import type { CartItem, Product, ProductVariant } from '../../types/commerce';
import type {
  AdCatalogIdMode,
  AdTrackingEventPayload,
  PendingCheckoutSnapshot,
  StandardAdEventName,
} from '../../types/tracking';
import { getConsentSnapshot, hasCategoryConsent } from '../consentService';
import {
  buildAdContentsFromCartItems,
  resolveAdCatalogContentId,
  resolveConfiguredAdCatalogIdMode,
} from './adCatalogMapper';

const PENDING_CHECKOUT_STORAGE_KEY = 'limiar_pending_checkout_v1';
const TRACKED_PURCHASES_STORAGE_KEY = 'limiar_tracked_purchases_v1';

interface MetaFbqFn {
  (cmd: 'init', pixelId: string): void;
  (
    cmd: 'track',
    eventName: string,
    params?: Record<string, unknown>,
    options?: { eventID?: string }
  ): void;
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[][];
  loaded?: boolean;
  version?: string;
  push?: (...args: unknown[]) => void;
}

interface TikTokTtq {
  load?: (pixelId: string) => void;
  page?: (params?: Record<string, unknown>, opts?: { event_id?: string }) => void;
  track?: (
    eventName: string,
    params?: Record<string, unknown>,
    opts?: { event_id?: string }
  ) => void;
}

declare global {
  interface Window {
    fbq?: MetaFbqFn;
    _fbq?: MetaFbqFn;
    ttq?: TikTokTtq;
  }
}

let metaInitializedId = '';
let tiktokInitializedId = '';
const trackedPurchaseKeysInMemory = new Set<string>();

function readEnv(key: string): string {
  try {
    const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
    return (env?.[key] || '').trim();
  } catch {
    return '';
  }
}

export function getAdTrackingConfig(): {
  metaPixelId: string;
  tiktokPixelId: string;
  catalogIdMode: AdCatalogIdMode;
} {
  return {
    metaPixelId: readEnv('VITE_META_PIXEL_ID'),
    tiktokPixelId: readEnv('VITE_TIKTOK_PIXEL_ID'),
    catalogIdMode: resolveConfiguredAdCatalogIdMode(readEnv('VITE_AD_CATALOG_ID_MODE')),
  };
}

export function createTrackingEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isMarketingTrackingAllowed(): boolean {
  return hasCategoryConsent(getConsentSnapshot(), 'marketing');
}

function injectMetaPixelIfNeeded(pixelId: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (!pixelId || metaInitializedId === pixelId) return;

  if (!window.fbq) {
    const fbqStub: MetaFbqFn = function (this: unknown, ...args: unknown[]) {
      if (fbqStub.callMethod) {
        fbqStub.callMethod.apply(fbqStub, args);
      } else {
        fbqStub.queue?.push(args);
      }
    } as MetaFbqFn;
    fbqStub.push = fbqStub as unknown as (...args: unknown[]) => void;
    fbqStub.loaded = true;
    fbqStub.version = '2.0';
    fbqStub.queue = [];
    window.fbq = fbqStub;
    if (!window._fbq) window._fbq = fbqStub;

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    script.dataset.limiarPixel = 'meta';
    document.head.appendChild(script);
  }

  window.fbq('init', pixelId);
  metaInitializedId = pixelId;
}

function injectTikTokPixelIfNeeded(pixelId: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (!pixelId || tiktokInitializedId === pixelId) return;

  if (!window.ttq) {
    const queue: Array<[string, unknown[]]> = [];
    const stub: TikTokTtq = {
      load: (...args) => queue.push(['load', args]),
      page: (...args) => queue.push(['page', args]),
      track: (...args) => queue.push(['track', args]),
    };
    (stub as unknown as { _q?: unknown[] })._q = queue;
    window.ttq = stub;

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${encodeURIComponent(
      pixelId
    )}&lib=ttq`;
    script.dataset.limiarPixel = 'tiktok';
    document.head.appendChild(script);
  }

  window.ttq?.load?.(pixelId);
  tiktokInitializedId = pixelId;
}

export function ensureConsentGatedPixelsLoaded(): void {
  if (!isMarketingTrackingAllowed()) return;
  const cfg = getAdTrackingConfig();
  if (cfg.metaPixelId) injectMetaPixelIfNeeded(cfg.metaPixelId);
  if (cfg.tiktokPixelId) injectTikTokPixelIfNeeded(cfg.tiktokPixelId);
}

function mapTikTokEventName(name: StandardAdEventName): string {
  switch (name) {
    case 'PageView':
      return 'Pageview';
    case 'Purchase':
      return 'CompletePayment';
    default:
      return name;
  }
}

function dispatchBrowserPixels(payload: AdTrackingEventPayload): void {
  if (typeof window === 'undefined' || !isMarketingTrackingAllowed()) return;
  ensureConsentGatedPixelsLoaded();

  const cfg = getAdTrackingConfig();
  const baseParams: Record<string, unknown> = {};
  if (payload.value !== undefined) baseParams.value = payload.value;
  if (payload.currency) baseParams.currency = payload.currency;
  if (payload.contentType) baseParams.content_type = payload.contentType;
  if (payload.contentIds && payload.contentIds.length > 0) {
    baseParams.content_ids = payload.contentIds;
  }
  if (payload.contents && payload.contents.length > 0) {
    baseParams.contents = payload.contents;
  }
  if (payload.searchString) baseParams.search_string = payload.searchString;
  if (payload.numItems !== undefined) baseParams.num_items = payload.numItems;

  if (cfg.metaPixelId && window.fbq) {
    if (payload.eventName === 'PageView') {
      window.fbq('track', 'PageView', undefined, { eventID: payload.eventId });
    } else {
      window.fbq('track', payload.eventName, baseParams, { eventID: payload.eventId });
    }
  }

  if (cfg.tiktokPixelId && window.ttq) {
    const ttName = mapTikTokEventName(payload.eventName);
    if (payload.eventName === 'PageView') {
      window.ttq.page?.({}, { event_id: payload.eventId });
    } else {
      const ttParams: Record<string, unknown> = {
        ...baseParams,
        ...(payload.contents?.[0] ? { content_id: payload.contents[0].id } : {}),
        ...(payload.searchString ? { query: payload.searchString } : {}),
      };
      window.ttq.track?.(ttName, ttParams, { event_id: payload.eventId });
    }
  }
}

async function sendServerTrackingEvent(payload: AdTrackingEventPayload): Promise<void> {
  if (typeof fetch !== 'function' || typeof window === 'undefined') return;
  if (!isMarketingTrackingAllowed()) return;

  try {
    await fetch('/api/tracking/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        consentMarketing: true,
        event: payload,
      }),
    });
  } catch {
    // Em ambientes sem Cloudflare Functions (ex.: Vite dev puro), falha silenciosa sem afetar o usuário
  }
}

export function emitAdTrackingEvent(
  eventName: StandardAdEventName,
  details: Omit<AdTrackingEventPayload, 'eventId' | 'eventName' | 'eventTime' | 'eventSourceUrl' | 'currency'> = {}
): AdTrackingEventPayload | null {
  if (!isMarketingTrackingAllowed()) {
    return null;
  }

  const eventSourceUrl =
    typeof window !== 'undefined' ? window.location.href : 'https://limiarritual.com/';

  const payload: AdTrackingEventPayload = {
    eventId: createTrackingEventId(),
    eventName,
    eventTime: Math.floor(Date.now() / 1000),
    eventSourceUrl,
    currency: 'BRL',
    ...details,
  };

  dispatchBrowserPixels(payload);
  void sendServerTrackingEvent(payload);
  return payload;
}

export function trackAdPageView(): AdTrackingEventPayload | null {
  return emitAdTrackingEvent('PageView');
}

export function trackAdViewContent(
  product: Product,
  variant?: ProductVariant | null
): AdTrackingEventPayload | null {
  const { catalogIdMode } = getAdTrackingConfig();
  const contentId = resolveAdCatalogContentId(product, variant, catalogIdMode);
  const unitPrice = variant?.price ?? product.price;

  return emitAdTrackingEvent('ViewContent', {
    value: Number(unitPrice.toFixed(2)),
    contentType: 'product',
    contentIds: contentId ? [contentId] : [],
    contents: contentId
      ? [
          {
            id: contentId,
            quantity: 1,
            item_price: Number(unitPrice.toFixed(2)),
            content_name: product.name,
            content_category: product.categoryName,
          },
        ]
      : [],
  });
}

export function trackAdSearch(query: string): AdTrackingEventPayload | null {
  const trimmed = query.trim();
  if (trimmed.length < 2) return null;
  return emitAdTrackingEvent('Search', {
    searchString: trimmed,
  });
}

export function trackAdAddToWishlist(product: Product): AdTrackingEventPayload | null {
  const { catalogIdMode } = getAdTrackingConfig();
  const contentId = resolveAdCatalogContentId(product, null, catalogIdMode);
  return emitAdTrackingEvent('AddToWishlist', {
    value: Number(product.price.toFixed(2)),
    contentType: 'product',
    contentIds: contentId ? [contentId] : [],
    contents: contentId
      ? [
          {
            id: contentId,
            quantity: 1,
            item_price: Number(product.price.toFixed(2)),
            content_name: product.name,
            content_category: product.categoryName,
          },
        ]
      : [],
  });
}

export function trackAdAddToCart(
  product: Product,
  variant: ProductVariant,
  quantity: number
): AdTrackingEventPayload | null {
  const { catalogIdMode } = getAdTrackingConfig();
  const contentId = resolveAdCatalogContentId(product, variant, catalogIdMode);
  const unitPrice = variant.price ?? product.price;
  const qty = Math.max(1, Math.floor(quantity));

  return emitAdTrackingEvent('AddToCart', {
    value: Number((unitPrice * qty).toFixed(2)),
    numItems: qty,
    contentType: 'product',
    contentIds: contentId ? [contentId] : [],
    contents: contentId
      ? [
          {
            id: contentId,
            quantity: qty,
            item_price: Number(unitPrice.toFixed(2)),
            content_name: product.name,
            content_category: product.categoryName,
          },
        ]
      : [],
  });
}

export function savePendingCheckoutSnapshot(items: CartItem[], subtotal: number): PendingCheckoutSnapshot | null {
  if (typeof window === 'undefined' || items.length === 0) return null;
  const numItems = items.reduce((acc, item) => acc + Math.max(1, Math.floor(item.quantity)), 0);
  const snapshot: PendingCheckoutSnapshot = {
    snapshotId: createTrackingEventId(),
    createdAt: Date.now(),
    currency: 'BRL',
    value: Number(subtotal.toFixed(2)),
    numItems,
    items: items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      sku: item.sku,
      name: item.name,
      categoryName: item.categoryName,
      price: item.price,
      quantity: Math.max(1, Math.floor(item.quantity)),
    })),
  };
  try {
    window.sessionStorage.setItem(PENDING_CHECKOUT_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore storage errors
  }
  return snapshot;
}

export function clearPendingCheckoutSnapshot(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function loadPendingCheckoutSnapshot(): PendingCheckoutSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(PENDING_CHECKOUT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingCheckoutSnapshot | null;
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.items)) return null;
    // Expira snapshot após 24h
    if (Date.now() - (parsed.createdAt || 0) > 24 * 60 * 60 * 1000) {
      clearPendingCheckoutSnapshot();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function trackAdInitiateCheckout(
  items: CartItem[],
  subtotal: number
): AdTrackingEventPayload | null {
  savePendingCheckoutSnapshot(items, subtotal);
  const { catalogIdMode } = getAdTrackingConfig();
  const built = buildAdContentsFromCartItems(items, catalogIdMode);

  return emitAdTrackingEvent('InitiateCheckout', {
    value: Number((subtotal || built.totalValue).toFixed(2)),
    numItems: built.numItems,
    contentType: 'product',
    contentIds: built.contentIds,
    contents: built.contents,
  });
}

function hasPurchaseBeenTracked(referenceKey: string): boolean {
  if (trackedPurchaseKeysInMemory.has(referenceKey)) return true;
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.sessionStorage.getItem(TRACKED_PURCHASES_STORAGE_KEY);
    const list = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(list) && list.includes(referenceKey);
  } catch {
    return false;
  }
}

function markPurchaseTracked(referenceKey: string): void {
  trackedPurchaseKeysInMemory.add(referenceKey);
  if (typeof window === 'undefined') return;
  try {
    const raw = window.sessionStorage.getItem(TRACKED_PURCHASES_STORAGE_KEY);
    const list = raw ? (JSON.parse(raw) as string[]) : [];
    const next = Array.isArray(list) ? [...list, referenceKey].slice(-20) : [referenceKey];
    window.sessionStorage.setItem(TRACKED_PURCHASES_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

/**
 * Dispara evento Purchase EXCLUSIVAMENTE quando o retorno do checkout Wix foi
 * verificado (`order-recorded`) e existe snapshot válido de sessão ainda não contabilizado.
 */
export function trackVerifiedAdPurchase(orderReference?: string): {
  tracked: boolean;
  snapshot: PendingCheckoutSnapshot | null;
} {
  const snapshot = loadPendingCheckoutSnapshot();
  if (!snapshot) {
    return { tracked: false, snapshot: null };
  }

  const dedupeKey = orderReference?.trim() || snapshot.snapshotId;
  clearPendingCheckoutSnapshot();

  if (hasPurchaseBeenTracked(dedupeKey)) {
    return { tracked: false, snapshot };
  }

  markPurchaseTracked(dedupeKey);

  if (!isMarketingTrackingAllowed()) {
    return { tracked: false, snapshot };
  }

  const { catalogIdMode } = getAdTrackingConfig();
  const built = buildAdContentsFromCartItems(snapshot.items, catalogIdMode);

  emitAdTrackingEvent('Purchase', {
    value: Number((snapshot.value || built.totalValue).toFixed(2)),
    numItems: snapshot.numItems || built.numItems,
    contentType: 'product',
    contentIds: built.contentIds,
    contents: built.contents,
    orderReference: dedupeKey,
  });

  return { tracked: true, snapshot };
}
