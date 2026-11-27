import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { initWixVisitorAuth, isMemberSessionTokens, myWixClient } from '../services/wix/wixClient';
import {
  getCurrentWixMember,
  logoutWixMember,
  type MemberProfileSummary,
} from '../services/wix/wixMembersService';

interface AuthContextValue {
  member: MemberProfileSummary | null;
  isAuthenticated: boolean;
  loading: boolean;
  authEpoch: number;
  refreshMember: () => Promise<MemberProfileSummary | null>;
  setAuthenticatedMember: (member: MemberProfileSummary | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [member, setMember] = useState<MemberProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [authEpoch, setAuthEpoch] = useState(0);

  const refreshMember = useCallback(async () => {
    setLoading(true);
    try {
      await initWixVisitorAuth();
      const tokens = myWixClient.auth.getTokens();
      if (!isMemberSessionTokens(tokens)) {
        setMember(null);
        return null;
      }
      const profile = await getCurrentWixMember();
      setMember(profile);
      return profile;
    } catch (error) {
      console.warn('[Limiar Auth] Erro ao atualizar estado da sessão:', error);
      setMember(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await initWixVisitorAuth();
        if (!active) return;
        const tokens = myWixClient.auth.getTokens();
        if (isMemberSessionTokens(tokens)) {
          const profile = await getCurrentWixMember();
          if (active) setMember(profile);
        } else if (active) {
          setMember(null);
        }
      } catch (error) {
        console.warn('[Limiar Auth] Inicialização de sessão falhou:', error);
        if (active) setMember(null);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const setAuthenticatedMember = useCallback((nextMember: MemberProfileSummary | null) => {
    setMember(nextMember);
    setAuthEpoch((prev) => prev + 1);
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      const { logoutUrl } = await logoutWixMember();
      setMember(null);
      setAuthEpoch((prev) => prev + 1);
      if (logoutUrl && typeof window !== 'undefined') {
        window.location.assign(logoutUrl);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const isAuthenticated = Boolean(
    member || isMemberSessionTokens(myWixClient.auth.getTokens())
  );

  return (
    <AuthContext.Provider
      value={{
        member,
        isAuthenticated,
        loading,
        authEpoch,
        refreshMember,
        setAuthenticatedMember,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser utilizado dentro de AuthProvider');
  return ctx;
}
