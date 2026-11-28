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
  isNativeScrollOnly,
  notifyPhysicsScroll,
  setLenisInstance,
  supportsCssScrollDrivenAnimations,
} from './scrollPhysics';
import {
  INTRO_SEEN_SESSION_KEY,
  SINGULARITY_INTRO_DURATION_MS,
  SINGULARITY_INTRO_FAILSAFE_MS,
  computeSingularityIntroFrame,
  shouldPlaySingularityIntro,
  type SingularityIntroFrame,
} from './singularityIntroTimeline';
import { THRESHOLD_SPRING, computeNormalizedPointer } from './thresholdConfig';

export type IntroTickListener = (frame: SingularityIntroFrame, dtSec: number) => void;

interface ThresholdPointerContextValue {
  nx: MotionValue<number>;
  ny: MotionValue<number>;
  reducedMotion: boolean;
  introActive: boolean;
  introEngineActive: boolean;
  portalRevealed: boolean;
  markPortalRevealed: () => void;
  subscribeIntroTick: (listener: IntroTickListener) => () => void;
  getLatestIntroFrame: () => SingularityIntroFrame;
}

const ThresholdPointerContext = createContext<ThresholdPointerContextValue | null>(null);

export function useThresholdPointer(): ThresholdPointerContextValue {
  const ctx = useContext(ThresholdPointerContext);
  if (!ctx) {
    throw new Error('useThresholdPointer deve ser utilizado dentro de ThresholdMotionProvider');
  }
  return ctx;
}

function readInitialIntroActive(): boolean {
  if (typeof window === 'undefined') return false;
  let sessionSeen = false;
  try {
    sessionSeen = window.sessionStorage.getItem(INTRO_SEEN_SESSION_KEY) === '1';
  } catch {
    sessionSeen = false;
  }
  const reducedMotion =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  return shouldPlaySingularityIntro({
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
    reducedMotion,
    sessionSeen,
  });
}

function markIntroSeenSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(INTRO_SEEN_SESSION_KEY, '1');
  } catch {
    // noop
  }
}

