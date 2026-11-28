import { jsonResponse, type LimiarCloudflareEnv } from '../_lib/wixAuth';

const ALLOWED_EVENTS = new Set([
  'PageView',
  'ViewContent',
  'Search',
  'AddToWishlist',
  'AddToCart',
  'InitiateCheckout',
  'Purchase',
]);

function mapTikTokEventName(name: string): string {
  switch (name) {
    case 'PageView':
      return 'Pageview';
    case 'Purchase':
      return 'CompletePayment';
    default:
      return name;
  }
}

export const onRequestPost = async (context: {
  request: Request;
  env: LimiarCloudflareEnv;
}): Promise<Response> => {
  try {
    const body = (await context.request.json()) as {
      consentMarketing?: unknown;
      event?: {
        eventId?: unknown;
        eventName?: unknown;
        eventTime?: unknown;
        eventSourceUrl?: unknown;
        currency?: unknown;
        value?: unknown;
        contentType?: unknown;
        contentIds?: unknown;
        contents?: unknown;
        searchString?: unknown;
        numItems?: unknown;
      };
    };

    if (body?.consentMarketing !== true) {
      return jsonResponse({ ok: true, skipped: 'MARKETING_CONSENT_REQUIRED' }, 200);
    }

    const ev = body?.event;
    const eventName = typeof ev?.eventName === 'string' ? ev.eventName.trim() : '';
    const eventId = typeof ev?.eventId === 'string' ? ev.eventId.trim().slice(0, 128) : '';

    if (!eventId || !ALLOWED_EVENTS.has(eventName)) {
      return jsonResponse({ ok: false, code: 'INVALID_EVENT' }, 400);
    }

    const metaPixelId = context.env?.META_PIXEL_ID?.trim();
    const metaToken = context.env?.META_CAPI_ACCESS_TOKEN?.trim();
    const metaTestCode = context.env?.META_TEST_EVENT_CODE?.trim();

    const tiktokPixelCode = context.env?.TIKTOK_PIXEL_CODE?.trim();
    const tiktokToken = context.env?.TIKTOK_ACCESS_TOKEN?.trim();
    const tiktokTestCode = context.env?.TIKTOK_TEST_EVENT_CODE?.trim();

    if (!metaPixelId && !tiktokPixelCode) {
      return jsonResponse({ ok: true, configured: false }, 200);
    }

    const clientIp =
      context.request.headers.get('cf-connecting-ip') ||
      context.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      undefined;
    const userAgent = context.request.headers.get('user-agent') || undefined;
    const eventTime =
      typeof ev?.eventTime === 'number' && Number.isFinite(ev.eventTime)
        ? Math.floor(ev.eventTime)
        : Math.floor(Date.now() / 1000);
    const eventSourceUrl =
      typeof ev?.eventSourceUrl === 'string' && ev.eventSourceUrl.startsWith('http')
        ? ev.eventSourceUrl.slice(0, 500)
        : 'https://limiarritual.com/';

    const tasks: Array<Promise<{ platform: string; ok: boolean }>> = [];

    if (metaPixelId && metaToken) {
      const customData: Record<string, unknown> = {
        currency: 'BRL',
      };
      if (typeof ev?.value === 'number' && Number.isFinite(ev.value)) customData.value = ev.value;
      if (typeof ev?.contentType === 'string') customData.content_type = ev.contentType;
      if (Array.isArray(ev?.contentIds)) customData.content_ids = ev.contentIds;
      if (Array.isArray(ev?.contents)) customData.contents = ev.contents;
      if (typeof ev?.searchString === 'string') customData.search_string = ev.searchString;
      if (typeof ev?.numItems === 'number') customData.num_items = ev.numItems;

      const metaPayload: Record<string, unknown> = {
        data: [
          {
            event_name: eventName,
            event_time: eventTime,
            event_id: eventId,
            action_source: 'website',
            event_source_url: eventSourceUrl,
            user_data: {
              ...(clientIp ? { client_ip_address: clientIp } : {}),
              ...(userAgent ? { client_user_agent: userAgent } : {}),
            },
            ...(eventName === 'PageView' ? {} : { custom_data: customData }),
          },
        ],
        ...(metaTestCode ? { test_event_code: metaTestCode } : {}),
      };

      tasks.push(
        fetch(
          `https://graph.facebook.com/v21.0/${encodeURIComponent(
            metaPixelId
          )}/events?access_token=${encodeURIComponent(metaToken)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(metaPayload),
          }
        )
          .then((res) => ({ platform: 'meta', ok: res.ok }))
          .catch(() => ({ platform: 'meta', ok: false }))
      );
    }

    if (tiktokPixelCode && tiktokToken) {
      const ttPayload: Record<string, unknown> = {
        event_source: 'web',
        event_source_id: tiktokPixelCode,
        ...(tiktokTestCode ? { test_event_code: tiktokTestCode } : {}),
        data: [
          {
            event: mapTikTokEventName(eventName),
            event_time: eventTime,
            event_id: eventId,
            page: { url: eventSourceUrl },
            user: {
              ...(clientIp ? { ip: clientIp } : {}),
              ...(userAgent ? { user_agent: userAgent } : {}),
            },
            properties: {
              currency: 'BRL',
              ...(typeof ev?.value === 'number' ? { value: ev.value } : {}),
              ...(typeof ev?.searchString === 'string' ? { query: ev.searchString } : {}),
              ...(Array.isArray(ev?.contents) ? { contents: ev.contents } : {}),
            },
          },
        ],
      };

      tasks.push(
        fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Access-Token': tiktokToken,
          },
          body: JSON.stringify(ttPayload),
        })
          .then((res) => ({ platform: 'tiktok', ok: res.ok }))
          .catch(() => ({ platform: 'tiktok', ok: false }))
      );
    }

    const results = await Promise.all(tasks);
    return jsonResponse({ ok: true, results }, 200);
  } catch {
    return jsonResponse({ ok: false, code: 'TRACKING_FAILED' }, 500);
  }
};
