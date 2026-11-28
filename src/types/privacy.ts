export type ConsentCategory = 'essential' | 'personalization' | 'analytics' | 'marketing';

export interface ConsentPreferences {
  essential: true;
  personalization: boolean;
  analytics: boolean;
  marketing: boolean;
}

export interface StoredConsentState {
  version: number;
  hasInteracted: boolean;
  updatedAt: string;
  preferences: ConsentPreferences;
}

export type BehaviorEventType =
  | 'view_product'
  | 'search_query'
  | 'favorite_add'
  | 'favorite_remove'
  | 'add_to_cart'
  | 'purchase_verified';

export interface BehaviorEventRecord {
  id: string;
  type: BehaviorEventType;
  productId?: string;
  categoryId?: string;
  collectionSlugs?: string[];
  searchQuery?: string;
  createdAt: number;
}

export interface ViewedProductSummary {
  productId: string;
  viewCount: number;
  lastViewedAt: number;
  categoryId?: string;
  collectionSlugs?: string[];
}

export interface SearchHistoryEntry {
  query: string;
  normalizedQuery: string;
  lastSearchedAt: number;
  count: number;
}

export interface PersonalizationState {
  version: number;
  updatedAt: number;
  viewedProducts: Record<string, ViewedProductSummary>;
  categoryAffinity: Record<string, { score: number; updatedAt: number }>;
  collectionAffinity: Record<string, { score: number; updatedAt: number }>;
  recentSearches: SearchHistoryEntry[];
  recentEvents: BehaviorEventRecord[];
}
