import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  CONSENT_POLICY_VERSION,
  hasCategoryConsent,
  loadStoredConsent,
  normalizeConsentPreferences,
  publishConsentSnapshot,
  saveStoredConsent,
} from '../services/consentService';
import { ensureConsentGatedPixelsLoaded } from '../services/analytics/adTrackingService';
import { pushRemoteConsentPreferences } from '../services/personalizationApiClient';
import type {
  ConsentCategory,
  ConsentPreferences,
  StoredConsentState,
} from '../types/privacy';
import { useAuth } from './AuthContext';

interface ConsentContextValue {
  consentState: StoredConsentState;
  hasInteracted: boolean;
  preferencesModalOpen: boolean;
  hasConsent: (category: ConsentCategory) => boolean;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  savePreferences: (prefs: Omit<ConsentPreferences, 'essential'>) => void;
  openPreferencesModal: () => void;
  closePreferencesModal: () => void;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [consentState, setConsentState] = useState<StoredConsentState>(() => {
    const initial = loadStoredConsent();
    publishConsentSnapshot(initial);
    return initial;
  });
  const [preferencesModalOpen, setPreferencesModalOpen] = useState(false);

  useEffect(() => {
    publishConsentSnapshot(consentState);
    if (hasCategoryConsent(consentState, 'marketing')) {
      ensureConsentGatedPixelsLoaded();
    }
  }, [consentState]);

  const commitPreferences = useCallback(
    (prefs: Partial<ConsentPreferences>) => {
      const next = saveStoredConsent({
        version: CONSENT_POLICY_VERSION,
        hasInteracted: true,
        updatedAt: new Date().toISOString(),
        preferences: normalizeConsentPreferences(prefs),
      });
      setConsentState(next);
      publishConsentSnapshot(next);
      setPreferencesModalOpen(false);

      if (isAuthenticated) {
        void pushRemoteConsentPreferences({
          personalization: next.preferences.personalization,
          analytics: next.preferences.analytics,
          marketing: next.preferences.marketing,
          policyVersion: CONSENT_POLICY_VERSION,
        });
      }
    },
    [isAuthenticated]
  );

  const acceptAll = useCallback(() => {
    commitPreferences({
      essential: true,
      personalization: true,
      analytics: true,
      marketing: true,
    });
  }, [commitPreferences]);

  const rejectNonEssential = useCallback(() => {
    commitPreferences({
      essential: true,
      personalization: false,
      analytics: false,
      marketing: false,
    });
  }, [commitPreferences]);

  const savePreferences = useCallback(
    (prefs: Omit<ConsentPreferences, 'essential'>) => {
      commitPreferences({
        essential: true,
        personalization: prefs.personalization,
        analytics: prefs.analytics,
        marketing: prefs.marketing,
      });
    },
    [commitPreferences]
  );

  const hasConsent = useCallback(
    (category: ConsentCategory) => hasCategoryConsent(consentState, category),
    [consentState]
  );

  return (
    <ConsentContext.Provider
      value={{
        consentState,
        hasInteracted: consentState.hasInteracted,
        preferencesModalOpen,
        hasConsent,
        acceptAll,
        rejectNonEssential,
        savePreferences,
        openPreferencesModal: () => setPreferencesModalOpen(true),
        closePreferencesModal: () => setPreferencesModalOpen(false),
      }}
    >
      {children}
    </ConsentContext.Provider>
  );
}

export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) throw new Error('useConsent deve ser utilizado dentro de ConsentProvider');
  return ctx;
}
