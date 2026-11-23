import React, { useState } from 'react';
import { AccountModal } from './components/commerce/AccountModal';
import { CartDrawer } from './components/commerce/CartDrawer';
import { SearchOverlay } from './components/commerce/SearchOverlay';
import { Footer } from './components/layout/Footer';
import { Navbar } from './components/layout/Navbar';
import { CartProvider } from './context/CartContext';
import { RouterProvider, useRouter } from './context/RouterContext';
import { ThemeProvider } from './context/ThemeContext';
import { AboutPage } from './pages/AboutPage';
import { CatalogPage } from './pages/CatalogPage';
import { CollectionsPage } from './pages/CollectionsPage';
import { ContactPage } from './pages/ContactPage';
import { HomePage } from './pages/HomePage';
import { ProductDetailPage } from './pages/ProductDetailPage';

function AppShell() {
  const { pathname } = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

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
    if (pathname.startsWith('/produto/')) {
      const slug = pathname.replace('/produto/', '').split('/')[0];
      return <ProductDetailPage slug={slug} />;
    }
    return <HomePage />;
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* Textura granulada analógica sutil */}
      <div className="limiar-grain" aria-hidden="true" />

      <Navbar
        onOpenSearch={() => setSearchOpen(true)}
        onOpenAccount={() => setAccountOpen(true)}
      />

      <main className="flex-1">{renderPage()}</main>

      <Footer />

      <CartDrawer />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <AccountModal open={accountOpen} onClose={() => setAccountOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <RouterProvider>
        <CartProvider>
          <AppShell />
        </CartProvider>
      </RouterProvider>
    </ThemeProvider>
  );
}
