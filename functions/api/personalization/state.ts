import { readMemberPersonalizationSnapshot } from '../_lib/d1Personalization';
import {
  jsonResponse,
  type LimiarCloudflareEnv,
  verifyWixMemberRequest,
} from '../_lib/wixAuth';

export const onRequestGet = async (context: {
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
    const snapshot = await readMemberPersonalizationSnapshot(db, auth.memberId);
    return jsonResponse({ ok: true, ...snapshot }, 200);
  } catch {
    return jsonResponse({ ok: false, code: 'D1_QUERY_FAILED' }, 500);
  }
};
