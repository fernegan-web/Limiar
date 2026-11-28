import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { scrollToWithPhysics } from '../motion/scrollPhysics';

interface RouterContextValue {
  pathname: string;
  search: string;
  hash: string;
  isPopStateReturn: boolean;
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
  const [isPopStateReturn, setIsPopStateReturn] = useState(false);
  const skipNextResetOnPopRef = React.useRef(false);

  useEffect(() => {
    const handlePopState = () => {
      skipNextResetOnPopRef.current = true;
      setIsPopStateReturn(true);
      setLoc(readLocation());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const scrollToTarget = useCallback((hashValue: string, allowTopReset = true) => {
    if (hashValue) {
      window.requestAnimationFrame(() => {
        const el = document.getElementById(hashValue);
        if (el) {
          scrollToWithPhysics(el, { duration: 1.05 });
        }
      });
    } else if (allowTopReset) {
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
      skipNextResetOnPopRef.current = false;
      setIsPopStateReturn(false);

      if (
        !samePathname ||
        window.location.search !== normalizedSearch ||
        window.location.hash !== (normalizedHash ? `#${normalizedHash}` : '')
      ) {
        window.history.pushState({}, '', fullUrl);
        setLoc({ pathname: normalizedPath, search: normalizedSearch, hash: normalizedHash });
      }

      if (samePathname) {
        scrollToTarget(normalizedHash, true);
      }
    },
    [scrollToTarget]
  );

  const commitScroll = useCallback(() => {
    const wasPop = skipNextResetOnPopRef.current;
    skipNextResetOnPopRef.current = false;
    scrollToTarget(loc.hash, !wasPop);
  }, [loc.hash, scrollToTarget]);

  return (
    <RouterContext.Provider
      value={{
        pathname: loc.pathname,
        search: loc.search,
        hash: loc.hash,
        isPopStateReturn,
        navigate,
        commitScroll,
      }}
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
