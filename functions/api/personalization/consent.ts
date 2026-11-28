import { upsertMemberConsent } from '../_lib/d1Personalization';
import {
  jsonResponse,
  type LimiarCloudflareEnv,
  verifyWixMemberRequest,
} from '../_lib/wixAuth';

export const onRequestPut = async (context: {
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
      personalization?: unknown;
      analytics?: unknown;
      marketing?: unknown;
      policyVersion?: unknown;
    };

    await upsertMemberConsent(db, auth.memberId, {
      personalization: Boolean(body?.personalization),
      analytics: Boolean(body?.analytics),
      marketing: Boolean(body?.marketing),
      policyVersion:
        typeof body?.policyVersion === 'number' && Number.isFinite(body.policyVersion)
          ? Math.max(1, Math.floor(body.policyVersion))
          : 1,
    });

    return jsonResponse({ ok: true }, 200);
  } catch {
    return jsonResponse({ ok: false, code: 'D1_WRITE_FAILED' }, 500);
  }
};
