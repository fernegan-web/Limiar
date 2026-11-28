export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  first<T = Record<string, unknown>>(column?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>;
  run(): Promise<{ success: boolean }>;
}

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike;
  batch(statements: D1PreparedStatementLike[]): Promise<unknown[]>;
}

export interface LimiarCloudflareEnv {
  DB?: D1DatabaseLike;
  META_PIXEL_ID?: string;
  META_CAPI_ACCESS_TOKEN?: string;
  META_TEST_EVENT_CODE?: string;
  TIKTOK_PIXEL_CODE?: string;
  TIKTOK_ACCESS_TOKEN?: string;
  TIKTOK_TEST_EVENT_CODE?: string;
}

export interface VerifiedWixMemberSession {
  memberId: string;
}

export function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
  if (!authHeader) return null;
  const trimmed = authHeader.trim();
  if (!trimmed) return null;
  if (/^Bearer\s+/i.test(trimmed)) {
    const token = trimmed.replace(/^Bearer\s+/i, '').trim();
    return token.length > 10 ? token : null;
  }
  return trimmed.length > 10 ? trimmed : null;
}

/**
 * Valida o accessToken de membro diretamente na API oficial do Wix Members.
 * Nunca confia em memberId enviado livremente no corpo da requisição.
 */
export async function verifyWixMemberRequest(
  request: Request
): Promise<{ ok: true; memberId: string } | { ok: false; status: number; code: string }> {
  const token = extractBearerToken(request);
  if (!token) {
    return { ok: false, status: 401, code: 'MISSING_AUTH_TOKEN' };
  }

  try {
    const response = await fetch('https://www.wixapis.com/members/v1/members/my', {
      method: 'GET',
      headers: {
        Authorization: token,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return {
        ok: false,
        status: response.status === 401 || response.status === 403 ? 401 : 502,
        code: 'INVALID_WIX_MEMBER_SESSION',
      };
    }

    const payload = (await response.json()) as {
      member?: { id?: string; _id?: string };
    };
    const memberId = payload?.member?.id || payload?.member?._id;
    if (!memberId || typeof memberId !== 'string') {
      return { ok: false, status: 401, code: 'MEMBER_NOT_RESOLVED' };
    }

    return { ok: true, memberId: memberId.trim() };
  } catch {
    return { ok: false, status: 502, code: 'WIX_AUTH_VERIFICATION_FAILED' };
  }
}

export function sanitizeId(value: unknown, maxLen = 96): string {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/[^\w\-.:]/g, '').slice(0, maxLen);
}

export function sanitizeStringArray(values: unknown, maxItems = 25, maxLen = 96): string[] {
  if (!Array.isArray(values)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of values) {
    const clean = sanitizeId(item, maxLen);
    if (clean && !seen.has(clean)) {
      seen.add(clean);
      out.push(clean);
      if (out.length >= maxItems) break;
    }
  }
  return out;
}
