import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MessageCircle } from 'lucide-react';
import { useThresholdPointer } from '../../motion/ThresholdMotionProvider';
import { THRESHOLD_EASE } from '../../motion/thresholdConfig';
import { buildContactWhatsAppUrl } from '../../utils/whatsapp';

interface WhatsAppFloatingButtonProps {
  hidden?: boolean;
}

/**
 * Botão flutuante discreto de atendimento WhatsApp Business:
 * - Segue glassmorphism Organic Dark Tech adaptado aos dois temas.
 * - Oculto durante a intro cinematográfica e quando modais/drawers estão abertos.
 * - Compacto em mobile e com microinterações suaves em desktop.
 */
export function WhatsAppFloatingButton({ hidden = false }: WhatsAppFloatingButtonProps) {
  const { portalRevealed, reducedMotion } = useThresholdPointer();
  const visible = portalRevealed && !hidden;

  return (
    <AnimatePresence>
      {visible && (
        <motion.a
          href={buildContactWhatsAppUrl()}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Falar com Limiar no WhatsApp"
          data-testid="whatsapp-floating-btn"
          initial={reducedMotion ? false : { opacity: 0, y: 12, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.96 }}
          transition={{ duration: 0.28, ease: THRESHOLD_EASE }}
          whileHover={reducedMotion ? undefined : { y: -2 }}
          whileTap={reducedMotion ? undefined : { scale: 0.96 }}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[45] group inline-flex items-center gap-2.5 h-11 px-3 sm:px-4 rounded-full glass-surface-strong border border-[var(--border-strong)] hover:border-[var(--accent-uv-edge)] shadow-[0_12px_30px_-10px_rgba(0,0,0,0.28)] hover:shadow-[0_14px_34px_-12px_var(--accent-uv-glow)] transition-all duration-300"
        >
          <span className="relative inline-flex items-center justify-center w-6 h-6 rounded-full border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--accent-acid)] group-hover:border-[var(--accent-acid)]/50 transition-colors">
            <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
          </span>
          <span className="hidden sm:inline text-[11px] uppercase tracking-[0.16em] font-medium text-[var(--text-primary)] whitespace-nowrap">
            WhatsApp
          </span>
        </motion.a>
      )}
    </AnimatePresence>
  );
}
