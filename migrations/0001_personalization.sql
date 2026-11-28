-- Limiar — Cloudflare D1 Schema para Personalização Comportamental, Favoritos e Consentimento LGPD
-- IMPORTANTE: O catálogo comercial (produtos, variações, preços, estoque, pedidos) permanece 100% no Wix Headless.

CREATE TABLE IF NOT EXISTS member_consent_preferences (
  member_id TEXT PRIMARY KEY,
  essential INTEGER NOT NULL DEFAULT 1,
  personalization INTEGER NOT NULL DEFAULT 0,
  analytics INTEGER NOT NULL DEFAULT 0,
  marketing INTEGER NOT NULL DEFAULT 0,
  policy_version INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS member_favorites (
  member_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (member_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_member_favorites_member_created
  ON member_favorites (member_id, created_at DESC);

CREATE TABLE IF NOT EXISTS member_viewed_products (
  member_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  view_count INTEGER NOT NULL DEFAULT 1,
  last_viewed_at INTEGER NOT NULL,
  category_id TEXT,
  collection_slugs_json TEXT,
  PRIMARY KEY (member_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_member_viewed_recent
  ON member_viewed_products (member_id, last_viewed_at DESC);

CREATE TABLE IF NOT EXISTS member_category_affinity (
  member_id TEXT NOT NULL,
  scope_type TEXT NOT NULL, -- 'category' | 'collection'
  scope_key TEXT NOT NULL,
  score REAL NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (member_id, scope_type, scope_key)
);

CREATE TABLE IF NOT EXISTS member_search_history (
  member_id TEXT NOT NULL,
  normalized_query TEXT NOT NULL,
  display_query TEXT NOT NULL,
  search_count INTEGER NOT NULL DEFAULT 1,
  last_searched_at INTEGER NOT NULL,
  PRIMARY KEY (member_id, normalized_query)
);

CREATE TABLE IF NOT EXISTS member_behavior_events (
  event_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  product_id TEXT,
  category_id TEXT,
  collection_slugs_json TEXT,
  search_query TEXT,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (member_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_member_events_recent
  ON member_behavior_events (member_id, created_at DESC);
