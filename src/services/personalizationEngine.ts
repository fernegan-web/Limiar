import type { Product } from '../types/commerce';
import type {
  BehaviorEventRecord,
  BehaviorEventType,
  PersonalizationState,
  SearchHistoryEntry,
  ViewedProductSummary,
} from '../types/privacy';
import type { StorageLike } from './consentService';

export const PERSONALIZATION_STORAGE_KEY = 'limiar_personalization_history_v1';
export const PERSONALIZATION_VERSION = 1;
export const DEFAULT_PERSONALIZATION_TTL_MS = 90 * 24 * 60 * 60 * 1000;
export const VIEW_DEDUPE_WINDOW_MS = 30 * 60 * 1000;
export const SEARCH_DEDUPE_WINDOW_MS = 10 * 60 * 1000;
export const MAX_VIEWED_PRODUCTS = 30;
export const MAX_RECENT_EVENTS = 60;
export const MAX_RECENT_SEARCHES = 15;

function getLocalStorageSafe(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function createEmptyPersonalizationState(now = Date.now()): PersonalizationState {
  return {
    version: PERSONALIZATION_VERSION,
    updatedAt: now,
    viewedProducts: {},
    categoryAffinity: {},
    collectionAffinity: {},
    recentSearches: [],
    recentEvents: [],
  };
}

export function pruneExpiredPersonalizationState(
  state: PersonalizationState,
  now = Date.now(),
  ttlMs = DEFAULT_PERSONALIZATION_TTL_MS
): PersonalizationState {
  const cutoff = now - ttlMs;

  const viewedEntries = Object.entries(state.viewedProducts ?? {})
    .filter(([, entry]) => entry && entry.lastViewedAt >= cutoff && entry.productId)
    .sort((a, b) => b[1].lastViewedAt - a[1].lastViewedAt)
    .slice(0, MAX_VIEWED_PRODUCTS);

  const categoryAffinity: PersonalizationState['categoryAffinity'] = {};
  for (const [catId, entry] of Object.entries(state.categoryAffinity ?? {})) {
    if (entry && entry.updatedAt >= cutoff && entry.score > 0) {
      categoryAffinity[catId] = { score: entry.score, updatedAt: entry.updatedAt };
    }
  }

  const collectionAffinity: PersonalizationState['collectionAffinity'] = {};
  for (const [colSlug, entry] of Object.entries(state.collectionAffinity ?? {})) {
    if (entry && entry.updatedAt >= cutoff && entry.score > 0) {
      collectionAffinity[colSlug] = { score: entry.score, updatedAt: entry.updatedAt };
    }
  }

  const recentSearches = (state.recentSearches ?? [])
    .filter((s) => s && s.lastSearchedAt >= cutoff && s.normalizedQuery)
    .sort((a, b) => b.lastSearchedAt - a.lastSearchedAt)
    .slice(0, MAX_RECENT_SEARCHES);

  const recentEvents = (state.recentEvents ?? [])
    .filter((ev) => ev && ev.createdAt >= cutoff && ev.id)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, MAX_RECENT_EVENTS);

  return {
    version: PERSONALIZATION_VERSION,
    updatedAt: Math.max(state.updatedAt || 0, cutoff),
    viewedProducts: Object.fromEntries(viewedEntries),
    categoryAffinity,
    collectionAffinity,
    recentSearches,
    recentEvents,
  };
}

