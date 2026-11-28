import {
  readMemberPersonalizationSnapshot,
  upsertMemberConsent,
} from '../_lib/d1Personalization';
import {
  jsonResponse,
  type LimiarCloudflareEnv,
  sanitizeId,
  sanitizeStringArray,
  verifyWixMemberRequest,
} from '../_lib/wixAuth';

export const onRequestPost = async (context: {
  request: Request;
  env: LimiarCloudflareEnv;
}): Promise<Response> => {
  const auth = await verifyWixMemberRequest(context.request);
  if (!auth.ok) {
    return jsonResponse({ ok: false, code: auth.code }, auth.status);
  }

  const db = context.env?.DB;
  if (!db) {
    return jsonResponse({ ok: false, code: 'D1_UNCONFIGURED' }, 503);
  }

  try {
    const body = (await context.request.json()) as {
      consent?: {
        personalization?: boolean;
        analytics?: boolean;
        marketing?: boolean;
        policyVersion?: number;
      };
      guestFavoriteIds?: unknown;
      guestPersonalizationState?: {
        viewedProducts?: Record<
          string,
          {
            productId?: string;
            viewCount?: number;
            lastViewedAt?: number;
            categoryId?: string;
            collectionSlugs?: string[];
          }
        >;
        categoryAffinity?: Record<string, { score?: number; updatedAt?: number }>;
        collectionAffinity?: Record<string, { score?: number; updatedAt?: number }>;
        recentSearches?: Array<{
          query?: string;
          normalizedQuery?: string;
          count?: number;
          lastSearchedAt?: number;
        }>;
      };
    };

    const now = Date.now();
    const statements = [];

    if (body?.consent && typeof body.consent === 'object') {
      await upsertMemberConsent(
        db,
        auth.memberId,
        {
          personalization: Boolean(body.consent.personalization),
          analytics: Boolean(body.consent.analytics),
          marketing: Boolean(body.consent.marketing),
          policyVersion: Number(body.consent.policyVersion || 1),
        },
        now
      );
    }

    // Mescla favoritos do visitante na conta autenticada sem duplicar
    const favIds = sanitizeStringArray(body?.guestFavoriteIds, 100, 96);
    for (const prodId of favIds) {
      statements.push(
        db
          .prepare(
            `INSERT OR IGNORE INTO member_favorites (member_id, product_id, created_at)
             VALUES (?, ?, ?)`
          )
          .bind(auth.memberId, prodId, now)
      );
    }

    // Só mescla histórico comportamental se o consentimento de personalização estiver ativo
    const guestState = body?.guestPersonalizationState;
    if (body?.consent?.personalization && guestState && typeof guestState === 'object') {
      for (const entry of Object.values(guestState.viewedProducts ?? {}).slice(0, 30)) {
        const productId = sanitizeId(entry?.productId, 96);
        if (!productId) continue;
        const slugs = sanitizeStringArray(entry?.collectionSlugs, 12, 96);
        const categoryId = sanitizeId(entry?.categoryId, 96);
        const count = Math.max(1, Math.min(50, Number(entry?.viewCount || 1)));
        const lastViewedAt = Math.min(now, Math.max(0, Number(entry?.lastViewedAt || now)));

        statements.push(
          db
            .prepare(
              `INSERT INTO member_viewed_products
                 (member_id, product_id, view_count, last_viewed_at, category_id, collection_slugs_json)
               VALUES (?, ?, ?, ?, ?, ?)
               ON CONFLICT(member_id, product_id) DO UPDATE SET
                 view_count = MAX(member_viewed_products.view_count, excluded.view_count),
                 last_viewed_at = MAX(member_viewed_products.last_viewed_at, excluded.last_viewed_at),
                 category_id = COALESCE(excluded.category_id, member_viewed_products.category_id),
                 collection_slugs_json = COALESCE(excluded.collection_slugs_json, member_viewed_products.collection_slugs_json)`
            )
            .bind(
              auth.memberId,
              productId,
              count,
              lastViewedAt,
              categoryId || null,
              slugs.length > 0 ? JSON.stringify(slugs) : null
            )
        );
      }

      for (const [rawCat, entry] of Object.entries(guestState.categoryAffinity ?? {}).slice(0, 25)) {
        const catKey = sanitizeId(rawCat, 96);
        if (!catKey || !entry || Number(entry.score) <= 0) continue;
        statements.push(
          db
            .prepare(
              `INSERT INTO member_category_affinity
                 (member_id, scope_type, scope_key, score, updated_at)
               VALUES (?, 'category', ?, ?, ?)
               ON CONFLICT(member_id, scope_type, scope_key) DO UPDATE SET
                 score = MAX(member_category_affinity.score, excluded.score),
                 updated_at = MAX(member_category_affinity.updated_at, excluded.updated_at)`
            )
            .bind(
              auth.memberId,
              catKey,
              Number(entry.score || 0),
              Math.min(now, Number(entry.updatedAt || now))
            )
        );
      }

      for (const [rawSlug, entry] of Object.entries(guestState.collectionAffinity ?? {}).slice(0, 25)) {
        const slugKey = sanitizeId(rawSlug, 96);
        if (!slugKey || !entry || Number(entry.score) <= 0) continue;
        statements.push(
          db
            .prepare(
              `INSERT INTO member_category_affinity
                 (member_id, scope_type, scope_key, score, updated_at)
               VALUES (?, 'collection', ?, ?, ?)
               ON CONFLICT(member_id, scope_type, scope_key) DO UPDATE SET
                 score = MAX(member_category_affinity.score, excluded.score),
                 updated_at = MAX(member_category_affinity.updated_at, excluded.updated_at)`
            )
            .bind(
              auth.memberId,
              slugKey,
              Number(entry.score || 0),
              Math.min(now, Number(entry.updatedAt || now))
            )
        );
      }

      for (const item of (guestState.recentSearches ?? []).slice(0, 15)) {
        const q = typeof item?.query === 'string' ? item.query.trim().slice(0, 100) : '';
        const norm = q.toLowerCase();
        if (norm.length < 2) continue;
        statements.push(
          db
            .prepare(
              `INSERT INTO member_search_history
                 (member_id, normalized_query, display_query, search_count, last_searched_at)
               VALUES (?, ?, ?, ?, ?)
               ON CONFLICT(member_id, normalized_query) DO UPDATE SET
                 search_count = MAX(member_search_history.search_count, excluded.search_count),
                 last_searched_at = MAX(member_search_history.last_searched_at, excluded.last_searched_at)`
            )
            .bind(
              auth.memberId,
              norm,
              q,
              Math.max(1, Number(item?.count || 1)),
              Math.min(now, Number(item?.lastSearchedAt || now))
            )
        );
      }
    }

    if (statements.length > 0) {
      await db.batch(statements);
    }

    const mergedSnapshot = await readMemberPersonalizationSnapshot(db, auth.memberId, now);
    return jsonResponse({ ok: true, ...mergedSnapshot }, 200);
  } catch {
    return jsonResponse({ ok: false, code: 'D1_MERGE_FAILED' }, 500);
  }
};
