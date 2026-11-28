import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { useConsent } from '../../context/ConsentContext';
import { useThresholdPointer } from '../../motion/ThresholdMotionProvider';
import { THRESHOLD_EASE } from '../../motion/thresholdConfig';

export function ConsentBanner() {
  const { hasInteracted, acceptAll, rejectNonEssential, openPreferencesModal } = useConsent();
  const { portalRevealed, reducedMotion } = useThresholdPointer();

  const visible = portalRevealed && !hasInteracted;

  return (
    <AnimatePresence>
      {visible && (
        <motion.aside
          role="region"
          aria-label="Preferências de cookies e privacidade"
          data-testid="consent-banner"
          initial={reducedMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.28, ease: THRESHOLD_EASE }}
          className="fixed bottom-[72px] left-3 right-3 sm:bottom-6 sm:left-6 sm:right-auto sm:max-w-[430px] z-[58] bg-[var(--bg-elevated)] md:bg-[var(--bg-glass-strong)] md:backdrop-blur-2xl rounded-[20px] border border-[var(--border-strong)] p-3.5 sm:p-4 shadow-[0_18px_46px_-16px_rgba(0,0,0,0.45)]"
        >
          <div className="space-y-2.5">
            <div className="flex items-start gap-2.5">
              <ShieldCheck
                className="w-4 h-4 text-[var(--accent-uv)] shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div className="space-y-1 min-w-0">
                <p className="font-display text-[11px] uppercase tracking-[0.16em] font-medium text-[var(--text-primary)]">
                  Privacidade &amp; Cookies (LGPD)
                </p>
                <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] leading-relaxed">
                  Utilizamos cookies essenciais para o carrinho e sua conta. Personalização, métricas e publicidade dependem da sua escolha.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={acceptAll}
                data-testid="consent-accept-all"
                className="px-3.5 py-1.5 rounded-full bg-[var(--text-primary)] text-[var(--text-inverse)] text-[11px] uppercase tracking-[0.12em] font-medium hover:opacity-90 transition-opacity"
              >
                Aceitar tudo
              </button>
              <button
                type="button"
                onClick={rejectNonEssential}
                data-testid="consent-reject-non-essential"
                className="px-3 py-1.5 rounded-full border border-[var(--border-strong)] text-[11px] uppercase tracking-[0.12em] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
              >
                Recusar não essenciais
              </button>
              <button
                type="button"
                onClick={openPreferencesModal}
                data-testid="consent-customize"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)] hover:text-[var(--text-primary)] underline underline-offset-4 transition-colors"
              >
                <SlidersHorizontal className="w-3 h-3" aria-hidden="true" />
                <span>Personalizar</span>
              </button>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