export function ThresholdMotionProvider({ children }: { children: React.ReactNode }) {
  const [introActive, setIntroActive] = useState<boolean>(() => readInitialIntroActive());
  const [introEngineActive, setIntroEngineActive] = useState<boolean>(() => !readInitialIntroActive());
  const [portalRevealed, setPortalRevealed] = useState<boolean>(() => !readInitialIntroActive());
  const [nativeScrollOnly, setNativeScrollOnly] = useState<boolean>(() =>
    isNativeScrollOnly()
  );
  const lenisRef = useRef<Lenis | null>(null);
  const introListenersRef = useRef<Set<IntroTickListener>>(new Set());
  const introActiveRef = useRef(introActive);
  introActiveRef.current = introActive;

  const latestIntroFrameRef = useRef<SingularityIntroFrame>(
    computeSingularityIntroFrame(
      introActive ? 0 : SINGULARITY_INTRO_DURATION_MS,
      nativeScrollOnly
    )
  );

  const subscribeIntroTick = useCallback((listener: IntroTickListener) => {
    introListenersRef.current.add(listener);
    return () => {
      introListenersRef.current.delete(listener);
    };
  }, []);

  const getLatestIntroFrame = useCallback(() => latestIntroFrameRef.current, []);

  const markPortalRevealed = useCallback(() => {
    markIntroSeenSession();
    const wasActive = introActiveRef.current;
    const isMob = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
    const finalFrame = computeSingularityIntroFrame(SINGULARITY_INTRO_DURATION_MS, isMob);
    latestIntroFrameRef.current = finalFrame;

    if (wasActive) {
      introListenersRef.current.forEach((listener) => {
        listener(finalFrame, 0);
      });
    }

    introActiveRef.current = false;
    setIntroActive(false);
    setIntroEngineActive(true);
    setPortalRevealed(true);

    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('limiar-intro-holding');
      document.documentElement.dataset.introPhase = 'complete';
    }
    if (wasActive && typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
      const activeLenis = lenisRef.current;
      if (activeLenis) {
        activeLenis.scrollTo(0, { immediate: true, force: true });
        (activeLenis as unknown as { velocity: number; lastVelocity: number }).velocity = 0;
        (activeLenis as unknown as { velocity: number; lastVelocity: number }).lastVelocity = 0;
      }
    }
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const shouldHold = introActive && !portalRevealed;
    document.documentElement.classList.toggle('limiar-intro-holding', shouldHold);
    if (!shouldHold) {
      document.documentElement.dataset.introPhase = 'complete';
    }
    return () => {
      document.documentElement.classList.remove('limiar-intro-holding');
    };
  }, [introActive, portalRevealed]);

  // Orquestração unificada da abertura (~5s) com bloqueio de scroll e skip intencional seguro
  useEffect(() => {
    if (typeof window === 'undefined' || !introActive) return;

    window.scrollTo({ top: 0, behavior: 'auto' });
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    let rafId = 0;
    let finished = false;
    let startTime = 0;
    let lastFrameTime = 0;
    let engineWoken = false;

    const finishIntro = () => {
      if (finished) return;
      finished = true;
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      markPortalRevealed();
    };

    const emitFrame = (elapsedMs: number, dtSec: number) => {
      const isMob = window.innerWidth < 768 || isNativeScrollOnly();
      const frame = computeSingularityIntroFrame(elapsedMs, isMob);
      latestIntroFrameRef.current = frame;
      document.documentElement.dataset.introPhase = frame.phase;

      if (frame.engineActive && !engineWoken) {
        engineWoken = true;
        setIntroEngineActive(true);
      }

      introListenersRef.current.forEach((listener) => {
        listener(frame, dtSec);
      });

      if (frame.finished) {
        finishIntro();
      }
    };

    // Estado inicial exato (t = 0ms -> O Vazio)
    emitFrame(0, 0);

    const tick = (now: number) => {
      if (finished) return;
      if (!startTime) {
        startTime = now;
        lastFrameTime = now;
      }
      const elapsedMs = now - startTime;
      const dtSec = Math.min(Math.max((now - lastFrameTime) / 1000, 0), 0.05);
      lastFrameTime = now;

      emitFrame(elapsedMs, dtSec);

      if (!finished && elapsedMs < SINGULARITY_INTRO_DURATION_MS) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    rafId = window.requestAnimationFrame(tick);
    const failsafeId = window.setTimeout(finishIntro, SINGULARITY_INTRO_FAILSAFE_MS);

    // Bloqueia wheel/touchmove durante a intro para não acumular gestos de scroll para a travessia
    const preventWheel = (e: WheelEvent) => {
      if (e.cancelable) e.preventDefault();
    };
    const preventTouchScroll = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
    };

    // Permite ignorar a intro por interação intencional (teclado ou clique/toque curto, sem UI extra)
    let pointerDownX = 0;
    let pointerDownY = 0;
    let pointerDownActive = false;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      pointerDownActive = true;
      pointerDownX = e.clientX;
      pointerDownY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!pointerDownActive) return;
      pointerDownActive = false;
      const dist = Math.hypot(e.clientX - pointerDownX, e.clientY - pointerDownY);
      if (dist < 10) {
        finishIntro();
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        if (e.key === ' ') e.preventDefault();
        finishIntro();
      }
    };

    window.addEventListener('wheel', preventWheel, { passive: false });
    window.addEventListener('touchmove', preventTouchScroll, { passive: false });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('keydown', onKeyDown);

    return () => {
      finished = true;
      if (rafId) window.cancelAnimationFrame(rafId);
      window.clearTimeout(failsafeId);
      window.removeEventListener('wheel', preventWheel);
      window.removeEventListener('touchmove', preventTouchScroll);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, [introActive, markPortalRevealed]);

  // Monitora alterações de viewport/ponteiro (rotação, troca de modo ou emulador)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncEnvironment = () => {
      const next = isNativeScrollOnly();
      setNativeScrollOnly((prev) => (prev === next ? prev : next));
    };

    syncEnvironment();
    window.addEventListener('resize', syncEnvironment, { passive: true });

    const queries = ['(pointer: fine)', '(pointer: coarse)', '(hover: none)']
      .map((query) =>
        typeof window.matchMedia === 'function' ? window.matchMedia(query) : null
      )
      .filter((mql): mql is MediaQueryList => mql !== null);

    queries.forEach((mql) => mql.addEventListener('change', syncEnvironment));

    return () => {
      window.removeEventListener('resize', syncEnvironment);
      queries.forEach((mql) => mql.removeEventListener('change', syncEnvironment));
    };
  }, []);

  // Desktop: motor global Lenis para wheel/trackpad.
  // Mobile/Touch: exclusivamente scroll nativo do navegador (zero Lenis, zero RAF extra).
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (nativeScrollOnly) {
      setLenisInstance(null);
      lenisRef.current = null;

      let lastNotifiedY = Number.NaN;
      const handleNativeScroll = () => {
        const y = window.scrollY;
        if (Number.isNaN(lastNotifiedY) || Math.abs(y - lastNotifiedY) > 0.01) {
          lastNotifiedY = y;
          notifyPhysicsScroll();
        }
      };

      const handleNativeScrollEndOrShow = () => {
        lastNotifiedY = window.scrollY;
        notifyPhysicsScroll();
      };

      window.addEventListener('scroll', handleNativeScroll, { passive: true });
      window.addEventListener('scrollend', handleNativeScrollEndOrShow, { passive: true });
      window.addEventListener('pageshow', handleNativeScrollEndOrShow, { passive: true });
      return () => {
        window.removeEventListener('scroll', handleNativeScroll);
        window.removeEventListener('scrollend', handleNativeScrollEndOrShow);
        window.removeEventListener('pageshow', handleNativeScrollEndOrShow);
      };
    }

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

    // Fallback para eventos nativos ocasionais enquanto Lenis não está em curso
    const handleNativeScroll = () => {
      if (!lenis.isScrolling) {
        emitIfChanged(window.scrollY);
      }
    };
    window.addEventListener('scroll', handleNativeScroll, { passive: true });

    let rafId = 0;
    const tick = (now: number) => {
      if (document.visibilityState !== 'hidden') {
        lenis.raf(now);
      }
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);

    const observer = new MutationObserver(syncStopState);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-scroll-locked'],
    });

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      observer.disconnect();
      unsubLenisScroll();
      window.removeEventListener('scroll', handleNativeScroll);
      setLenisInstance(null);
      lenisRef.current = null;
      lenis.destroy();
    };
  }, [nativeScrollOnly]);

  const prevPortalRevealedRef = useRef(portalRevealed);

  useEffect(() => {
    const wasRevealed = prevPortalRevealedRef.current;
    prevPortalRevealedRef.current = portalRevealed;

    if (nativeScrollOnly || !lenisRef.current || typeof document === 'undefined') return;
    const lockedByOverlay = document.documentElement.dataset.scrollLocked === 'true';
    if (!portalRevealed || lockedByOverlay) {
      lenisRef.current.stop();
    } else {
      if (!wasRevealed) {
        lenisRef.current.scrollTo(0, { immediate: true, force: true });
        (lenisRef.current as unknown as { velocity: number; lastVelocity: number }).velocity = 0;
        (lenisRef.current as unknown as { velocity: number; lastVelocity: number }).lastVelocity = 0;
      }
      lenisRef.current.start();
    }
  }, [portalRevealed, nativeScrollOnly]);

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
    if (nativeScrollOnly || !isFinePointer) {
      rawNx.set(0);
      rawNy.set(0);
      if (auraRef.current) {
        auraRef.current.style.opacity = '0';
      }
      return;
    }

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
        auraRef.current.style.opacity = introActiveRef.current ? '0' : '1';
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
  }, [rawNx, rawNy, nativeScrollOnly]);

  return (
    <MotionConfig reducedMotion="never">
      <ThresholdPointerContext.Provider
        value={{
          nx,
          ny,
          reducedMotion: false,
          introActive,
          introEngineActive,
          portalRevealed,
          markPortalRevealed,
          subscribeIntroTick,
          getLatestIntroFrame,
        }}
      >
        {/* Iluminação atmosférica sutil que acompanha o cursor sem poluir o conteúdo */}
        <div
          ref={auraRef}
          aria-hidden="true"
          className="limiar-cursor-aura"
        />

        {/* Barra de travessia de scroll discreta no topo absoluto */}
        {!introActive && <ThresholdScrollProgress nativeScrollOnly={nativeScrollOnly} />}

        {children}
      </ThresholdPointerContext.Provider>
    </MotionConfig>
  );
}

function ThresholdScrollProgress({ nativeScrollOnly }: { nativeScrollOnly: boolean }) {
  if (nativeScrollOnly && supportsCssScrollDrivenAnimations()) {
    return (
      <div
        aria-hidden="true"
        className="limiar-mob-scroll-progress pointer-events-none fixed top-0 left-0 right-0 h-[1.5px] z-[60] origin-left bg-gradient-to-r from-[var(--accent-uv)] via-[var(--accent-uv-edge)] to-[var(--accent-acid)] opacity-60"
      />
    );
  }

  return <ThresholdScrollProgressJs nativeScrollOnly={nativeScrollOnly} />;
}

function ThresholdScrollProgressJs({ nativeScrollOnly }: { nativeScrollOnly: boolean }) {
  const { scrollYProgress } = useScroll();
  const sprungScaleX = useSpring(scrollYProgress, {
    stiffness: 220,
    damping: 32,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 right-0 h-[1.5px] z-[60] origin-left bg-gradient-to-r from-[var(--accent-uv)] via-[var(--accent-uv-edge)] to-[var(--accent-acid)] opacity-60"
      style={{ scaleX: nativeScrollOnly ? scrollYProgress : sprungScaleX }}
    />
  );
}
