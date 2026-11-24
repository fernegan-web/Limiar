import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { User, X } from 'lucide-react';
import { THRESHOLD_EASE } from '../../motion/thresholdConfig';
import { getWixIntegrationStatus } from '../../services/wix/wixClient';

interface AccountModalProps {
  open: boolean;
  onClose: () => void;
}

export function AccountModal({ open, onClose }: AccountModalProps) {
  const status = getWixIntegrationStatus();

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center px-4">
          <motion.button
            type="button"
            aria-label="Fechar painel de conta"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: THRESHOLD_EASE }}
            className="fixed inset-0 bg-black/65 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Conta de visitante Limiar"
            initial={{ opacity: 0, y: 12, scale: 0.97, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 8, scale: 0.98, filter: 'blur(4px)' }}
            transition={{ duration: 0.26, ease: THRESHOLD_EASE }}
            className="relative z-10 w-full max-w-md glass-surface-strong rounded-[24px] p-6 space-y-5"
          >
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-hairline)]">
              <div className="flex items-center gap-2.5">
                <User className="w-4 h-4 text-[var(--accent-uv)]" aria-hidden="true" />
                <h2 className="font-display text-sm uppercase tracking-[0.18em] font-semibold text-[var(--text-primary)]">
                  Conta de Visitante
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar modal de conta"
                className="w-8 h-8 rounded-full inline-flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-3 text-sm text-[var(--text-secondary)] leading-relaxed">
              <p>
                A autenticação de clientes e visitantes será conectada diretamente ao{' '}
                <strong className="font-medium text-[var(--text-primary)]">
                  Wix Headless (OAuth Visitor / Member Auth)
                </strong>
                .
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {status.configured
                  ? 'Cliente Wix ativo para autenticação de visitantes.'
                  : 'Nenhuma conta simulada é exibida nesta fase: configure VITE_WIX_CLIENT_ID na Fase 02 para habilitar histórico de pedidos e sessões reais.'}
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-full border border-[var(--border-strong)] text-xs uppercase tracking-[0.16em] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
