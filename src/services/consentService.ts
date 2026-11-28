import type { ConsentCategory, ConsentPreferences, StoredConsentState } from '../types/privacy';

export const CONSENT_STORAGE_KEY = 'limiar_consent_v1';
export const CONSENT_POLICY_VERSION = 1;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function getLocalStorageSafe(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function createDefaultConsentState(): StoredConsentState {
  return {
    version: CONSENT_POLICY_VERSION,
    hasInteracted: false,
    updatedAt: '',
    preferences: {
      essential: true,
      personalization: false,
      analytics: false,
      marketing: false,
    },
  };
}

export function normalizeConsentPreferences(
  raw?: Partial<ConsentPreferences> | null
): ConsentPreferences {
  return {
    essential: true,
    personalization: Boolean(raw?.personalization),
    analytics: Boolean(raw?.analytics),
    marketing: Boolean(raw?.marketing),
  };
}

export function loadStoredConsent(
  storage: StorageLike | null = getLocalStorageSafe()
): StoredConsentState {
  if (!storage) return createDefaultConsentState();
  try {
    const raw = storage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return createDefaultConsentState();
    const parsed = JSON.parse(raw) as Partial<StoredConsentState> | null;
    if (!parsed || typeof parsed !== 'object') {
      return createDefaultConsentState();
    }
    if (parsed.version !== CONSENT_POLICY_VERSION) {
      return createDefaultConsentState();
    }
    return {
      version: CONSENT_POLICY_VERSION,
      hasInteracted: Boolean(parsed.hasInteracted),
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
      preferences: normalizeConsentPreferences(parsed.preferences),
    };
  } catch {
    return createDefaultConsentState();
  }
}

export function saveStoredConsent(
  state: StoredConsentState,
  storage: StorageLike | null = getLocalStorageSafe()
): StoredConsentState {
  const normalized: StoredConsentState = {
    version: CONSENT_POLICY_VERSION,
    hasInteracted: Boolean(state.hasInteracted),
    updatedAt: state.updatedAt || new Date().toISOString(),
    preferences: normalizeConsentPreferences(state.preferences),
  };
  if (storage) {
    try {
      storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(normalized));
    } catch {
      // ignore storage quota / privacy mode errors
    }
  }
  return normalized;
}

export function hasCategoryConsent(
  state: StoredConsentState,
  category: ConsentCategory
): boolean {
  if (category === 'essential') return true;
  if (!state.hasInteracted) return false;
  return Boolean(state.preferences[category]);
}

let activeConsentSnapshot: StoredConsentState = loadStoredConsent();
const consentSubscribers = new Set<(next: StoredConsentState) => void>();

export function getConsentSnapshot(): StoredConsentState {
  return activeConsentSnapshot;
}

export function publishConsentSnapshot(next: StoredConsentState): void {
  activeConsentSnapshot = next;
  consentSubscribers.forEach((listener) => {
    try {
      listener(next);
    } catch {
      // ignore subscriber failure
    }
  });
}

export function subscribeConsentChange(
  listener: (next: StoredConsentState) => void
): () => void {
  consentSubscribers.add(listener);
  return () => {
    consentSubscribers.delete(listener);
  };
}
