import type { ContactFormInput } from '../utils/validation';

export interface ContactSubmissionPayload extends ContactFormInput {
  honeypot?: string;
  renderedAt?: number;
}

export type ContactDeliveryStatus = 'sent' | 'unconfigured' | 'failed';

export interface ContactSubmissionResult {
  ok: boolean;
  status: ContactDeliveryStatus;
}

const recentSubmissions = new Map<string, number>();
const DUPLICATE_COOLDOWN_MS = 45_000;

function computePayloadSignature(input: ContactFormInput): string {
  return [
    input.name.trim().toLowerCase(),
    input.email.trim().toLowerCase(),
    input.subject.trim().toLowerCase(),
    input.message.trim().toLowerCase(),
  ].join('|');
}

export function isDuplicateRecentSubmission(input: ContactFormInput, now = Date.now()): boolean {
  const key = computePayloadSignature(input);
  const lastSentAt = recentSubmissions.get(key);
  if (!lastSentAt) return false;
  return now - lastSentAt < DUPLICATE_COOLDOWN_MS;
}

export function markSubmissionSent(input: ContactFormInput, now = Date.now()): void {
  const key = computePayloadSignature(input);
  recentSubmissions.set(key, now);
}

/**
 * Envia a mensagem do formulário de contato para a Cloudflare Pages Function (/api/contact).
 * Nunca simula envio bem-sucedido: só retorna ok: true quando o servidor confirma HTTP 2xx e { ok: true }.
 */
export async function submitContactMessage(
  payload: ContactSubmissionPayload
): Promise<ContactSubmissionResult> {
  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        name: payload.name.trim(),
        email: payload.email.trim(),
        subject: payload.subject.trim(),
        message: payload.message.trim(),
        _trap: payload.honeypot ?? '',
        renderedAt: payload.renderedAt ?? 0,
      }),
    });

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const data = isJson
      ? ((await response.json()) as { ok?: boolean; code?: string })
      : null;

    if (response.ok && data?.ok === true) {
      markSubmissionSent(payload);
      return { ok: true, status: 'sent' };
    }

    if (response.status === 503 || response.status === 404 || !isJson || data?.code === 'SERVICE_UNCONFIGURED') {
      return { ok: false, status: 'unconfigured' };
    }

    return { ok: false, status: 'failed' };
  } catch {
    return { ok: false, status: 'failed' };
  }
}
