import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Footer } from './components/layout/Footer';
import { Navbar } from './components/layout/Navbar';
import { PortalIntroOverlay } from './components/intro/PortalIntroOverlay';
import { NeotribalGlobalBackground } from './components/ornaments/NeotribalGlobalBackground';
import { OrbitalCursor } from './components/ui/OrbitalCursor';
import { WhatsAppFloatingButton } from './components/ui/WhatsAppFloatingButton';
import { AuthProvider } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { RouterProvider, useRouter } from './context/RouterContext';
import { ThemeProvider } from './context/ThemeContext';
import { PortalRouteTransition } from './motion/PortalRouteTransition';
import {
  ThresholdMotionProvider,
  useThresholdPointer,
} from './motion/ThresholdMotionProvider';
import { HomePage } from './pages/HomePage';
import { validateAndLogWixCatalogConnection } from './services/wix/wixProductsService';

const CatalogPage = lazy(() =>
  import('./pages/CatalogPage').then((m) => ({ default: m.CatalogPage }))
);
const CollectionsPage = lazy(() =>
  import('./pages/CollectionsPage').then((m) => ({ default: m.CollectionsPage }))
);
const AboutPage = lazy(() =>
  import('./pages/AboutPage').then((m) => ({ default: m.AboutPage }))
);
const ContactPage = lazy(() =>
  import('./pages/ContactPage').then((m) => ({ default: m.ContactPage }))
);
const ProductDetailPage = lazy(() =>
  import('./pages/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage }))
);
const AuthCallbackPage = lazy(() =>
  import('./pages/AuthCallbackPage').then((m) => ({ default: m.AuthCallbackPage }))
);
const CartDrawer = lazy(() =>
  import('./components/commerce/CartDrawer').then((m) => ({ default: m.CartDrawer }))
);
const SearchOverlay = lazy(() =>
  import('./components/commerce/SearchOverlay').then((m) => ({ default: m.SearchOverlay }))
);
const AccountModal = lazy(() =>
  import('./components/commerce/AccountModal').then((m) => ({ default: m.AccountModal }))
);

function AppShell() {
  const { pathname, commitScroll } = useRouter();
  const { markPortalRevealed } = useThresholdPointer();
  const { isDrawerOpen, items, checkoutReturnNotice, clearCheckoutReturnNotice } = useCart();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchMounted, setSearchMounted] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountMounted, setAccountMounted] = useState(false);
  const isCallbackPath =
    typeof window !== 'undefined' && window.location.pathname === '/auth/callback';
  const [introActive, setIntroActive] = useState(!isCallbackPath);

  useEffect(() => {
    if (isCallbackPath) {
      markPortalRevealed();
    }
  }, [isCallbackPath, markPortalRevealed]);

  const shouldMountCart = isDrawerOpen || items.length > 0;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const isLocked = searchOpen || accountOpen || isDrawerOpen;
    document.documentElement.dataset.scrollLocked = isLocked ? 'true' : 'false';
    return () => {
      document.documentElement.dataset.scrollLocked = 'false';
    };
  }, [searchOpen, accountOpen, isDrawerOpen]);

  // Validação e log da conexão real com o backend Wix Stores (apenas em desenvolvimento)
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    validateAndLogWixCatalogConnection().catch((err) => {
      console.warn('[Wix Headless] Validação de catálogo:', err);
    });
  }, []);

  const isHomeRoute =
    pathname === '/' ||
    pathname === '' ||
    (pathname !== '/loja' &&
      pathname !== '/colecoes' &&
      pathname !== '/sobre' &&
      pathname !== '/contato' &&
      pathname !== '/auth/callback' &&
      !pathname.startsWith('/produto/'));

  const renderPage = () => {
    if (pathname === '/' || pathname === '') {
      return <HomePage />;
    }
    if (pathname === '/loja') {
      return <CatalogPage />;
    }
    if (pathname === '/colecoes') {
      return <CollectionsPage />;
    }
    if (pathname === '/sobre') {
      return <AboutPage />;
    }
    if (pathname === '/contato') {
      return <ContactPage />;
    }
    if (pathname === '/auth/callback') {
      return <AuthCallbackPage />;
    }
    if (pathname.startsWith('/produto/')) {
      const slug = pathname.replace('/produto/', '').split('/')[0];
      return <ProductDetailPage slug={slug} />;
    }
    return <HomePage />;
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)] overflow-x-clip">
      {/* Camadas atmosféricas discretas (adaptáveis aos dois temas) */}
      <div className="limiar-atmosphere" aria-hidden="true" />
      {/* Camada neotribal interativa global */}
      <NeotribalGlobalBackground />
      {/* Textura granulada analógica sutil */}
      <div className="limiar-grain" aria-hidden="true" />

      <Navbar
        onOpenSearch={() => {
          setSearchMounted(true);
          setSearchOpen(true);
        }}
        onOpenAccount={() => {
          setAccountMounted(true);
          setAccountOpen(true);
        }}
      />

      {checkoutReturnNotice?.handled && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[60] glass-surface-strong rounded-2xl border border-[var(--border-strong)] p-4 shadow-xl flex items-start justify-between gap-3"
        >
          <p className="text-xs leading-relaxed text-[var(--text-primary)]">
            {checkoutReturnNotice.message}
          </p>
          <button
            type="button"
            onClick={clearCheckoutReturnNotice}
            aria-label="Fechar aviso de retorno do checkout"
            className="shrink-0 text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            Fechar
          </button>
        </div>
      )}

      <main className="relative z-10 flex-1">
        <PortalRouteTransition routeKey={pathname || '/'} onTransitionScroll={commitScroll}>
          <Suspense fallback={null}>{renderPage()}</Suspense>
        </PortalRouteTransition>
      </main>

      {!isHomeRoute && <Footer />}

      {shouldMountCart && (
        <Suspense fallback={null}>
          <CartDrawer />
        </Suspense>
      )}
      {searchMounted && (
        <Suspense fallback={null}>
          <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
        </Suspense>
      )}
      {accountMounted && (
        <Suspense fallback={null}>
          <AccountModal open={accountOpen} onClose={() => setAccountOpen(false)} />
        </Suspense>
      )}
      <WhatsAppFloatingButton hidden={searchOpen || accountOpen || isDrawerOpen} />
      <OrbitalCursor />
      {introActive && (
        <PortalIntroOverlay
          onPortalOpen={markPortalRevealed}
          onComplete={() => {
            markPortalRevealed();
            setIntroActive(false);
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ThresholdMotionProvider>
        <RouterProvider>
          <AuthProvider>
            <CartProvider>
              <AppShell />
            </CartProvider>
          </AuthProvider>
        </RouterProvider>
      </ThresholdMotionProvider>
    </ThemeProvider>
  );
}
