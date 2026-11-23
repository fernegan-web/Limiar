import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

interface RouterContextValue {
  pathname: string;
  search: string;
  navigate: (to: string) => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

function readLocation() {
  if (typeof window === 'undefined') {
    return { pathname: '/', search: '' };
  }
  return {
    pathname: window.location.pathname || '/',
    search: window.location.search || '',
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

  const navigate = useCallback((to: string) => {
    const [pathAndSearch, hash] = to.split('#');
    const [nextPath, nextSearch] = (pathAndSearch || '/').split('?');
    const normalizedPath = nextPath || '/';
    const normalizedSearch = nextSearch ? `?${nextSearch}` : '';
    const fullUrl = `${normalizedPath}${normalizedSearch}${hash ? `#${hash}` : ''}`;

    if (
      window.location.pathname !== normalizedPath ||
      window.location.search !== normalizedSearch
    ) {
      window.history.pushState({}, '', fullUrl);
      setLoc({ pathname: normalizedPath, search: normalizedSearch });
    }

    if (hash) {
      window.requestAnimationFrame(() => {
        const el = document.getElementById(hash);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  return (
    <RouterContext.Provider value={{ pathname: loc.pathname, search: loc.search, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter(): RouterContextValue {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter deve ser utilizado dentro de RouterProvider');
  return ctx;
}
