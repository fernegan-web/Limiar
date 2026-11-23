import React, { useState } from 'react';
import { Menu, Moon, Search, ShoppingBag, Sun, User, X } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useRouter } from '../../context/RouterContext';
import { useTheme } from '../../context/ThemeContext';
import { LimiarLogo } from '../ui/LimiarLogo';

interface NavbarProps {
  onOpenSearch: () => void;
  onOpenAccount: () => void;
}

const NAV_LINKS = [
  { label: 'Loja', href: '/loja' },
  { label: 'Coleções', href: '/colecoes' },
  { label: 'Sobre', href: '/sobre' },
  { label: 'Contato', href: '/contato' },
] as const;

export function Navbar({ onOpenSearch, onOpenAccount }: NavbarProps) {
  const { pathname, navigate } = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { totalItems, openDrawer } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    navigate(href);
  };

  return (
    <header className="sticky top-0 z-50 w-full transition-colors duration-300">
      <div className="mx-auto max-w-[1360px] px-4 sm:px-8 pt-3 pb-2">
        <div className="flex items-center justify-between gap-4">
          {/* Zona 1: Logo Original */}
          <a
            href="/"
            onClick={(e) => handleLinkClick(e, '/')}
            aria-label="Limiar — Página inicial"
            className="shrink-0 flex items-center py-0.5 focus-visible:rounded-md"
          >
            <LimiarLogo className="h-12 sm:h-14 w-auto" alt="Limiar" />
          </a>

          {/* Zona 2: Navegação Desktop Glassmorphic */}
          <nav
            aria-label="Navegação principal"
            className="hidden md:flex items-center gap-8 px-7 py-2.5 rounded-full glass-surface-strong"
          >
            {NAV_LINKS.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href === '/loja' && pathname.startsWith('/produto/'));
              return (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleLinkClick(e, item.href)}
                  className={`relative text-[11px] uppercase tracking-[0.18em] font-medium whitespace-nowrap shrink-0 transition-colors duration-200 ${
                    isActive
                      ? 'text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute -bottom-1.5 left-0 right-0 h-[1px] bg-[var(--accent-uv)] opacity-80"
                    />
                  )}
                </a>
              );
            })}
          </nav>

          {/* Zona 3: Ações Utilitárias */}
          <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 rounded-full glass-surface shrink-0">
            <button
              type="button"
              onClick={onOpenSearch}
              aria-label="Buscar produtos"
              className="inline-flex items-center justify-center w-9 h-9 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
            >
              <Search className="w-4 h-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={onOpenAccount}
              aria-label="Conta de visitante"
              className="hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
            >
              <User className="w-4 h-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
              className="inline-flex items-center justify-center w-9 h-9 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Moon className="w-4 h-4" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={openDrawer}
              aria-label={`Abrir carrinho (${totalItems} itens)`}
              className="relative inline-flex items-center justify-center w-9 h-9 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
            >
              <ShoppingBag className="w-4 h-4" aria-hidden="true" />
              {totalItems > 0 && (
                <span
                  data-testid="cart-badge"
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--accent-acid)] text-[#080909] text-[10px] font-semibold leading-[18px] text-center tabular-nums"
                >
                  {totalItems}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={mobileMenuOpen}
              className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-full text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Menu className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Menu Mobile */}
        {mobileMenuOpen && (
          <nav
            aria-label="Navegação mobile"
            className="md:hidden mt-2.5 p-4 rounded-2xl glass-surface-strong flex flex-col gap-1"
          >
            {NAV_LINKS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleLinkClick(e, item.href)}
                  className={`flex items-center justify-between px-3 py-3 rounded-xl text-xs uppercase tracking-[0.18em] font-medium transition-colors ${
                    isActive
                      ? 'bg-[var(--bg-surface-hover)] text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-uv)]" aria-hidden="true" />
                  )}
                </a>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAccount();
              }}
              className="flex items-center gap-2.5 px-3 py-3 rounded-xl text-xs uppercase tracking-[0.18em] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-left"
            >
              <User className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Conta de visitante</span>
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}