export function loadLocalPersonalizationState(
  storage: StorageLike | null = getLocalStorageSafe(),
  now = Date.now()
): PersonalizationState {
  if (!storage) return createEmptyPersonalizationState(now);
  try {
    const raw = storage.getItem(PERSONALIZATION_STORAGE_KEY);
    if (!raw) return createEmptyPersonalizationState(now);
    const parsed = JSON.parse(raw) as Partial<PersonalizationState> | null;
    if (!parsed || typeof parsed !== 'object' || parsed.version !== PERSONALIZATION_VERSION) {
      return createEmptyPersonalizationState(now);
    }
    return pruneExpiredPersonalizationState(
      {
        version: PERSONALIZATION_VERSION,
        updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : now,
        viewedProducts: parsed.viewedProducts ?? {},
        categoryAffinity: parsed.categoryAffinity ?? {},
        collectionAffinity: parsed.collectionAffinity ?? {},
        recentSearches: Array.isArray(parsed.recentSearches) ? parsed.recentSearches : [],
        recentEvents: Array.isArray(parsed.recentEvents) ? parsed.recentEvents : [],
      },
      now
    );
  } catch {
    return createEmptyPersonalizationState(now);
  }
}

export function saveLocalPersonalizationState(
  state: PersonalizationState,
  storage: StorageLike | null = getLocalStorageSafe(),
  now = Date.now()
): PersonalizationState {
  const pruned = pruneExpiredPersonalizationState(state, now);
  if (storage) {
    try {
      storage.setItem(PERSONALIZATION_STORAGE_KEY, JSON.stringify(pruned));
    } catch {
      // ignore storage errors
    }
  }
  return pruned;
}

export function clearLocalPersonalizationState(
  storage: StorageLike | null = getLocalStorageSafe()
): void {
  if (!storage) return;
  try {
    storage.removeItem(PERSONALIZATION_STORAGE_KEY);
  } catch {
    // ignore storage removal errors
  }
}

