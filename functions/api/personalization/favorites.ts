import {
  jsonResponse,
  type LimiarCloudflareEnv,
  sanitizeId,
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
    const body = (await context.request.json()) as { productId?: unknown };
    const productId = sanitizeId(body?.productId, 96);
    if (!productId) {
      return jsonResponse({ ok: false, code: 'INVALID_PRODUCT_ID' }, 400);
    }

    await db
      .prepare(
        `INSERT OR IGNORE INTO member_favorites (member_id, product_id, created_at)
         VALUES (?, ?, ?)`
      )
      .bind(auth.memberId, productId, Date.now())
      .run();

    return jsonResponse({ ok: true, productId }, 200);
  } catch {
    return jsonResponse({ ok: false, code: 'D1_WRITE_FAILED' }, 500);
  }
};

export const onRequestDelete = async (context: {
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
    const url = new URL(context.request.url);
    let productId = sanitizeId(url.searchParams.get('productId'), 96);
    if (!productId) {
      const body = (await context.request.json().catch(() => ({}))) as { productId?: unknown };
      productId = sanitizeId(body?.productId, 96);
    }

    if (!productId) {
      return jsonResponse({ ok: false, code: 'INVALID_PRODUCT_ID' }, 400);
    }

    await db
      .prepare(`DELETE FROM member_favorites WHERE member_id = ? AND product_id = ?`)
      .bind(auth.memberId, productId)
      .run();

    return jsonResponse({ ok: true, productId }, 200);
  } catch {
    return jsonResponse({ ok: false, code: 'D1_DELETE_FAILED' }, 500);
  }
};
