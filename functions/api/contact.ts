/**
 * Cloudflare Pages Function — POST /api/contact
 * ---------------------------------------------------------------------------
 * Variáveis de ambiente necessárias no painel da Cloudflare Pages (Settings -> Environment variables):
 * - RESEND_API_KEY (obrigatória para envio real via Resend REST API)
 * - CONTACT_FROM_EMAIL (ex.: "Limiar <noreply@seudominio.com>", domínio verificado no Resend)
 * - CONTACT_TO_EMAIL (opcional; padrão: "contato@limiarritual.com")
 */

interface ContactEnv {
  RESEND_API_KEY?: string;
  CONTACT_FROM_EMAIL?: string;
  CONTACT_TO_EMAIL?: string;
}

interface ContactBody {
  name?: unknown;
  email?: unknown;
  subject?: unknown;
  message?: unknown;
  _trap?: unknown;
  renderedAt?: unknown;
}

const DEFAULT_RECIPIENT = 'contato@limiarritual.com';

function sanitizeHeaderLine(value: string, maxLength: number): string {
  return value.replace(/[\r\n]+/g, ' ').trim().slice(0, maxLength);
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export const onRequestPost = async (context: {
  request: Request;
  env: ContactEnv;
}): Promise<Response> => {
  try {
    const contentType = context.request.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return jsonResponse({ ok: false, code: 'INVALID_CONTENT_TYPE' }, 415);
    }

    const body = (await context.request.json()) as ContactBody;

    // Proteção anti-spam: honeypot e submissão instantânea (< 700ms)
    if (typeof body._trap === 'string' && body._trap.trim().length > 0) {
      return jsonResponse({ ok: false, code: 'SPAM_REJECTED' }, 400);
    }
    if (typeof body.renderedAt === 'number' && body.renderedAt > 0) {
      const elapsed = Date.now() - body.renderedAt;
      if (elapsed >= 0 && elapsed < 700) {
        return jsonResponse({ ok: false, code: 'SUBMISSION_TOO_FAST' }, 429);
      }
    }

    const name = typeof body.name === 'string' ? sanitizeHeaderLine(body.name, 120) : '';
    const email = typeof body.email === 'string' ? sanitizeHeaderLine(body.email, 160) : '';
    const subject = typeof body.subject === 'string' ? sanitizeHeaderLine(body.subject, 180) : '';
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 4000) : '';

    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
    if (name.length < 2 || !emailValid || subject.length < 3 || message.length < 10) {
      return jsonResponse({ ok: false, code: 'VALIDATION_ERROR' }, 400);
    }

    const apiKey = context.env?.RESEND_API_KEY?.trim();
    if (!apiKey) {
      return jsonResponse({ ok: false, code: 'SERVICE_UNCONFIGURED' }, 503);
    }

    const recipient = context.env?.CONTACT_TO_EMAIL?.trim() || DEFAULT_RECIPIENT;
    const sender = context.env?.CONTACT_FROM_EMAIL?.trim() || 'Limiar <contato@limiarritual.com>';

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: sender,
        to: [recipient],
        reply_to: email,
        subject: `[Contato Limiar] ${subject}`,
        text: [
          `Nome: ${name}`,
          `E-mail: ${email}`,
          `Assunto: ${subject}`,
          '',
          'Mensagem:',
          message,
        ].join('\n'),
      }),
    });

    if (!resendResponse.ok) {
      return jsonResponse({ ok: false, code: 'DELIVERY_FAILED' }, 502);
    }

    return jsonResponse({ ok: true }, 200);
  } catch {
    return jsonResponse({ ok: false, code: 'DELIVERY_FAILED' }, 500);
  }
};
