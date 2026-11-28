import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  clearLocalPersonalizationState,
  computePersonalizedRecommendations,
  createEmptyPersonalizationState,
  loadLocalPersonalizationState,
  mergeBehavioralHistories,
  recordBehaviorInState,
  saveLocalPersonalizationState,
  type RecommendationsResult,
} from '../services/personalizationEngine';
import {
  clearRemoteBehavioralHistory,
  fetchRemotePersonalizationState,
  mergeRemotePersonalizationAndFavorites,
  pushRemoteBehaviorEvent,
} from '../services/personalizationApiClient';
import { loadGuestFavorites } from '../services/favoritesService';
import type { Product } from '../types/commerce';
import type { BehaviorEventType, PersonalizationState } from '../types/privacy';
import { useAuth } from './AuthContext';
import { useConsent } from './ConsentContext';

interface PersonalizationContextValue {
  state: PersonalizationState;
  personalizationAllowed: boolean;
  syncingRemote: boolean;
  recordProductView: (product: Product) => void;
  recordSearchQuery: (query: string) => void;
  recordBehaviorEvent: (
    type: BehaviorEventType,
    details?: { product?: Product; searchQuery?: string }
  ) => void;
  clearHistory: () => Promise<void>;
  getRecommendations: (
    products: Product[],
    options?: { favoriteIds?: string[]; excludeIds?: string[]; limit?: number }
  ) => RecommendationsResult;
}

const PersonalizationContext = createContext<PersonalizationContextValue | null>(null);

export function PersonalizationProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading: authLoading, authEpoch } = useAuth();
  const { hasConsent, consentState } = useConsent();
  const personalizationAllowed = hasConsent('personalization');

  const [state, setState] = useState<PersonalizationState>(() =>
    personalizationAllowed
      ? loadLocalPersonalizationState()
      : createEmptyPersonalizationState()
  );
  const [syncingRemote, setSyncingRemote] = useState(false);

  const stateRef = useRef(state);
  stateRef.current = state;

  const wasAuthenticatedRef = useRef(isAuthenticated);
  const initialRemoteDoneRef = useRef(false);
  const lastEpochRef = useRef(authEpoch);

  // Se o usuário revogar consentimento de personalização, interrompe uso e limpa estado ativo em memória
  useEffect(() => {
    if (!personalizationAllowed) {
      clearLocalPersonalizationState();
      setState(createEmptyPersonalizationState());
    } else if (!isAuthenticated) {
      setState(loadLocalPersonalizationState());
    }
  }, [personalizationAllowed, isAuthenticated]);

  // Hidratação inicial do membro já logado
  useEffect(() => {
    if (authLoading || initialRemoteDoneRef.current) return;
    initialRemoteDoneRef.current = true;
    wasAuthenticatedRef.current = isAuthenticated;
    lastEpochRef.current = authEpoch;

    if (!isAuthenticated || !personalizationAllowed) return;

    let active = true;
    setSyncingRemote(true);
    fetchRemotePersonalizationState()
      .then((remote) => {
        if (!active || !remote?.personalizationState) return;
        const merged = mergeBehavioralHistories(
          loadLocalPersonalizationState(),
          remote.personalizationState
        );
        setState(merged);
      })
      .finally(() => {
        if (active) setSyncingRemote(false);
      });

    return () => {
      active = false;
    };
  }, [authEpoch, authLoading, isAuthenticated, personalizationAllowed]);

  // Migração no login & isolamento imediato no logout
  useEffect(() => {
    if (authLoading || !initialRemoteDoneRef.current) return;
    if (authEpoch === lastEpochRef.current) return;

    const wasAuth = wasAuthenticatedRef.current;
    wasAuthenticatedRef.current = isAuthenticated;
    lastEpochRef.current = authEpoch;

    if (wasAuth && !isAuthenticated) {
      // Logout: limpa histórico em memória e localStorage para não vazar sessão anterior
      clearLocalPersonalizationState();
      setState(createEmptyPersonalizationState());
      return;
    }

    if (!wasAuth && isAuthenticated) {
      const localSnapshot = personalizationAllowed
        ? loadLocalPersonalizationState()
        : createEmptyPersonalizationState();
      const guestFavorites = loadGuestFavorites();

      setSyncingRemote(true);
      mergeRemotePersonalizationAndFavorites({
        consent: {
          ...consentState.preferences,
          policyVersion: consentState.version,
        },
        guestFavoriteIds: guestFavorites,
        guestPersonalizationState: localSnapshot,
      })
        .then((mergedRemote) => {
          if (!personalizationAllowed) return;
          if (mergedRemote?.personalizationState) {
            setState(
              mergeBehavioralHistories(localSnapshot, mergedRemote.personalizationState)
            );
          } else {
            setState(localSnapshot);
          }
          // Após migrar para a conta D1, limpa espelho anônimo local
          clearLocalPersonalizationState();
        })
        .finally(() => {
          setSyncingRemote(false);
        });
    }
  }, [
    authEpoch,
    authLoading,
    consentState.preferences,
    consentState.version,
    isAuthenticated,
    personalizationAllowed,
  ]);

  const recordBehaviorEvent = useCallback(
    (
      type: BehaviorEventType,
      details?: { product?: Product; searchQuery?: string }
    ) => {
      if (!personalizationAllowed) return;

      const { nextState, recordedEvent } = recordBehaviorInState(stateRef.current, {
        type,
        product: details?.product,
        searchQuery: details?.searchQuery,
      });

      setState(nextState);

      if (!isAuthenticated) {
        saveLocalPersonalizationState(nextState);
      } else if (recordedEvent) {
        void pushRemoteBehaviorEvent({
          consentPersonalization: true,
          event: recordedEvent as unknown as Record<string, unknown>,
        });
      }
    },
    [isAuthenticated, personalizationAllowed]
  );

  const recordProductView = useCallback(
    (product: Product) => {
      recordBehaviorEvent('view_product', { product });
    },
    [recordBehaviorEvent]
  );

  const recordSearchQuery = useCallback(
    (query: string) => {
      recordBehaviorEvent('search_query', { searchQuery: query });
    },
    [recordBehaviorEvent]
  );

  const clearHistory = useCallback(async () => {
    clearLocalPersonalizationState();
    setState(createEmptyPersonalizationState());
    if (isAuthenticated) {
      await clearRemoteBehavioralHistory();
    }
  }, [isAuthenticated]);

  const getRecommendations = useCallback(
    (
      products: Product[],
      options?: { favoriteIds?: string[]; excludeIds?: string[]; limit?: number }
    ) =>
      computePersonalizedRecommendations({
        products,
        state,
        favoriteIds: options?.favoriteIds ?? [],
        excludeIds: options?.excludeIds ?? [],
        personalizationAllowed,
        limit: options?.limit ?? 10,
      }),
    [personalizationAllowed, state]
  );

  return (
    <PersonalizationContext.Provider
      value={{
        state,
        personalizationAllowed,
        syncingRemote,
        recordProductView,
        recordSearchQuery,
        recordBehaviorEvent,
        clearHistory,
        getRecommendations,
      }}
    >
      {children}
    </PersonalizationContext.Provider>
  );
}

export function usePersonalization(): PersonalizationContextValue {
  const ctx = useContext(PersonalizationContext);
  if (!ctx) {
    throw new Error('usePersonalization deve ser utilizado dentro de PersonalizationProvider');
  }
  return ctx;
}
