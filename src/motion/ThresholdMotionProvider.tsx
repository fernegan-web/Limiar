import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import {
  MotionConfig,
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  type MotionValue,
} from 'motion/react';
import {
  notifyPhysicsScroll,
  setLenisInstance,
  subscribePhysicsWake,
} from './scrollPhysics';
import { initPerformanceRuntime } from '../performance/performanceRuntime';
import { THRESHOLD_SPRING, computeNormalizedPointer } from './thresholdConfig';

interface ThresholdPointerContextValue {
  nx: MotionValue<number>;
  ny: MotionValue<number>;
  reducedMotion: boolean;
  portalRevealed: boolean;
  markPortalRevealed: () => void;
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
  const [portalRevealed, setPortalRevealed] = useState(false);
  const lenisRef = useRef<Lenis | null>(null);

  const markPortalRevealed = useCallback(() => {
    setPortalRevealed(true);
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('limiar-intro-holding');
    }
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const shouldHold = !portalRevealed;
    document.documentElement.classList.toggle('limiar-intro-holding', shouldHold);
    return () => {
      document.documentElement.classList.remove('limiar-intro-holding');
    };
  }, [portalRevealed]);

  // Motor global de inércia para wheel/trackpad (preserva 100% o touch nativo no mobile)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    initPerformanceRuntime();

    const lenis = new Lenis({
      smoothWheel: true,
      syncTouch: false,
      lerp: 0.088,
      wheelMultiplier: 0.84,
      autoRaf: false,
      respectReducedMotion: true,
    });

    lenisRef.current = lenis;
    setLenisInstance(lenis);

    const syncStopState = () => {
      const lockedByOverlay = document.documentElement.dataset.scrollLocked === 'true';
      const lockedByIntro = document.documentElement.classList.contains('limiar-intro-holding');
      if (lockedByOverlay || lockedByIntro) {
        lenis.stop();
      } else {
        lenis.start();
      }
    };

    syncStopState();

    let lastNotifiedY = -1;
    const emitIfChanged = (y: number) => {
      if (Math.abs(y - lastNotifiedY) > 0.01) {
        lastNotifiedY = y;
        notifyPhysicsScroll();
      }
    };

    const unsubLenisScroll = lenis.on('scroll', (instance) => {
      emitIfChanged(instance.scroll);
    });

    let rafId = 0;
    let idleTicks = 0;

    const tick = (now: number) => {
      rafId = 0;
      if (document.visibilityState === 'hidden') {
        idleTicks = 0;
        return;
      }
      lenis.raf(now);
      if (lenis.isScrolling) {
        idleTicks = 0;
        rafId = window.requestAnimationFrame(tick);
      } else if (idleTicks < 2) {
        idleTicks += 1;
        rafId = window.requestAnimationFrame(tick);
      } else {
        idleTicks = 0;
      }
    };

    const wakeLenisLoop = () => {
      if (document.visibilityState === 'hidden') return;
      idleTicks = 0;
      if (!rafId) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    // Fallback para scroll nativo tátil no mobile quando syncTouch está desativado
    const handleNativeScroll = () => {
      if (!lenis.isScrolling) {
        emitIfChanged(window.scrollY);
      }
    };
    const handleWheelWake = () => {
      wakeLenisLoop();
    };
    const unsubPhysicsWake = subscribePhysicsWake(wakeLenisLoop);

    window.addEventListener('scroll', handleNativeScroll, { passive: true });
    window.addEventListener('wheel', handleWheelWake, { passive: true });
    window.addEventListener('keydown', handleWheelWake, { passive: true });

    const observer = new MutationObserver(() => {
      syncStopState();
      wakeLenisLoop();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-scroll-locked'],
    });

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      observer.disconnect();
      unsubLenisScroll();
      unsubPhysicsWake();
      window.removeEventListener('scroll', handleNativeScroll);
      window.removeEventListener('wheel', handleWheelWake);
      window.removeEventListener('keydown', handleWheelWake);
      setLenisInstance(null);
      lenisRef.current = null;
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    if (!lenisRef.current || typeof document === 'undefined') return;
    const lockedByOverlay = document.documentElement.dataset.scrollLocked === 'true';
    if (!portalRevealed || lockedByOverlay) {
      lenisRef.current.stop();
    } else {
      lenisRef.current.start();
    }
  }, [portalRevealed]);

  const rawNx = useMotionValue(0);
  const rawNy = useMotionValue(0);
  const nx = useSpring(rawNx, THRESHOLD_SPRING.pointer);
  const ny = useSpring(rawNy, THRESHOLD_SPRING.pointer);

  const auraRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
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
  }, [rawNx, rawNy]);

  return (
    <MotionConfig reducedMotion="never">
      <ThresholdPointerContext.Provider
        value={{
          nx,
          ny,
          reducedMotion: false,
          portalRevealed,
          markPortalRevealed,
        }}
      >
        {/* Iluminação atmosférica sutil que acompanha o cursor sem poluir o conteúdo */}
        <div
          ref={auraRef}
          aria-hidden="true"
          className="limiar-cursor-aura"
        />

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
