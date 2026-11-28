import { clearMemberBehavioralHistory } from '../_lib/d1Personalization';
import {
  jsonResponse,
  type LimiarCloudflareEnv,
  verifyWixMemberRequest,
} from '../_lib/wixAuth';

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
    await clearMemberBehavioralHistory(db, auth.memberId);
    return jsonResponse({ ok: true }, 200);
  } catch {
    return jsonResponse({ ok: false, code: 'D1_DELETE_FAILED' }, 500);
  }
};
