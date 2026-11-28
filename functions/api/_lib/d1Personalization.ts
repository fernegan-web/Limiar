import type { D1DatabaseLike } from './wixAuth';
import { sanitizeId, sanitizeStringArray } from './wixAuth';

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export interface MemberConsentRow {
  essential: number;
  personalization: number;
  analytics: number;
  marketing: number;
  policy_version: number;
  updated_at: number;
}

export async function readMemberConsent(
  db: D1DatabaseLike,
  memberId: string
): Promise<{
  essential: true;
  personalization: boolean;
  analytics: boolean;
  marketing: boolean;
  policyVersion: number;
  updatedAt: number;
} | null> {
  const row = await db
    .prepare(
      `SELECT essential, personalization, analytics, marketing, policy_version, updated_at
       FROM member_consent_preferences WHERE member_id = ? LIMIT 1`
    )
    .bind(memberId)
    .first<MemberConsentRow>();

  if (!row) return null;
  return {
    essential: true,
    personalization: Boolean(row.personalization),
    analytics: Boolean(row.analytics),
    marketing: Boolean(row.marketing),
    policyVersion: Number(row.policy_version || 1),
    updatedAt: Number(row.updated_at || 0),
  };
}

export async function upsertMemberConsent(
  db: D1DatabaseLike,
  memberId: string,
  prefs: {
    personalization: boolean;
    analytics: boolean;
    marketing: boolean;
    policyVersion?: number;
  },
  now = Date.now()
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO member_consent_preferences
         (member_id, essential, personalization, analytics, marketing, policy_version, updated_at)
       VALUES (?, 1, ?, ?, ?, ?, ?)
       ON CONFLICT(member_id) DO UPDATE SET
         personalization = excluded.personalization,
         analytics = excluded.analytics,
         marketing = excluded.marketing,
         policy_version = excluded.policy_version,
         updated_at = excluded.updated_at`
    )
    .bind(
      memberId,
      prefs.personalization ? 1 : 0,
      prefs.analytics ? 1 : 0,
      prefs.marketing ? 1 : 0,
      prefs.policyVersion ?? 1,
      now
    )
    .run();
}

export async function readMemberPersonalizationSnapshot(
  db: D1DatabaseLike,
  memberId: string,
  now = Date.now()
) {
  const cutoff = now - NINETY_DAYS_MS;

  const [consent, favRows, viewedRows, affinityRows, searchRows, eventRows] = await Promise.all([
    readMemberConsent(db, memberId),
    db
      .prepare(
        `SELECT product_id FROM member_favorites
         WHERE member_id = ? ORDER BY created_at DESC LIMIT 100`
      )
      .bind(memberId)
      .all<{ product_id: string }>(),
    db
      .prepare(
        `SELECT product_id, view_count, last_viewed_at, category_id, collection_slugs_json
         FROM member_viewed_products
         WHERE member_id = ? AND last_viewed_at >= ?
         ORDER BY last_viewed_at DESC LIMIT 30`
      )
      .bind(memberId, cutoff)
      .all<{
        product_id: string;
        view_count: number;
        last_viewed_at: number;
        category_id: string | null;
        collection_slugs_json: string | null;
      }>(),
    db
      .prepare(
        `SELECT scope_type, scope_key, score, updated_at
         FROM member_category_affinity
         WHERE member_id = ? AND updated_at >= ? AND score > 0
         ORDER BY score DESC LIMIT 50`
      )
      .bind(memberId, cutoff)
      .all<{ scope_type: string; scope_key: string; score: number; updated_at: number }>(),
    db
      .prepare(
        `SELECT normalized_query, display_query, search_count, last_searched_at
         FROM member_search_history
         WHERE member_id = ? AND last_searched_at >= ?
         ORDER BY last_searched_at DESC LIMIT 15`
      )
      .bind(memberId, cutoff)
      .all<{
        normalized_query: string;
        display_query: string;
        search_count: number;
        last_searched_at: number;
      }>(),
    db
      .prepare(
        `SELECT event_id, event_type, product_id, category_id, collection_slugs_json, search_query, created_at
         FROM member_behavior_events
         WHERE member_id = ? AND created_at >= ?
         ORDER BY created_at DESC LIMIT 60`
      )
      .bind(memberId, cutoff)
      .all<{
        event_id: string;
        event_type: string;
        product_id: string | null;
        category_id: string | null;
        collection_slugs_json: string | null;
        search_query: string | null;
        created_at: number;
      }>(),
  ]);

  const viewedProducts: Record<string, unknown> = {};
  for (const row of viewedRows.results ?? []) {
    let slugs: string[] = [];
    if (row.collection_slugs_json) {
      try {
        slugs = sanitizeStringArray(JSON.parse(row.collection_slugs_json));
      } catch {
        slugs = [];
      }
    }
    viewedProducts[row.product_id] = {
      productId: row.product_id,
      viewCount: Number(row.view_count || 1),
      lastViewedAt: Number(row.last_viewed_at || now),
      ...(row.category_id ? { categoryId: row.category_id } : {}),
      ...(slugs.length > 0 ? { collectionSlugs: slugs } : {}),
    };
  }

  const categoryAffinity: Record<string, { score: number; updatedAt: number }> = {};
  const collectionAffinity: Record<string, { score: number; updatedAt: number }> = {};
  for (const row of affinityRows.results ?? []) {
    if (row.scope_type === 'category') {
      categoryAffinity[row.scope_key] = {
        score: Number(row.score || 0),
        updatedAt: Number(row.updated_at || now),
      };
    } else if (row.scope_type === 'collection') {
      collectionAffinity[row.scope_key] = {
        score: Number(row.score || 0),
        updatedAt: Number(row.updated_at || now),
      };
    }
  }

  const recentSearches = (searchRows.results ?? []).map((row) => ({
    query: row.display_query,
    normalizedQuery: row.normalized_query,
    count: Number(row.search_count || 1),
    lastSearchedAt: Number(row.last_searched_at || now),
  }));

  const recentEvents = (eventRows.results ?? []).map((row) => {
    let slugs: string[] = [];
    if (row.collection_slugs_json) {
      try {
        slugs = sanitizeStringArray(JSON.parse(row.collection_slugs_json));
      } catch {
        slugs = [];
      }
    }
    return {
      id: row.event_id,
      type: row.event_type,
      ...(row.product_id ? { productId: row.product_id } : {}),
      ...(row.category_id ? { categoryId: row.category_id } : {}),
      ...(slugs.length > 0 ? { collectionSlugs: slugs } : {}),
      ...(row.search_query ? { searchQuery: row.search_query } : {}),
      createdAt: Number(row.created_at || now),
    };
  });

  const favoriteIds = (favRows.results ?? [])
    .map((r) => sanitizeId(r.product_id))
    .filter(Boolean);

  return {
    consent,
    favoriteIds,
    personalizationState: {
      version: 1,
      updatedAt: now,
      viewedProducts,
      categoryAffinity,
      collectionAffinity,
      recentSearches,
      recentEvents,
    },
  };
}

export async function clearMemberBehavioralHistory(
  db: D1DatabaseLike,
  memberId: string
): Promise<void> {
  await db.batch([
    db.prepare(`DELETE FROM member_behavior_events WHERE member_id = ?`).bind(memberId),
    db.prepare(`DELETE FROM member_viewed_products WHERE member_id = ?`).bind(memberId),
    db.prepare(`DELETE FROM member_category_affinity WHERE member_id = ?`).bind(memberId),
    db.prepare(`DELETE FROM member_search_history WHERE member_id = ?`).bind(memberId),
  ]);
}
