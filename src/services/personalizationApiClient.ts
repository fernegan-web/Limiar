import { initWixVisitorAuth, isAccessTokenValid, isMemberSessionTokens, myWixClient } from './wix/wixClient';
import type { PersonalizationState, StoredConsentState } from '../types/privacy';

export interface RemotePersonalizationSnapshot {
  consent: {
    essential: true;
    personalization: boolean;
    analytics: boolean;
    marketing: boolean;
    policyVersion: number;
    updatedAt: number;
  } | null;
  favoriteIds: string[];
  personalizationState: PersonalizationState;
}

async function getMemberBearerToken(): Promise<string | null> {
  try {
    let tokens = myWixClient.auth.getTokens();
    if (!isMemberSessionTokens(tokens)) {
      return null;
    }
    if (!isAccessTokenValid(tokens)) {
      tokens = await initWixVisitorAuth();
    }
    if (!isMemberSessionTokens(tokens) || !tokens.accessToken?.value) {
      return null;
    }
    return tokens.accessToken.value;
  } catch {
    return null;
  }
}

async function authorizedJsonFetch<T>(
  path: string,
  init: RequestInit
): Promise<{ ok: true; data: T } | { ok: false; status: number }> {
  if (typeof fetch !== 'function' || typeof window === 'undefined') {
    return { ok: false, status: 0 };
  }
  const token = await getMemberBearerToken();
  if (!token) {
    return { ok: false, status: 401 };
  }

  try {
    const response = await fetch(path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init.headers || {}),
      },
    });
    if (!response.ok) {
      return { ok: false, status: response.status };
    }
    const data = (await response.json()) as T;
    return { ok: true, data };
  } catch {
    return { ok: false, status: 0 };
  }
}

export async function fetchRemotePersonalizationState(): Promise<RemotePersonalizationSnapshot | null> {
  const res = await authorizedJsonFetch<{ ok: boolean } & RemotePersonalizationSnapshot>(
    '/api/personalization/state',
    { method: 'GET' }
  );
  if (!res.ok || !res.data?.ok) return null;
  return {
    consent: res.data.consent ?? null,
    favoriteIds: Array.isArray(res.data.favoriteIds) ? res.data.favoriteIds : [],
    personalizationState: res.data.personalizationState,
  };
}

export async function mergeRemotePersonalizationAndFavorites(params: {
  consent: StoredConsentState['preferences'] & { policyVersion: number };
  guestFavoriteIds: string[];
  guestPersonalizationState: PersonalizationState;
}): Promise<RemotePersonalizationSnapshot | null> {
  const res = await authorizedJsonFetch<{ ok: boolean } & RemotePersonalizationSnapshot>(
    '/api/personalization/merge',
    {
      method: 'POST',
      body: JSON.stringify(params),
    }
  );
  if (!res.ok || !res.data?.ok) return null;
  return {
    consent: res.data.consent ?? null,
    favoriteIds: Array.isArray(res.data.favoriteIds) ? res.data.favoriteIds : [],
    personalizationState: res.data.personalizationState,
  };
}

export async function pushRemoteBehaviorEvent(params: {
  consentPersonalization: boolean;
  event: Record<string, unknown>;
}): Promise<boolean> {
  const res = await authorizedJsonFetch<{ ok: boolean }>('/api/personalization/events', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return res.ok && Boolean(res.data?.ok);
}

export async function pushRemoteConsentPreferences(prefs: {
  personalization: boolean;
  analytics: boolean;
  marketing: boolean;
  policyVersion: number;
}): Promise<boolean> {
  const res = await authorizedJsonFetch<{ ok: boolean }>('/api/personalization/consent', {
    method: 'PUT',
    body: JSON.stringify(prefs),
  });
  return res.ok && Boolean(res.data?.ok);
}

export async function clearRemoteBehavioralHistory(): Promise<boolean> {
  const res = await authorizedJsonFetch<{ ok: boolean }>('/api/personalization/history', {
    method: 'DELETE',
  });
  return res.ok && Boolean(res.data?.ok);
}

export async function toggleRemoteFavorite(productId: string, add: boolean): Promise<boolean> {
  const res = await authorizedJsonFetch<{ ok: boolean }>(
    '/api/personalization/favorites',
    {
      method: add ? 'POST' : 'DELETE',
      body: JSON.stringify({ productId }),
    }
  );
  return res.ok && Boolean(res.data?.ok);
}