function generateEventId(prefix: string, now: number): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${now}-${Math.random().toString(36).slice(2, 10)}`;
}

const EVENT_AFFINITY_WEIGHT: Record<BehaviorEventType, number> = {
  view_product: 1.5,
  search_query: 1.0,
  favorite_add: 3.2,
  favorite_remove: -1.5,
  add_to_cart: 4.0,
  purchase_verified: 5.5,
};

export interface RecordBehaviorInput {
  type: BehaviorEventType;
  product?: Pick<Product, 'id' | 'categoryId' | 'collectionSlugs'>;
  productId?: string;
  categoryId?: string;
  collectionSlugs?: string[];
  searchQuery?: string;
  now?: number;
}

/**
 * Aplica um evento comportamental de forma pura com deduplicação por janela temporal.
 */
export function recordBehaviorInState(
  currentState: PersonalizationState,
  input: RecordBehaviorInput
): { nextState: PersonalizationState; recordedEvent: BehaviorEventRecord | null } {
  const now = input.now ?? Date.now();
  const base = pruneExpiredPersonalizationState(currentState, now);

  const productId = input.product?.id ?? input.productId;
  const categoryId = input.product?.categoryId ?? input.categoryId;
  const collectionSlugs = (input.product?.collectionSlugs ?? input.collectionSlugs ?? []).filter(
    (slug) => slug && slug !== 'all-products'
  );
  const weight = EVENT_AFFINITY_WEIGHT[input.type] ?? 1;

  if (input.type === 'view_product' && productId) {
    const existingView = base.viewedProducts[productId];
    if (existingView && now - existingView.lastViewedAt < VIEW_DEDUPE_WINDOW_MS) {
      return {
        nextState: base,
        recordedEvent: null,
      };
    }

    const nextViewed: ViewedProductSummary = {
      productId,
      viewCount: (existingView?.viewCount ?? 0) + 1,
      lastViewedAt: now,
      categoryId: categoryId || existingView?.categoryId,
      collectionSlugs:
        collectionSlugs.length > 0 ? collectionSlugs : existingView?.collectionSlugs,
    };
    base.viewedProducts = { ...base.viewedProducts, [productId]: nextViewed };
  }

  let cleanQuery: string | undefined;
  if (input.type === 'search_query') {
    cleanQuery = (input.searchQuery ?? '').trim().slice(0, 100);
    const normalizedQuery = cleanQuery.toLowerCase();
    if (normalizedQuery.length < 2) {
      return { nextState: base, recordedEvent: null };
    }
    const existingSearch = base.recentSearches.find(
      (entry) => entry.normalizedQuery === normalizedQuery
    );
    if (existingSearch && now - existingSearch.lastSearchedAt < SEARCH_DEDUPE_WINDOW_MS) {
      return { nextState: base, recordedEvent: null };
    }
    const nextEntry: SearchHistoryEntry = {
      query: cleanQuery,
      normalizedQuery,
      lastSearchedAt: now,
      count: (existingSearch?.count ?? 0) + 1,
    };
    base.recentSearches = [
      nextEntry,
      ...base.recentSearches.filter((entry) => entry.normalizedQuery !== normalizedQuery),
    ].slice(0, MAX_RECENT_SEARCHES);
  }

  if (categoryId && categoryId !== 'all-products') {
    const prev = base.categoryAffinity[categoryId]?.score ?? 0;
    const nextScore = Math.max(0, Number((prev + weight).toFixed(2)));
    if (nextScore > 0) {
      base.categoryAffinity = {
        ...base.categoryAffinity,
        [categoryId]: { score: nextScore, updatedAt: now },
      };
    }
  }

  for (const slug of collectionSlugs) {
    const prev = base.collectionAffinity[slug]?.score ?? 0;
    const nextScore = Math.max(0, Number((prev + weight * 0.85).toFixed(2)));
    if (nextScore > 0) {
      base.collectionAffinity = {
        ...base.collectionAffinity,
        [slug]: { score: nextScore, updatedAt: now },
      };
    }
  }

  const recordedEvent: BehaviorEventRecord = {
    id: generateEventId(input.type, now),
    type: input.type,
    ...(productId ? { productId } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(collectionSlugs.length > 0 ? { collectionSlugs } : {}),
    ...(cleanQuery ? { searchQuery: cleanQuery } : {}),
    createdAt: now,
  };

  base.recentEvents = [recordedEvent, ...base.recentEvents].slice(0, MAX_RECENT_EVENTS);
  base.updatedAt = now;

  return {
    nextState: pruneExpiredPersonalizationState(base, now),
    recordedEvent,
  };
}

/**
 * Mescla histórico anônimo local e histórico persistido na conta sem duplicar eventos.
 */
export function mergeBehavioralHistories(
  localState: PersonalizationState,
  remoteState: PersonalizationState,
  now = Date.now()
): PersonalizationState {
  const a = pruneExpiredPersonalizationState(localState, now);
  const b = pruneExpiredPersonalizationState(remoteState, now);

  const viewedProducts: Record<string, ViewedProductSummary> = { ...b.viewedProducts };
  for (const [prodId, item] of Object.entries(a.viewedProducts)) {
    const existing = viewedProducts[prodId];
    if (!existing) {
      viewedProducts[prodId] = item;
    } else {
      viewedProducts[prodId] = {
        productId: prodId,
        viewCount: Math.max(existing.viewCount, item.viewCount),
        lastViewedAt: Math.max(existing.lastViewedAt, item.lastViewedAt),
        categoryId: item.categoryId || existing.categoryId,
        collectionSlugs:
          item.collectionSlugs && item.collectionSlugs.length > 0
            ? item.collectionSlugs
            : existing.collectionSlugs,
      };
    }
  }

  const categoryAffinity: PersonalizationState['categoryAffinity'] = { ...b.categoryAffinity };
  for (const [catId, item] of Object.entries(a.categoryAffinity)) {
    const existing = categoryAffinity[catId];
    categoryAffinity[catId] = existing
      ? {
          score: Number(Math.max(existing.score, item.score).toFixed(2)),
          updatedAt: Math.max(existing.updatedAt, item.updatedAt),
        }
      : item;
  }

  const collectionAffinity: PersonalizationState['collectionAffinity'] = {
    ...b.collectionAffinity,
  };
  for (const [slug, item] of Object.entries(a.collectionAffinity)) {
    const existing = collectionAffinity[slug];
    collectionAffinity[slug] = existing
      ? {
          score: Number(Math.max(existing.score, item.score).toFixed(2)),
          updatedAt: Math.max(existing.updatedAt, item.updatedAt),
        }
      : item;
  }

  const searchMap = new Map<string, SearchHistoryEntry>();
  for (const entry of [...b.recentSearches, ...a.recentSearches]) {
    const existing = searchMap.get(entry.normalizedQuery);
    if (!existing || entry.lastSearchedAt > existing.lastSearchedAt) {
      searchMap.set(entry.normalizedQuery, {
        ...entry,
        count: Math.max(entry.count, existing?.count ?? 0),
      });
    }
  }

  const eventMap = new Map<string, BehaviorEventRecord>();
  for (const ev of [...b.recentEvents, ...a.recentEvents]) {
    if (!eventMap.has(ev.id)) {
      eventMap.set(ev.id, ev);
    }
  }

  return pruneExpiredPersonalizationState(
    {
      version: PERSONALIZATION_VERSION,
      updatedAt: Math.max(a.updatedAt, b.updatedAt, now),
      viewedProducts,
      categoryAffinity,
      collectionAffinity,
      recentSearches: Array.from(searchMap.values()),
      recentEvents: Array.from(eventMap.values()),
    },
    now
  );
}

export interface ComputeRecommendationsParams {
  products: Product[];
  state: PersonalizationState;
  favoriteIds?: string[];
  excludeIds?: string[];
  personalizationAllowed: boolean;
  limit?: number;
  now?: number;
}

export interface RecommendationsResult {
  items: Product[];
  isPersonalized: boolean;
  recentlyViewed: Product[];
}

function recencyFactor(timestamp: number, now: number): number {
  const ageHours = Math.max(0, (now - timestamp) / (1000 * 60 * 60));
  // Meia-vida aproximada de 7 dias (168h)
  return Math.exp(-ageHours / 168);
}

/**
 * Gera recomendações explicáveis puramente baseadas no comportamento consentido do visitante
 * e em critérios objetivos do catálogo real da Wix (destaque, ofertas e atualizações).
 */
export function computePersonalizedRecommendations({
  products,
  state,
  favoriteIds = [],
  excludeIds = [],
  personalizationAllowed,
  limit = 10,
  now = Date.now(),
}: ComputeRecommendationsParams): RecommendationsResult {
  const excludeSet = new Set(excludeIds);
  const favoriteSet = new Set(favoriteIds);
  const availablePool = products.filter(
    (p) => p.inStock !== false && !excludeSet.has(p.id)
  );

  const viewedEntries = Object.values(state.viewedProducts ?? {})
    .filter((entry) => entry && entry.productId)
    .sort((a, b) => b.lastViewedAt - a.lastViewedAt);

  const productsById = new Map(products.map((p) => [p.id, p]));
  const recentlyViewed = personalizationAllowed
    ? viewedEntries
        .map((entry) => productsById.get(entry.productId))
        .filter((p): p is Product => Boolean(p && !excludeSet.has(p.id)))
    : [];

  const hasSignals =
    personalizationAllowed &&
    (viewedEntries.length > 0 ||
      Object.keys(state.categoryAffinity ?? {}).length > 0 ||
      state.recentSearches.length > 0 ||
      favoriteIds.length > 0);

  if (!hasSignals) {
    // Fallback não-personalizado objetivo: destaques -> ofertas reais -> mais recentes
    const fallbackSorted = [...availablePool].sort((a, b) => {
      const featDiff = Number(b.featured) - Number(a.featured);
      if (featDiff !== 0) return featDiff;
      const discDiff = (b.discountPercentage ?? 0) - (a.discountPercentage ?? 0);
      if (discDiff !== 0) return discDiff;
      const ta = a.lastUpdated ? Date.parse(a.lastUpdated) : 0;
      const tb = b.lastUpdated ? Date.parse(b.lastUpdated) : 0;
      return tb - ta;
    });
    return {
      items: fallbackSorted.slice(0, limit),
      isPersonalized: false,
      recentlyViewed: [],
    };
  }

  // Constrói afinidade implícita extra a partir dos favoritos caso ainda não haja eventos no histórico
  const favCategoryBoost = new Map<string, number>();
  const favCollectionBoost = new Map<string, number>();
  for (const favId of favoriteIds) {
    const favProd = productsById.get(favId);
    if (!favProd) continue;
    if (favProd.categoryId) {
      favCategoryBoost.set(favProd.categoryId, (favCategoryBoost.get(favProd.categoryId) ?? 0) + 2.5);
    }
    for (const slug of favProd.collectionSlugs ?? []) {
      if (slug && slug !== 'all-products') {
        favCollectionBoost.set(slug, (favCollectionBoost.get(slug) ?? 0) + 2.0);
      }
    }
  }

  const scored = availablePool.map((product) => {
    let score = 0;

    // 1. Afinidade direta por visualização recente (favorece retorno, mas com peso equilibrado para permitir descoberta)
    const viewed = state.viewedProducts[product.id];
    if (viewed) {
      score += (3.5 + Math.min(3, viewed.viewCount) * 0.8) * recencyFactor(viewed.lastViewedAt, now);
    }

    // 2. Afinidade por categoria e coleção (itens relacionados)
    const catAff = state.categoryAffinity[product.categoryId];
    if (catAff) {
      score += Math.min(12, catAff.score) * 1.4 * recencyFactor(catAff.updatedAt, now);
    }
    score += favCategoryBoost.get(product.categoryId) ?? 0;

    for (const slug of product.collectionSlugs ?? []) {
      if (!slug || slug === 'all-products') continue;
      const colAff = state.collectionAffinity[slug];
      if (colAff) {
        score += Math.min(10, colAff.score) * 1.15 * recencyFactor(colAff.updatedAt, now);
      }
      score += favCollectionBoost.get(slug) ?? 0;
    }

    // 3. Afinidade por buscas recentes
    const haystack = `${product.name} ${product.categoryName} ${product.collectionName} ${product.shortDescription}`.toLowerCase();
    for (const searchItem of state.recentSearches) {
      if (haystack.includes(searchItem.normalizedQuery)) {
        score += 3.2 * recencyFactor(searchItem.lastSearchedAt, now);
      }
    }

    // 4. Sinal positivo moderado se o item foi favoritado
    if (favoriteSet.has(product.id)) {
      score += 2.2;
    }

    // 5. Descoberta e relevância comercial (ofertas reais / destaque)
    if (product.featured) score += 0.8;
    if (product.discountPercentage && product.discountPercentage > 0) {
      score += Math.min(1.5, product.discountPercentage / 35);
    }

    return { product, score };
  });

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      Number(b.product.featured) - Number(a.product.featured) ||
      (b.product.discountPercentage ?? 0) - (a.product.discountPercentage ?? 0)
  );

  // Intercala descobertas relacionadas com vistas recentes para evitar repetição excessiva
  const result: Product[] = [];
  const relatedNotViewed = scored.filter((s) => !state.viewedProducts[s.product.id]);
  const previouslyViewedScored = scored.filter((s) => Boolean(state.viewedProducts[s.product.id]));

  let relIdx = 0;
  let viewIdx = 0;
  while (result.length < limit && (relIdx < relatedNotViewed.length || viewIdx < previouslyViewedScored.length)) {
    // Prioriza 2 descobertas relacionadas para cada item já visto
    for (let k = 0; k < 2 && relIdx < relatedNotViewed.length && result.length < limit; k += 1) {
      result.push(relatedNotViewed[relIdx++].product);
    }
    if (viewIdx < previouslyViewedScored.length && result.length < limit) {
      result.push(previouslyViewedScored[viewIdx++].product);
    }
  }

  return {
    items: result,
    isPersonalized: true,
    recentlyViewed,
  };
}
