import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useThresholdPointer } from './ThresholdMotionProvider';
import { THRESHOLD_DURATIONS, THRESHOLD_EASE, THRESHOLD_EASE_PORTAL } from './thresholdConfig';

interface PortalRouteTransitionProps {
  routeKey: string;
  children: React.ReactNode;
  onTransitionScroll?: () => void;
}

/**
 * Transição cinematográfica "Atravessar o Limiar" entre páginas.
 * - Primeira montagem: sem véu bloqueante (first-paint imediato).
 * - Navegações subsequentes: recuo sutil + emergência com blur suave e pulso ultravioleta discreto.
 */
export function PortalRouteTransition({
  routeKey,
  children,
  onTransitionScroll,
}: PortalRouteTransitionProps) {
  const { reducedMotion } = useThresholdPointer();
  const isFirstMount = useRef(true);
  const [pulseId, setPulseId] = useState(0);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (!reducedMotion) {
      setPulseId((n) => n + 1);
    }
  }, [routeKey, reducedMotion]);

  return (
    <>
      {/* Pulso discreto de singularidade no limiar superior durante trocas de rota */}
      <AnimatePresence>
        {pulseId > 0 && !reducedMotion && (
          <motion.div
            key={`portal-pulse-${pulseId}`}
            aria-hidden="true"
            initial={{ opacity: 0.48, scaleX: 0.2 }}
            animate={{ opacity: 0, scaleX: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: THRESHOLD_EASE_PORTAL }}
            className="pointer-events-none fixed top-0 inset-x-0 h-[2px] z-[65] origin-center bg-gradient-to-r from-transparent via-[var(--accent-uv)] to-transparent"
          />
        )}
      </AnimatePresence>

      <AnimatePresence
        mode="wait"
        initial={false}
        onExitComplete={() => {
          onTransitionScroll?.();
        }}
      >
        <motion.div
          key={routeKey}
          initial={
            reducedMotion
              ? { opacity: 0 }
              : { opacity: 0, y: 12, scale: 0.996, filter: 'blur(5px)' }
          }
          animate={
            reducedMotion
              ? { opacity: 1 }
              : { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }
          }
          exit={
            reducedMotion
              ? { opacity: 0 }
              : { opacity: 0, y: -8, scale: 0.994, filter: 'blur(4px)' }
          }
          transition={{
            duration: reducedMotion ? 0.14 : THRESHOLD_DURATIONS.portalEnter,
            ease: THRESHOLD_EASE,
          }}
          className="w-full"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </>
  );
}
