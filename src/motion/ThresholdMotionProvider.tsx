import React, { createContext, useContext, useEffect, useRef } from 'react';
import {
  MotionConfig,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  type MotionValue,
} from 'motion/react';
import { THRESHOLD_SPRING, computeNormalizedPointer } from './thresholdConfig';

interface ThresholdPointerContextValue {
  nx: MotionValue<number>;
  ny: MotionValue<number>;
  reducedMotion: boolean;
}

const ThresholdPointerContext = createContext<ThresholdPointerContextValue | null>(null);

export function useThresholdPointer(): ThresholdPointerContextValue {
  const ctx = useContext(ThresholdPointerContext);
  if (!ctx) {
    throw new Error('useThresholdPointer deve ser utilizado dentro de ThresholdMotionProvider');
  }
  return ctx;
}

export function ThresholdMotionProvider({ children }: { children: React.ReactNode }) {
  const prefersReduced = Boolean(useReducedMotion());
  const rawNx = useMotionValue(0);
  const rawNy = useMotionValue(0);
  const nx = useSpring(rawNx, THRESHOLD_SPRING.pointer);
  const ny = useSpring(rawNy, THRESHOLD_SPRING.pointer);

  const auraRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || prefersReduced) {
      rawNx.set(0);
      rawNy.set(0);
      return;
    }

    const isFinePointer = window.matchMedia('(pointer: fine)').matches;
    if (!isFinePointer) return;

    let rafId = 0;
    let latestX = window.innerWidth * 0.5;
    let latestY = window.innerHeight * 0.35;
    let pending = false;

    const flush = () => {
      pending = false;
      const w = window.innerWidth || 1440;
      const h = window.innerHeight || 900;
      const mapped = computeNormalizedPointer(latestX, latestY, {
        left: 0,
        top: 0,
        width: w,
        height: h,
      });

      rawNx.set(mapped.nx);
      rawNy.set(mapped.ny);

      if (auraRef.current) {
        auraRef.current.style.setProperty('--cursor-x', `${mapped.px}px`);
        auraRef.current.style.setProperty('--cursor-y', `${mapped.py}px`);
        auraRef.current.style.opacity = '1';
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      latestX = e.clientX;
      latestY = e.clientY;
      if (!pending) {
        pending = true;
        rafId = window.requestAnimationFrame(flush);
      }
    };

    const handlePointerLeave = () => {
      rawNx.set(0);
      rawNy.set(0);
      if (auraRef.current) {
        auraRef.current.style.opacity = '0';
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('mouseleave', handlePointerLeave);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('mouseleave', handlePointerLeave);
    };
  }, [prefersReduced, rawNx, rawNy]);

  return (
    <MotionConfig reducedMotion="user">
      <ThresholdPointerContext.Provider value={{ nx, ny, reducedMotion: prefersReduced }}>
        {/* Iluminação atmosférica sutil que acompanha o cursor sem poluir o conteúdo */}
        {!prefersReduced && (
          <div
            ref={auraRef}
            aria-hidden="true"
            className="limiar-cursor-aura"
          />
        )}

        {/* Barra de travessia de scroll discreta no topo absoluto */}
        <ThresholdScrollProgress />

        {children}
      </ThresholdPointerContext.Provider>
    </MotionConfig>
  );
}

function ThresholdScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 220,
    damping: 32,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 right-0 h-[1.5px] z-[60] origin-left bg-gradient-to-r from-[var(--accent-uv)] via-[var(--accent-uv-edge)] to-[var(--accent-acid)] opacity-60"
      style={{ scaleX }}
    />
  );
}
