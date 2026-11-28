import { readMemberConsent } from '../_lib/d1Personalization';
import {
  jsonResponse,
  type LimiarCloudflareEnv,
  sanitizeId,
  sanitizeStringArray,
  verifyWixMemberRequest,
} from '../_lib/wixAuth';

const ALLOWED_TYPES = new Set([
  'view_product',
  'search_query',
  'favorite_add',
  'favorite_remove',
  'add_to_cart',
  'purchase_verified',
]);

const WEIGHTS: Record<string, number> = {
  view_product: 1.5,
  search_query: 1.0,
  favorite_add: 3.2,
  favorite_remove: -1.5,
  add_to_cart: 4.0,
  purchase_verified: 5.5,
};

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
    const consent = await readMemberConsent(db, auth.memberId);
    const body = (await context.request.json()) as {
      consentPersonalization?: unknown;
      event?: {
        id?: unknown;
        type?: unknown;
        productId?: unknown;
        categoryId?: unknown;
        collectionSlugs?: unknown;
        searchQuery?: unknown;
        createdAt?: unknown;
      };
    };

    const allowed = Boolean(consent ? consent.personalization : body?.consentPersonalization);
    if (!allowed) {
      return jsonResponse({ ok: true, skipped: 'PERSONALIZATION_CONSENT_REQUIRED' }, 200);
    }

    const ev = body?.event;
    const eventId = sanitizeId(ev?.id, 128);
    const eventType = typeof ev?.type === 'string' ? ev.type.trim() : '';
    if (!eventId || !ALLOWED_TYPES.has(eventType)) {
      return jsonResponse({ ok: false, code: 'INVALID_EVENT' }, 400);
    }

    const now =
      typeof ev?.createdAt === 'number' && Number.isFinite(ev.createdAt)
        ? Math.min(Date.now(), Math.max(0, Math.floor(ev.createdAt)))
        : Date.now();
    const productId = sanitizeId(ev?.productId, 96);
    const categoryId = sanitizeId(ev?.categoryId, 96);
    const collectionSlugs = sanitizeStringArray(ev?.collectionSlugs, 12, 96).filter(
      (s) => s !== 'all-products'
    );
    const searchQuery =
      typeof ev?.searchQuery === 'string' ? ev.searchQuery.trim().slice(0, 100) : '';

    const statements = [
      db
        .prepare(
          `INSERT OR IGNORE INTO member_behavior_events
             (event_id, member_id, event_type, product_id, category_id, collection_slugs_json, search_query, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          eventId,
          auth.memberId,
          eventType,
          productId || null,
          categoryId || null,
          collectionSlugs.length > 0 ? JSON.stringify(collectionSlugs) : null,
          searchQuery || null,
          now
        ),
    ];

    if (eventType === 'view_product' && productId) {
      statements.push(
        db
          .prepare(
            `INSERT INTO member_viewed_products
               (member_id, product_id, view_count, last_viewed_at, category_id, collection_slugs_json)
             VALUES (?, ?, 1, ?, ?, ?)
             ON CONFLICT(member_id, product_id) DO UPDATE SET
               view_count = CASE
                 WHEN excluded.last_viewed_at - member_viewed_products.last_viewed_at >= 1800000
                 THEN member_viewed_products.view_count + 1
                 ELSE member_viewed_products.view_count
               END,
               last_viewed_at = MAX(member_viewed_products.last_viewed_at, excluded.last_viewed_at),
               category_id = COALESCE(excluded.category_id, member_viewed_products.category_id),
               collection_slugs_json = COALESCE(excluded.collection_slugs_json, member_viewed_products.collection_slugs_json)`
          )
          .bind(
            auth.memberId,
            productId,
            now,
            categoryId || null,
            collectionSlugs.length > 0 ? JSON.stringify(collectionSlugs) : null
          )
      );
    }

    if (eventType === 'search_query' && searchQuery.length >= 2) {
      const norm = searchQuery.toLowerCase();
      statements.push(
        db
          .prepare(
            `INSERT INTO member_search_history
               (member_id, normalized_query, display_query, search_count, last_searched_at)
             VALUES (?, ?, ?, 1, ?)
             ON CONFLICT(member_id, normalized_query) DO UPDATE SET
               display_query = excluded.display_query,
               search_count = member_search_history.search_count + 1,
               last_searched_at = MAX(member_search_history.last_searched_at, excluded.last_searched_at)`
          )
          .bind(auth.memberId, norm, searchQuery, now)
      );
    }

    const weight = WEIGHTS[eventType] ?? 1;
    if (categoryId && categoryId !== 'all-products') {
      statements.push(
        db
          .prepare(
            `INSERT INTO member_category_affinity
               (member_id, scope_type, scope_key, score, updated_at)
             VALUES (?, 'category', ?, MAX(0, ?), ?)
             ON CONFLICT(member_id, scope_type, scope_key) DO UPDATE SET
               score = MAX(0, member_category_affinity.score + ?),
               updated_at = excluded.updated_at`
          )
          .bind(auth.memberId, categoryId, weight, now, weight)
      );
    }

    for (const slug of collectionSlugs) {
      const colWeight = Number((weight * 0.85).toFixed(2));
      statements.push(
        db
          .prepare(
            `INSERT INTO member_category_affinity
               (member_id, scope_type, scope_key, score, updated_at)
             VALUES (?, 'collection', ?, MAX(0, ?), ?)
             ON CONFLICT(member_id, scope_type, scope_key) DO UPDATE SET
               score = MAX(0, member_category_affinity.score + ?),
               updated_at = excluded.updated_at`
          )
          .bind(auth.memberId, slug, colWeight, now, colWeight)
      );
    }

    await db.batch(statements);
    return jsonResponse({ ok: true }, 200);
  } catch {
    return jsonResponse({ ok: false, code: 'D1_WRITE_FAILED' }, 500);
  }
};
