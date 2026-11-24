import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MessageCircle, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useRouter } from '../../context/RouterContext';
import { THRESHOLD_DURATIONS, THRESHOLD_EASE, THRESHOLD_SPRING } from '../../motion/thresholdConfig';
import { getWixIntegrationStatus } from '../../services/wix/wixClient';
import { formatBRL } from '../../utils/validation';
import { buildCartWhatsAppUrl } from '../../utils/whatsapp';
import { ResilientImage } from '../ui/ResilientImage';
import { UltravioletButton } from '../ui/UltravioletButton';

export function CartDrawer() {
  const {
    items,
    subtotal,
    totalItems,
    isDrawerOpen,
    closeDrawer,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();
  const { navigate } = useRouter();
  const wixStatus = getWixIntegrationStatus();

  useEffect(() => {
    if (!isDrawerOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isDrawerOpen, closeDrawer]);

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          {/* Backdrop */}
          <motion.button
            type="button"
            aria-label="Fechar carrinho"
            onClick={closeDrawer}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24, ease: THRESHOLD_EASE }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer Panel */}
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Seu carrinho"
            initial={{ x: '100%', opacity: 0.8 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.85 }}
            transition={{
              duration: THRESHOLD_DURATIONS.drawer,
              ease: THRESHOLD_EASE,
            }}
            className="relative z-10 w-full max-w-md h-full glass-surface-strong border-l border-[var(--border-hairline)] flex flex-col justify-between p-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-5 border-b border-[var(--border-hairline)]">
              <div className="flex items-center gap-3">
                <h2 className="font-display text-sm uppercase tracking-[0.18em] font-semibold text-[var(--text-primary)]">
                  Seu Carrinho
                </h2>
                <span className="text-xs text-[var(--text-muted)] tabular-nums">
                  ({totalItems})
                </span>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                aria-label="Fechar painel do carrinho"
                className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto py-5 space-y-4">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-4 py-12 space-y-4">
                  <div className="w-14 h-14 rounded-full border border-[var(--border-hairline)] flex items-center justify-center text-[var(--text-muted)]">
                    <ShoppingBag className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <div className="space-y-1.5">
                    <p className="font-display text-base text-[var(--text-primary)]">
                      Seu carrinho está vazio
                    </p>
                    <p className="text-sm text-[var(--text-muted)] max-w-xs">
                      Explore as peças da coleção para montar sua seleção.
                    </p>
                  </div>
                  <UltravioletButton
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      closeDrawer();
                      navigate('/loja');
                    }}
                  >
                    Explorar coleção
                  </UltravioletButton>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {items.map((item) => (
                    <motion.div
                      key={item.lineId}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 24, transition: { duration: 0.18 } }}
                      transition={{ type: 'spring', ...THRESHOLD_SPRING.drawer }}
                      className="flex gap-4 p-3 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)]"
                    >
                      <a
                        href={`/produto/${item.slug}`}
                        onClick={(e) => {
                          e.preventDefault();
                          closeDrawer();
                          navigate(`/produto/${item.slug}`);
                        }}
                        className="w-20 h-24 rounded-xl overflow-hidden bg-[var(--bg-card-media)] shrink-0"
                      >
                        <ResilientImage
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </a>

                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <a
                              href={`/produto/${item.slug}`}
                              onClick={(e) => {
                                e.preventDefault();
                                closeDrawer();
                                navigate(`/produto/${item.slug}`);
                              }}
                              className="block font-display text-sm font-medium uppercase tracking-[0.04em] text-[var(--text-primary)] truncate"
                            >
                              {item.name}
                            </a>
                            <p className="text-xs text-[var(--text-muted)] mt-0.5">
                              Tam. {item.size} · {item.colorName}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.lineId)}
                            aria-label={`Remover ${item.name} do carrinho`}
                            className="text-[var(--text-muted)] hover:text-[var(--accent-terracotta)] p-1 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <div className="inline-flex items-center rounded-full border border-[var(--border-hairline)] bg-[var(--bg-glass)]">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.lineId, item.quantity - 1)}
                              aria-label={`Diminuir quantidade de ${item.name}`}
                              className="w-7 h-7 inline-flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            >
                              <Minus className="w-3 h-3" aria-hidden="true" />
                            </button>
                            <span
                              data-testid={`qty-${item.slug}`}
                              className="w-7 text-center text-xs font-medium tabular-nums text-[var(--text-primary)]"
                            >
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.lineId, item.quantity + 1)}
                              aria-label={`Aumentar quantidade de ${item.name}`}
                              className="w-7 h-7 inline-flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            >
                              <Plus className="w-3 h-3" aria-hidden="true" />
                            </button>
                          </div>

                          <span className="text-sm font-medium text-[var(--text-primary)] tabular-nums">
                            {formatBRL(item.price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Footer / Checkout */}
            {items.length > 0 && (
              <div className="pt-5 border-t border-[var(--border-hairline)] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    Subtotal
                  </span>
                  <span
                    data-testid="cart-subtotal"
                    className="font-display text-lg font-semibold text-[var(--text-primary)] tabular-nums"
                  >
                    {formatBRL(subtotal)}
                  </span>
                </div>

                {!wixStatus.checkoutEnabled && (
                  <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 text-xs text-[var(--text-secondary)] space-y-1.5">
                    <div className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
                      <MessageCircle className="w-3.5 h-3.5 text-[var(--accent-acid)] shrink-0" aria-hidden="true" />
                      <span>Pedido direto pelo WhatsApp</span>
                    </div>
                    <p className="text-[var(--text-muted)] leading-relaxed">
                      Finalize sua seleção diretamente com nossa equipe pelo WhatsApp com os itens e tamanhos já organizados.
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  {wixStatus.checkoutEnabled ? (
                    <UltravioletButton variant="primary" size="md" className="flex-1">
                      Finalizar compra
                    </UltravioletButton>
                  ) : (
                    <UltravioletButton
                      href={buildCartWhatsAppUrl(items, formatBRL(subtotal))}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="primary"
                      size="md"
                      icon={<MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />}
                      className="flex-1"
                    >
                      Finalizar no WhatsApp
                    </UltravioletButton>
                  )}
                  <button
                    type="button"
                    onClick={clearCart}
                    className="py-3 px-4 rounded-full border border-[var(--border-hairline)] text-xs uppercase tracking-[0.12em] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors"
                  >
                    Limpar
                  </button>
                </div>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
