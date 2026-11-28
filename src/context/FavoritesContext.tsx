import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { trackAdAddToWishlist } from '../services/analytics/adTrackingService';
import {
  clearGuestFavorites,
  loadGuestFavorites,
  mergeFavoriteLists,
  saveGuestFavorites,
  toggleFavoriteInList,
} from '../services/favoritesService';
import {
  fetchRemotePersonalizationState,
  mergeRemotePersonalizationAndFavorites,
  toggleRemoteFavorite,
} from '../services/personalizationApiClient';
import { createEmptyPersonalizationState } from '../services/personalizationEngine';
import type { Product } from '../types/commerce';
import { useAuth } from './AuthContext';
import { useConsent } from './ConsentContext';
import { usePersonalization } from './PersonalizationContext';

interface FavoritesContextValue {
  favoriteIds: string[];
  syncing: boolean;
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (product: Product) => boolean;
  clearFavorites: () => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading: authLoading, authEpoch } = useAuth();
  const { consentState } = useConsent();
  const { recordBehaviorEvent } = usePersonalization();

  const [favoriteIds, setFavoriteIds] = useState<string[]>(() =>
    isAuthenticated ? [] : loadGuestFavorites()
  );
  const [syncing, setSyncing] = useState(false);

  const favoritesRef = useRef(favoriteIds);
  favoritesRef.current = favoriteIds;

  const wasAuthenticatedRef = useRef(isAuthenticated);
  const initialSyncedRef = useRef(false);
  const lastEpochRef = useRef(authEpoch);

  useEffect(() => {
    if (authLoading || initialSyncedRef.current) return;
    initialSyncedRef.current = true;
    wasAuthenticatedRef.current = isAuthenticated;
    lastEpochRef.current = authEpoch;

    if (!isAuthenticated) {
      setFavoriteIds(loadGuestFavorites());
      return;
    }

    let active = true;
    setSyncing(true);
    fetchRemotePersonalizationState()
      .then((remote) => {
        if (!active) return;
        const guestLocal = loadGuestFavorites();
        if (remote) {
          setFavoriteIds(mergeFavoriteLists(guestLocal, remote.favoriteIds));
        } else {
          setFavoriteIds(guestLocal);
        }
      })
      .finally(() => {
        if (active) setSyncing(false);
      });

    return () => {
      active = false;
    };
  }, [authEpoch, authLoading, isAuthenticated]);

  useEffect(() => {
    if (authLoading || !initialSyncedRef.current) return;
    if (authEpoch === lastEpochRef.current) return;

    const wasAuth = wasAuthenticatedRef.current;
    wasAuthenticatedRef.current = isAuthenticated;
    lastEpochRef.current = authEpoch;

    if (wasAuth && !isAuthenticated) {
      // Logout: limpa favoritos em memória da conta anterior
      clearGuestFavorites();
      setFavoriteIds([]);
      return;
    }

    if (!wasAuth && isAuthenticated) {
      const guestSnapshot = loadGuestFavorites();
      setSyncing(true);
      mergeRemotePersonalizationAndFavorites({
        consent: {
          ...consentState.preferences,
          policyVersion: consentState.version,
        },
        guestFavoriteIds: guestSnapshot,
        guestPersonalizationState: createEmptyPersonalizationState(),
      })
        .then((remote) => {
          if (remote) {
            setFavoriteIds(mergeFavoriteLists(guestSnapshot, remote.favoriteIds));
            clearGuestFavorites();
          } else {
            setFavoriteIds((prev) => mergeFavoriteLists(guestSnapshot, prev));
          }
        })
        .finally(() => {
          setSyncing(false);
        });
    }
  }, [authEpoch, authLoading, consentState.preferences, consentState.version, isAuthenticated]);

  const isFavorite = useCallback(
    (productId: string) => favoriteIds.includes(productId),
    [favoriteIds]
  );

  const toggleFavorite = useCallback(
    (product: Product): boolean => {
      const { next, added } = toggleFavoriteInList(favoritesRef.current, product.id);
      setFavoriteIds(next);

      if (!isAuthenticated) {
        saveGuestFavorites(next);
      } else {
        void toggleRemoteFavorite(product.id, added);
      }

      recordBehaviorEvent(added ? 'favorite_add' : 'favorite_remove', { product });
      if (added) {
        trackAdAddToWishlist(product);
      }

      return added;
    },
    [isAuthenticated, recordBehaviorEvent]
  );

  const clearFavorites = useCallback(() => {
    const current = [...favoritesRef.current];
    setFavoriteIds([]);
    if (!isAuthenticated) {
      clearGuestFavorites();
    } else {
      for (const pid of current) {
        void toggleRemoteFavorite(pid, false);
      }
    }
  }, [isAuthenticated]);

  return (
    <FavoritesContext.Provider
      value={{
        favoriteIds,
        syncing,
        isFavorite,
        toggleFavorite,
        clearFavorites,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites deve ser utilizado dentro de FavoritesProvider');
  return ctx;
}
