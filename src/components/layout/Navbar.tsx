import React, { useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Menu, Moon, Search, ShoppingBag, Sun, User, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useRouter } from '../../context/RouterContext';
import { useTheme } from '../../context/ThemeContext';
import type { SingularityIntroFrame } from '../../motion/singularityIntroTimeline';
import { useThresholdPointer } from '../../motion/ThresholdMotionProvider';
import { THRESHOLD_EASE, THRESHOLD_SPRING } from '../../motion/thresholdConfig';
import { LimiarLogo } from '../ui/LimiarLogo';

interface NavbarProps {
  onOpenSearch: () => void;
  onOpenAccount: () => void;
  overlay?: boolean;
}

const NAV_LINKS = [
  { label: 'Loja', href: '/loja' },
  { label: 'Coleções', href: '/colecoes' },
  { label: 'Sobre', href: '/sobre' },
  { label: 'Contato', href: '/contato' },
] as const;

export function Navbar({ onOpenSearch, onOpenAccount, overlay = false }: NavbarProps) {
  const { pathname, navigate } = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, member } = useAuth();
  const { totalItems, openDrawer } = useCart();
  const { introActive, subscribeIntroTick, getLatestIntroFrame } = useThresholdPointer();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const headerEl = headerRef.current;
    if (!headerEl) return;

    if (!introActive) {
      headerEl.style.opacity = '';
      headerEl.style.visibility = '';
      headerEl.style.pointerEvents = '';
      return;
    }

    const applyNav = (frame: SingularityIntroFrame) => {
      const op = frame.chrome.navbarOpacity;
      headerEl.style.opacity = String(op);
      headerEl.style.visibility = op <= 0.001 ? 'hidden' : 'visible';
      headerEl.style.pointerEvents = op > 0.65 ? 'auto' : 'none';
    };

    applyNav(getLatestIntroFrame());
    return subscribeIntroTick(applyNav);
  }, [introActive, subscribeIntroTick, getLatestIntroFrame]);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    navigate(href);
  };

  return (
    <header
      ref={headerRef}
      style={
        introActive
          ? { opacity: 0, visibility: 'hidden', pointerEvents: 'none' }
          : undefined
      }
      className={`${
        overlay ? 'fixed top-0 left-0 right-0' : 'sticky top-0'
      } z-50 w-full transition-colors duration-300`}
    >
      <div className="mx-auto max-w-[1360px] px-4 sm:px-8 pt-3 pb-2">
        <div className="flex items-center justify-between gap-4">
          {/* Zona 1: Logo Original */}
          <a
            href="/"
            onClick={(e) => handleLinkClick(e, '/')}
            aria-label="Limiar — Página inicial"
            className="shrink-0 flex items-center py-0.5 focus-visible:rounded-md transition-transform duration-200 hover:scale-[1.02]"
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
                    <motion.span
                      layoutId="limiar-nav-indicator"
                      transition={{ type: 'spring', ...THRESHOLD_SPRING.navIndicator }}
                      aria-hidden="true"
                      className="absolute -bottom-1.5 left-0 right-0 h-[1px] bg-[var(--accent-uv)] opacity-90 shadow-[0_0_8px_var(--accent-uv-glow)]"
                    />
                  )}
                </a>
              );
            })}
          </nav>

          {/* Zona 3: Ações Utilitárias */}
          <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 rounded-full glass-surface shrink-0">
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={onOpenSearch}
              aria-label="Buscar produtos"
              className="inline-flex items-center justify-center w-9 h-9 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
            >
              <Search className="w-4 h-4" aria-hidden="true" />
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={onOpenAccount}
              aria-label={isAuthenticated ? `Minha conta (${member?.name || 'conectada'})` : 'Acessar conta'}
              title={isAuthenticated ? member?.name || 'Minha conta' : 'Acessar conta'}
              className="relative hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
            >
              <User className="w-4 h-4" aria-hidden="true" />
              {isAuthenticated && (
                <span
                  aria-hidden="true"
                  className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--accent-acid)]"
                />
              )}
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.92, rotate: 18 }}
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
              className="inline-flex items-center justify-center w-9 h-9 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Moon className="w-4 h-4" aria-hidden="true" />
              )}
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={openDrawer}
              aria-label={`Abrir carrinho (${totalItems} itens)`}
              className="relative inline-flex items-center justify-center w-9 h-9 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
            >
              <ShoppingBag className="w-4 h-4" aria-hidden="true" />
              <AnimatePresence mode="popLayout">
                {totalItems > 0 && (
                  <motion.span
                    key={totalItems}
                    initial={{ scale: 0.65, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    transition={{ type: 'spring', ...THRESHOLD_SPRING.magnetic }}
                    data-testid="cart-badge"
                    className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--accent-acid)] text-[#080909] text-[10px] font-semibold leading-[18px] text-center tabular-nums"
                  >
                    {totalItems}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
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
            </motion.button>
          </div>
        </div>

        {/* Menu Mobile */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav
              initial={{ opacity: 0, y: -8, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.985 }}
              transition={{ duration: 0.22, ease: THRESHOLD_EASE }}
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
                <span>Minha conta</span>
              </button>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
