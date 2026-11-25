import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { scrollToWithPhysics } from '../motion/scrollPhysics';

interface RouterContextValue {
  pathname: string;
  search: string;
  hash: string;
  navigate: (to: string) => void;
  commitScroll: () => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

function readLocation() {
  if (typeof window === 'undefined') {
    return { pathname: '/', search: '', hash: '' };
  }
  return {
    pathname: window.location.pathname || '/',
    search: window.location.search || '',
    hash: window.location.hash ? window.location.hash.slice(1) : '',
  };
}

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [loc, setLoc] = useState(readLocation);

  useEffect(() => {
    const handlePopState = () => {
      setLoc(readLocation());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const scrollToTarget = useCallback((hashValue: string) => {
    if (hashValue) {
      window.requestAnimationFrame(() => {
        const el = document.getElementById(hashValue);
        if (el) {
          scrollToWithPhysics(el, { duration: 1.05 });
        }
      });
    } else {
      scrollToWithPhysics(0, { immediate: true });
    }
  }, []);

  const navigate = useCallback(
    (to: string) => {
      const [pathAndSearch, hash] = to.split('#');
      const [nextPath, nextSearch] = (pathAndSearch || '/').split('?');
      const normalizedPath = nextPath || '/';
      const normalizedSearch = nextSearch ? `?${nextSearch}` : '';
      const normalizedHash = hash || '';
      const fullUrl = `${normalizedPath}${normalizedSearch}${normalizedHash ? `#${normalizedHash}` : ''}`;

      const samePathname = window.location.pathname === normalizedPath;

      if (
        !samePathname ||
        window.location.search !== normalizedSearch ||
        window.location.hash !== (normalizedHash ? `#${normalizedHash}` : '')
      ) {
        window.history.pushState({}, '', fullUrl);
        setLoc({ pathname: normalizedPath, search: normalizedSearch, hash: normalizedHash });
      }

      if (samePathname) {
        scrollToTarget(normalizedHash);
      }
    },
    [scrollToTarget]
  );

  const commitScroll = useCallback(() => {
    scrollToTarget(loc.hash);
  }, [loc.hash, scrollToTarget]);

  return (
    <RouterContext.Provider
      value={{ pathname: loc.pathname, search: loc.search, hash: loc.hash, navigate, commitScroll }}
    >
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter(): RouterContextValue {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter deve ser utilizado dentro de RouterProvider');
  return ctx;
}
