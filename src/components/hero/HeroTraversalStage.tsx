import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useMotionValue } from 'motion/react';
import { useRouter } from '../../context/RouterContext';
import {
  computeElementCollapse,
  computeSingularityFrame,
  smootherstep,
  type CollapseVectorConfig,
} from '../../motion/gravitationalTimeline';
import {
  CinematicProgressDamper,
  HERO_TRAVERSAL_DAMPER_CONFIG,
  TRAVERSAL_HANDOFF_PROGRESS,
  canUnlockFreeNavigation,
  computeDeterministicTraversalProgress,
  computeTraversalSpanPx,
  getEffectiveScrollY,
  getLenisInstance,
  isNativeScrollOnly,
  mapUnitProgressToTimeline,
  notifyPhysicsScroll,
  setGlobalTraversalPhase,
  setGlobalTraversalReleaseScrollY,
  setGlobalTraversalSpanPx,
  shouldAcceptMobileViewportHeightUpdate,
  subscribePhysicsScroll,
  supportsCssScrollTimeline,
  type TraversalPhase,
} from '../../motion/scrollPhysics';
import {
  computeFlipOffset,
  computeSyncedCssSpinDelaySec,
  type SingularityIntroFrame,
} from '../../motion/singularityIntroTimeline';
import { useThresholdPointer } from '../../motion/ThresholdMotionProvider';
import { ThresholdMagnetic } from '../../motion/ThresholdPrimitives';
import type { Collection } from '../../types/commerce';
import {
  CollectionsRevealSection,
  type CollectionsRevealDirection,
} from '../collections/CollectionsRevealSection';
import { EclipseSigil, LimiarStar } from '../ornaments/CybersigilismOrnaments';
import { UltravioletButton } from '../ui/UltravioletButton';
import { HeroThresholdComposition } from './HeroThresholdComposition';

export interface HeroSlideData {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  image: string;
  imageAlt: string;
}

interface HeroTraversalStageProps {
  slide: HeroSlideData;
  activeSlideIndex: number;
  totalSlides: number;
  collections: Collection[];
  onViewAllProducts: () => void;
  onFreeNavigationChange?: (unlocked: boolean) => void;
  postCollectionsContent?: React.ReactNode;
}

interface MeasuredBox {
  centerX: number;
  centerY: number;
}

const HOME_UNLOCKED_SESSION_KEY = 'limiar_home_unlocked_v1';
const VOID_VEIL_EXIT_MS = 420;
const VOID_VEIL_REVERSE_RATE = -2.4;
const INERTIA_SETTLE_MS = 150;
const REVEAL_WATCHDOG_MS = 2400;

function readInitialHomeUnlocked(isPopStateReturn: boolean): boolean {
  if (typeof window === 'undefined') return false;
  if (window.location.hash === '#todos-os-produtos') return true;
  if (!isPopStateReturn) return false;
  try {
    if (window.sessionStorage.getItem(HOME_UNLOCKED_SESSION_KEY) === '1') {
      return true;
    }
  } catch {
    // noop
  }
  return window.scrollY > 24;
}

function writeHomeUnlockedSession(unlocked: boolean) {
  if (typeof window === 'undefined') return;
  try {
    if (unlocked) {
      window.sessionStorage.setItem(HOME_UNLOCKED_SESSION_KEY, '1');
    } else {
      window.sessionStorage.removeItem(HOME_UNLOCKED_SESSION_KEY);
    }
  } catch {
    // noop
  }
}

function measureElementCenter(
  node: HTMLElement | null,
  parentRect: DOMRect | undefined
): MeasuredBox | null {
  if (!node || !parentRect) return null;
  return {
    centerX: parentRect.left + node.offsetLeft + node.offsetWidth * 0.5,
    centerY: parentRect.top + node.offsetTop + node.offsetHeight * 0.5,
  };
}

function pullFromMeasured(
  measured: MeasuredBox | null,
  targetX: number,
  targetY: number,
  pullFactor: number
): { pullX: number; pullY: number } {
  if (!measured) return { pullX: 0, pullY: 0 };
  return {
    pullX: (targetX - measured.centerX) * pullFactor,
    pullY: (targetY - measured.centerY) * pullFactor,
  };
}

function applyCollapseStyle(
  node: HTMLElement | null,
  progress: number,
  config: CollapseVectorConfig,
  enableSvgWarpFilter = false,
  svgFilterUrl?: string
) {
  if (!node) return;
  const st = computeElementCollapse(progress, config);
  node.style.opacity = String(st.opacity);
  node.style.transform = `translate3d(${st.x}px, ${st.y}px, 0) scale(${st.scale * st.scaleX}, ${st.scale * st.scaleY}) skewX(${st.skewXDeg}deg) rotate(${st.rotateDeg}deg)`;
  const blurFilter = st.blurPx > 0.1 ? `blur(${st.blurPx}px)` : '';
  const warpFilter =
    enableSvgWarpFilter && svgFilterUrl && progress > 0.24 && progress < 0.7
      ? ` url(${svgFilterUrl})`
      : '';
  node.style.filter = `${blurFilter}${warpFilter}`.trim() || 'none';
  node.style.pointerEvents = st.pointerInteractive ? 'auto' : 'none';
}

export function HeroTraversalStage({
  slide,
  activeSlideIndex,
  totalSlides,
  collections,
  onViewAllProducts,
  onFreeNavigationChange,
  postCollectionsContent,
}: HeroTraversalStageProps) {
  const { isPopStateReturn } = useRouter();
  const {
    introActive,
    portalRevealed,
    markPortalRevealed,
    subscribeIntroTick,
    getLatestIntroFrame,
  } = useThresholdPointer();
  const [mountedWithIntro] = useState<boolean>(() => introActive);
  const introActiveRef = useRef(introActive);
  introActiveRef.current = introActive;

  const trackRef = useRef<HTMLElement | null>(null);
  const leftColRef = useRef<HTMLDivElement | null>(null);
  const rightColRef = useRef<HTMLDivElement | null>(null);
  const compositionRef = useRef<HTMLDivElement | null>(null);

  const [initialUnlocked] = useState<boolean>(() => readInitialHomeUnlocked(isPopStateReturn));

  const [isCssDriven, setIsCssDriven] = useState<boolean>(() => {
    return isNativeScrollOnly() && supportsCssScrollTimeline();
  });
  const isCssDrivenRef = useRef(isCssDriven);
  isCssDrivenRef.current = isCssDriven;

  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );
  const prefersReducedMotionRef = useRef(prefersReducedMotion);
  prefersReducedMotionRef.current = prefersReducedMotion;

  const [phase, setPhase] = useState<TraversalPhase>(() => {
    const init = initialUnlocked ? 'free-navigation' : 'hero-fixed';
    setGlobalTraversalPhase(init);
    return init;
  });
  const phaseRef = useRef<TraversalPhase>(phase);
  phaseRef.current = phase;

  const [revealDirection, setRevealDirection] = useState<CollectionsRevealDirection>(() =>
    initialUnlocked ? 'settled' : 'hidden'
  );
  const revealDirectionRef = useRef<CollectionsRevealDirection>(revealDirection);
  revealDirectionRef.current = revealDirection;

  const [freeNavUnlocked, setFreeNavUnlocked] = useState<boolean>(() => initialUnlocked);
  const freeNavUnlockedRef = useRef<boolean>(freeNavUnlocked);
  freeNavUnlockedRef.current = freeNavUnlocked;

  const onFreeNavigationChangeRef = useRef(onFreeNavigationChange);
  onFreeNavigationChangeRef.current = onFreeNavigationChange;

  const [initialSpanPx] = useState<number>(() => {
    const vh = typeof window !== 'undefined' ? Math.max(window.innerHeight, 320) : 840;
    const span = computeTraversalSpanPx({
      stableViewportHeight: vh,
      isNative: isNativeScrollOnly(),
    });
    setGlobalTraversalSpanPx(span);
    setGlobalTraversalReleaseScrollY(span);
    return span;
  });

  // Refs individuais para atração e distorção direcional sem re-render React
  const eyebrowRef = useRef<HTMLParagraphElement | null>(null);
  const titleRef = useRef<HTMLDivElement | null>(null);
  const descRef = useRef<HTMLParagraphElement | null>(null);
  const ctaRef = useRef<HTMLDivElement | null>(null);
  const counterRef = useRef<HTMLDivElement | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);
  const scrollHintRef = useRef<HTMLDivElement | null>(null);

  const blackholeOuterRef = useRef<HTMLDivElement | null>(null);
  const blackholeFrontOuterRef = useRef<HTMLDivElement | null>(null);
  const wreathTransformRef = useRef<HTMLDivElement | null>(null);
  const wreathRotateRef = useRef<HTMLDivElement | null>(null);
  const wreathBlurRef = useRef<HTMLDivElement | null>(null);
  const modelCollapseRef = useRef<HTMLDivElement | null>(null);
  const stickyStageRef = useRef<HTMLDivElement | null>(null);
  const spacerRef = useRef<HTMLDivElement | null>(null);
  const voidVeilBuildRef = useRef<HTMLDivElement | null>(null);
  const voidVeilExitRef = useRef<HTMLDivElement | null>(null);
  const heroOverlayGroupRef = useRef<HTMLDivElement | null>(null);

  // Refs dedicadas à abertura integrada (~5s)
  const bhAnchorRef = useRef<HTMLDivElement | null>(null);
  const introRearFlipRef = useRef<HTMLDivElement | null>(null);
  const introFrontFlipRef = useRef<HTMLDivElement | null>(null);
  const introLogoFlipRef = useRef<HTMLDivElement | null>(null);
  const introRearBhBirthRef = useRef<HTMLDivElement | null>(null);
  const introFrontBhBirthRef = useRef<HTMLDivElement | null>(null);
  const introWreathBirthRef = useRef<HTMLDivElement | null>(null);
  const introLogoCollapseRef = useRef<HTMLDivElement | null>(null);
  const introLogoDarkLayerRef = useRef<HTMLDivElement | null>(null);
  const introLogoLightLayerRef = useRef<HTMLDivElement | null>(null);
  const introModelRef = useRef<HTMLDivElement | null>(null);
  const flipOffsetRef = useRef<{ tx: number; ty: number }>({ tx: 0, ty: 0 });
  const flipMeasuredRef = useRef<boolean>(false);

  // Estado contínuo da rotação anti-horária da moldura e ciclo sequencial
  const progressRef = useRef(initialUnlocked ? TRAVERSAL_HANDOFF_PROGRESS : 0);
  const angleDegRef = useRef(0);
  const lastScrollYRef = useRef(0);
  const smoothedBoostRef = useRef(0);
  const wasAtRestRef = useRef(false);
  const ensureWreathLoopRef = useRef<(() => void) | null>(null);
  const resyncRef = useRef<(() => void) | null>(null);
  const metricsRef = useRef({
    sectionTopDocY: 0,
    traversalSpanPx: initialSpanPx,
    stableWidth: 0,
    stableHeight: 0,
  });

  // Controle da máquina sequencial e guarda de inércia pós-revelação
  const revealCompletedRef = useRef<boolean>(initialUnlocked);
  const touchActiveRef = useRef<boolean>(false);
  const lastDownIntentTsRef = useRef<number>(0);
  const lastScrollTsRef = useRef<number>(0);
  const lastMeasuredScrollYRef = useRef<number>(
    typeof window !== 'undefined' ? window.scrollY : 0
  );
  const unlockTimerRef = useRef<number>(0);
  const stateCWatchdogRef = useRef<number>(0);
  const voidVeilExitAnimRef = useRef<Animation | null>(null);

  const displacementRef = useRef<SVGFEDisplacementMapElement | null>(null);
  const rawId = useId();
  const warpFilterId = `limiar-gravity-warp-${rawId.replace(/:/g, '')}`;

  const progressMv = useMotionValue(initialUnlocked ? TRAVERSAL_HANDOFF_PROGRESS : 0);

  // Sincroniza estado inicial se retornou via popstate do navegador
  useEffect(() => {
    if (initialUnlocked) {
      onFreeNavigationChangeRef.current?.(true);
    }
  }, [initialUnlocked]);

  // Monitora preferência do usuário por movimento reduzido
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      setPrefersReducedMotion(mq.matches);
      prefersReducedMotionRef.current = mq.matches;
    };
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const clearUnlockTimers = useCallback(() => {
    if (unlockTimerRef.current) {
      window.clearTimeout(unlockTimerRef.current);
      unlockTimerRef.current = 0;
    }
    if (stateCWatchdogRef.current) {
      window.clearTimeout(stateCWatchdogRef.current);
      stateCWatchdogRef.current = 0;
    }
  }, []);

  const driveVoidVeilExit = useCallback(
    (mode: 'forward' | 'reverse' | 'reset-opaque' | 'reset-clear') => {
      const el = voidVeilExitRef.current;
      const cancelAnim = () => {
        if (voidVeilExitAnimRef.current) {
          try {
            voidVeilExitAnimRef.current.onfinish = null;
            voidVeilExitAnimRef.current.cancel();
          } catch {
            // noop
          }
          voidVeilExitAnimRef.current = null;
        }
      };

      if (mode === 'reset-opaque') {
        cancelAnim();
        if (el) el.style.opacity = '1';
        return;
      }

      if (mode === 'reset-clear') {
        cancelAnim();
        if (el) el.style.opacity = '0';
        return;
      }

      if (!el) return;
      const durationMs = prefersReducedMotionRef.current ? 120 : VOID_VEIL_EXIT_MS;

      if (typeof el.animate !== 'function' || prefersReducedMotionRef.current) {
        cancelAnim();
        el.style.opacity = mode === 'forward' ? '0' : '1';
        return;
      }

      if (voidVeilExitAnimRef.current) {
        const anim = voidVeilExitAnimRef.current;
        anim.playbackRate = mode === 'forward' ? 1 : VOID_VEIL_REVERSE_RATE;
        anim.play();
        anim.onfinish = () => {
          const ct = Number(anim.currentTime ?? 0);
          if (mode === 'forward' && ct >= durationMs - 6) {
            el.style.opacity = '0';
            cancelAnim();
          } else if (mode === 'reverse' && ct <= 6) {
            el.style.opacity = '1';
            cancelAnim();
          }
        };
        return;
      }

      const anim = el.animate(
        [
          { opacity: 1, offset: 0 },
          { opacity: 0, offset: 1 },
        ],
        {
          duration: durationMs,
          fill: 'both',
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        }
      );
      anim.currentTime = mode === 'reverse' ? durationMs : 0;
      anim.playbackRate = mode === 'forward' ? 1 : VOID_VEIL_REVERSE_RATE;
      anim.onfinish = () => {
        const ct = Number(anim.currentTime ?? 0);
        if (mode === 'forward' && ct >= durationMs - 6) {
          el.style.opacity = '0';
          cancelAnim();
        } else if (mode === 'reverse' && ct <= 6) {
          el.style.opacity = '1';
          cancelAnim();
        }
      };
      voidVeilExitAnimRef.current = anim;
    },
    []
  );

  const commitFreeNavigationUnlock = useCallback(() => {
    if (phaseRef.current !== 'collections-reveal') return;
    clearUnlockTimers();

    const lenis = getLenisInstance();
    const { sectionTopDocY, traversalSpanPx } = metricsRef.current;
    const targetSpanScrollY = sectionTopDocY + traversalSpanPx;

    // Sincroniza a posição interna do Lenis com a posição real do documento e zera qualquer inércia residual
    if (lenis && !isNativeScrollOnly()) {
      lenis.stop();
      lenis.scrollTo(targetSpanScrollY, { immediate: true, force: true });
      (lenis as unknown as { velocity: number; lastVelocity: number }).velocity = 0;
      (lenis as unknown as { velocity: number; lastVelocity: number }).lastVelocity = 0;
      lenis.start();
    } else if (typeof window !== 'undefined') {
      window.scrollTo({ top: targetSpanScrollY, behavior: 'auto' });
    }

    setGlobalTraversalReleaseScrollY(targetSpanScrollY);

    phaseRef.current = 'free-navigation';
    setPhase('free-navigation');

    revealDirectionRef.current = 'settled';
    setRevealDirection('settled');

    freeNavUnlockedRef.current = true;
    setFreeNavUnlocked(true);
    writeHomeUnlockedSession(true);
    onFreeNavigationChangeRef.current?.(true);

    driveVoidVeilExit('reset-clear');

    // Sincroniza a notificação da fase com a conclusão do ciclo de renderização
    window.requestAnimationFrame(() => {
      const active = getLenisInstance();
      if (active && !isNativeScrollOnly()) {
        active.resize();
        if (Math.abs(active.scroll - targetSpanScrollY) > 0.5) {
          active.scrollTo(targetSpanScrollY, { immediate: true, force: true });
        }
      }
      setGlobalTraversalPhase('free-navigation');
      notifyPhysicsScroll();
    });
  }, [clearUnlockTimers, driveVoidVeilExit]);

  const tryUnlockAfterSettle = useCallback(() => {
    if (phaseRef.current !== 'collections-reveal') return;
    if (unlockTimerRef.current) {
      window.clearTimeout(unlockTimerRef.current);
      unlockTimerRef.current = 0;
    }

    const nowMs = performance.now();
    const lenis = getLenisInstance();
    const isLenisMoving =
      !isNativeScrollOnly() &&
      lenis != null &&
      (Boolean(lenis.isScrolling) ||
        Math.abs(lenis.velocity) > 0.005 ||
        Math.abs((lenis.targetScroll ?? lenis.scroll) - lenis.scroll) > 0.5);

    const settled = canUnlockFreeNavigation({
      revealCompleted: revealCompletedRef.current,
      touchActive: touchActiveRef.current,
      lastDownwardIntentTs: lastDownIntentTsRef.current,
      lastScrollTs: lastScrollTsRef.current,
      nowMs,
      settleMs: INERTIA_SETTLE_MS,
      isLenisMoving,
    });

    if (settled) {
      commitFreeNavigationUnlock();
      return;
    }

    const waitDown = Math.max(0, INERTIA_SETTLE_MS - (nowMs - lastDownIntentTsRef.current));
    const waitScroll = Math.max(0, INERTIA_SETTLE_MS - (nowMs - lastScrollTsRef.current));
    const delay = Math.max(36, waitDown, waitScroll, isLenisMoving ? 60 : 0);
    unlockTimerRef.current = window.setTimeout(() => {
      unlockTimerRef.current = 0;
      tryUnlockAfterSettle();
    }, delay);
  }, [commitFreeNavigationUnlock]);

  const handleRevealComplete = useCallback(() => {
    if (phaseRef.current !== 'collections-reveal') return;
    revealCompletedRef.current = true;
    if (stateCWatchdogRef.current) {
      window.clearTimeout(stateCWatchdogRef.current);
      stateCWatchdogRef.current = 0;
    }
    tryUnlockAfterSettle();
  }, [tryUnlockAfterSettle]);

  const handleRevealReversed = useCallback(() => {
    if (
      phaseRef.current === 'hero-fixed' ||
      phaseRef.current === 'traversal-active'
    ) {
      revealDirectionRef.current = 'hidden';
      setRevealDirection('hidden');
      driveVoidVeilExit('reset-opaque');
    }
  }, [driveVoidVeilExit]);

  const handleViewAllProductsClick = useCallback(() => {
    if (!freeNavUnlockedRef.current) {
      clearUnlockTimers();
      const { sectionTopDocY, traversalSpanPx } = metricsRef.current;
      const targetSpanScrollY = sectionTopDocY + traversalSpanPx;
      setGlobalTraversalReleaseScrollY(targetSpanScrollY);

      const lenis = getLenisInstance();
      if (lenis && !isNativeScrollOnly()) {
        lenis.stop();
        lenis.scrollTo(targetSpanScrollY, { immediate: true, force: true });
        (lenis as unknown as { velocity: number; lastVelocity: number }).velocity = 0;
        (lenis as unknown as { velocity: number; lastVelocity: number }).lastVelocity = 0;
        lenis.start();
      } else if (typeof window !== 'undefined') {
        window.scrollTo({ top: targetSpanScrollY, behavior: 'auto' });
      }

      phaseRef.current = 'free-navigation';
      setPhase('free-navigation');
      revealDirectionRef.current = 'settled';
      setRevealDirection('settled');
      freeNavUnlockedRef.current = true;
      setFreeNavUnlocked(true);
      writeHomeUnlockedSession(true);
      onFreeNavigationChangeRef.current?.(true);
      driveVoidVeilExit('reset-clear');

      window.requestAnimationFrame(() => {
        const active = getLenisInstance();
        if (active && !isNativeScrollOnly()) {
          active.resize();
        }
        setGlobalTraversalPhase('free-navigation');
        notifyPhysicsScroll();
        onViewAllProducts();
      });
      return;
    }
    onViewAllProducts();
  }, [clearUnlockTimers, driveVoidVeilExit, onViewAllProducts]);

  // Rastreamento leve de intenção/inércia para descartar fling/wheel residual antes do Estado D
  useEffect(() => {
    if (typeof window === 'undefined' || freeNavUnlocked) return;

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY > 0) {
        lastDownIntentTsRef.current = performance.now();
      }
    };

    const onTouchStart = () => {
      touchActiveRef.current = true;
    };

    const onTouchEndOrCancel = () => {
      touchActiveRef.current = false;
      if (revealCompletedRef.current && phaseRef.current === 'collections-reveal') {
        tryUnlockAfterSettle();
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'ArrowDown' ||
        e.key === 'PageDown' ||
        e.key === ' ' ||
        e.key === 'End'
      ) {
        lastDownIntentTsRef.current = performance.now();
      }
    };

    const onScrollEnd = () => {
      if (revealCompletedRef.current && phaseRef.current === 'collections-reveal') {
        lastScrollTsRef.current = performance.now() - INERTIA_SETTLE_MS;
        lastDownIntentTsRef.current = Math.min(
          lastDownIntentTsRef.current,
          performance.now() - INERTIA_SETTLE_MS
        );
        tryUnlockAfterSettle();
      }
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEndOrCancel, { passive: true });
    window.addEventListener('touchcancel', onTouchEndOrCancel, { passive: true });
    window.addEventListener('keydown', onKeyDown, { passive: true });
    window.addEventListener('scrollend', onScrollEnd, { passive: true });

    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEndOrCancel);
      window.removeEventListener('touchcancel', onTouchEndOrCancel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scrollend', onScrollEnd);
    };
  }, [freeNavUnlocked, tryUnlockAfterSettle]);

  useEffect(() => {
    const restConfig: CollapseVectorConfig = {
      pullX: 0,
      pullY: 0,
      stretchFactor: 0,
      skewDeg: 0,
      rotateDeg: 0,
      resistance: 1,
    };

    const enterCollectionsReveal = () => {
      if (phaseRef.current === 'collections-reveal' || phaseRef.current === 'free-navigation') {
        return;
      }
      clearUnlockTimers();
      revealCompletedRef.current = false;
      phaseRef.current = 'collections-reveal';
      setPhase('collections-reveal');
      setGlobalTraversalPhase('collections-reveal');

      revealDirectionRef.current = 'forward';
      setRevealDirection('forward');

      driveVoidVeilExit('forward');

      stateCWatchdogRef.current = window.setTimeout(() => {
        stateCWatchdogRef.current = 0;
        if (phaseRef.current === 'collections-reveal' && !revealCompletedRef.current) {
          revealCompletedRef.current = true;
          tryUnlockAfterSettle();
        }
      }, REVEAL_WATCHDOG_MS);
    };

    const reverseBackToTraversal = (toRest: boolean) => {
      const prevPhase = phaseRef.current;
      clearUnlockTimers();
      revealCompletedRef.current = false;

      if (freeNavUnlockedRef.current) {
        freeNavUnlockedRef.current = false;
        setFreeNavUnlocked(false);
        writeHomeUnlockedSession(false);
        onFreeNavigationChangeRef.current?.(false);
        window.requestAnimationFrame(() => {
          getLenisInstance()?.resize();
        });
      }

      const nextPhase: TraversalPhase = toRest ? 'hero-fixed' : 'traversal-active';
      if (phaseRef.current !== nextPhase) {
        phaseRef.current = nextPhase;
        setPhase(nextPhase);
        setGlobalTraversalPhase(nextPhase);
      }

      if (
        prevPhase === 'collections-reveal' ||
        prevPhase === 'free-navigation' ||
        revealDirectionRef.current === 'forward' ||
        revealDirectionRef.current === 'settled'
      ) {
        if (toRest) {
          revealDirectionRef.current = 'hidden';
          setRevealDirection('hidden');
          driveVoidVeilExit('reset-opaque');
        } else {
          revealDirectionRef.current = 'reverse';
          setRevealDirection('reverse');
          driveVoidVeilExit('reverse');
        }
      } else if (toRest && revealDirectionRef.current !== 'hidden') {
        revealDirectionRef.current = 'hidden';
        setRevealDirection('hidden');
        driveVoidVeilExit('reset-opaque');
      }
    };

    const applyFrame = (p: number) => {
      progressMv.set(p);
      progressRef.current = p;

      if (trackRef.current) {
        trackRef.current.dataset.traversalProgress = p.toFixed(3);
      }

      if (isCssDrivenRef.current) {
        // No modo CSS Scroll-driven, o compositor nativo gerencia transforms, opacidades e keyframes do Estado B
        return;
      }

      if (p < TRAVERSAL_HANDOFF_PROGRESS + 0.04) {
        ensureWreathLoopRef.current?.();
      }

      const width = typeof window !== 'undefined' ? window.innerWidth : 1440;
      const height = typeof window !== 'undefined' ? window.innerHeight : 900;
      const isDesktop = width >= 1024;
      const isMobile = width < 768;

      const frame = computeSingularityFrame(p, isMobile);

      if (trackRef.current) {
        trackRef.current.dataset.traversalStage = frame.stage;
      }

      if (scrollHintRef.current) {
        const hintOpacity = p <= 0.0001 ? 1 : p < 0.16 ? Math.max(0, 1 - (p - 0.1) / 0.06) : 0;
        scrollHintRef.current.style.opacity = String(hintOpacity.toFixed(3));
      }

      // Fast-path em repouso absoluto (p <= 0): zero zona morta depois de p > 0
      if (p <= 0.0001) {
        if (stickyStageRef.current && stickyStageRef.current.style.visibility !== 'visible') {
          stickyStageRef.current.style.visibility = 'visible';
        }
        if (!wasAtRestRef.current) {
          wasAtRestRef.current = true;
          if (displacementRef.current) {
            displacementRef.current.setAttribute('scale', '0');
          }
          applyCollapseStyle(eyebrowRef.current, 0, restConfig);
          applyCollapseStyle(titleRef.current, 0, restConfig);
          applyCollapseStyle(descRef.current, 0, restConfig);
          applyCollapseStyle(ctaRef.current, 0, restConfig);
          applyCollapseStyle(counterRef.current, 0, restConfig);
          applyCollapseStyle(railRef.current, 0, restConfig);
          applyCollapseStyle(modelCollapseRef.current, 0, restConfig);

          if (wreathTransformRef.current) {
            wreathTransformRef.current.style.transform = `translate3d(0px, 0px, 0) scale(${frame.wreathScale})`;
            wreathTransformRef.current.style.opacity = '1';
          }
          if (wreathBlurRef.current) {
            wreathBlurRef.current.style.filter = 'none';
          }
          const restTransform = `translate3d(0px, 0px, 0) scale(${frame.scale})`;
          if (blackholeOuterRef.current) {
            blackholeOuterRef.current.style.transform = restTransform;
            blackholeOuterRef.current.style.opacity = '1';
          }
          if (blackholeFrontOuterRef.current) {
            blackholeFrontOuterRef.current.style.transform = restTransform;
            blackholeFrontOuterRef.current.style.opacity = '1';
          }
          if (heroOverlayGroupRef.current) {
            heroOverlayGroupRef.current.style.opacity = '1';
            heroOverlayGroupRef.current.style.pointerEvents = 'auto';
          }
          if (voidVeilBuildRef.current) {
            voidVeilBuildRef.current.style.opacity = '0';
          }
        }
        return;
      }

      wasAtRestRef.current = false;

      const curPhase = phaseRef.current;
      if (stickyStageRef.current) {
        const nextVis = curPhase === 'free-navigation' ? 'hidden' : 'visible';
        if (stickyStageRef.current.style.visibility !== nextVis) {
          stickyStageRef.current.style.visibility = nextVis;
        }
      }

      // PASSO 1 (APENAS LEITURAS): lê toda a geometria de layout em lote único antes de qualquer escrita
      const compRect = compositionRef.current?.getBoundingClientRect();
      const leftRect = leftColRef.current?.getBoundingClientRect();
      const rightRect = rightColRef.current?.getBoundingClientRect();

      const eyebrowCenter = measureElementCenter(eyebrowRef.current, leftRect);
      const titleCenter = measureElementCenter(titleRef.current, leftRect);
      const descCenter = measureElementCenter(descRef.current, leftRect);
      const ctaCenter = measureElementCenter(ctaRef.current, leftRect);
      const counterCenter = measureElementCenter(counterRef.current, leftRect);
      const railCenter = measureElementCenter(railRef.current, rightRect);
      const modelCenter = measureElementCenter(modelCollapseRef.current, compRect);

      // PASSO 2 (APENAS CÁLCULOS & ESCRITAS): zero layout thrashing
      const bhCenterX = compRect
        ? compRect.left + compRect.width * 0.5
        : width * (isDesktop ? 0.72 : 0.5);
      const bhCenterY = compRect
        ? compRect.top + compRect.height * (isMobile ? 0.415 : 0.432)
        : height * 0.48;

      const vpCenterX = width * 0.5;
      const vpCenterY = height * 0.5;

      const shiftX = (vpCenterX - bhCenterX) * frame.centerBlend;
      const shiftY = (vpCenterY - bhCenterY) * frame.centerBlend;

      const targetSingularityX = bhCenterX + shiftX;
      const targetSingularityY = bhCenterY + shiftY;

      const useSvgWarp = true;
      if (displacementRef.current) {
        const warpAmount =
          p > 0.22 && p < 0.68 ? Number((frame.warpIntensity * 14).toFixed(2)) : 0;
        displacementRef.current.setAttribute('scale', String(warpAmount));
      }

      const filterRef = `#${warpFilterId}`;

      applyCollapseStyle(
        eyebrowRef.current,
        p,
        {
          ...pullFromMeasured(eyebrowCenter, targetSingularityX, targetSingularityY, 0.52),
          stretchFactor: isDesktop ? 0.24 : 0.16,
          skewDeg: isDesktop ? -7 : -3,
          rotateDeg: isDesktop ? 4 : 2,
          resistance: 0.74,
        },
        useSvgWarp,
        filterRef
      );

      applyCollapseStyle(
        titleRef.current,
        p,
        {
          ...pullFromMeasured(titleCenter, targetSingularityX, targetSingularityY, 0.58),
          stretchFactor: isDesktop ? 0.28 : 0.18,
          skewDeg: isDesktop ? -8 : -4,
          rotateDeg: isDesktop ? 3 : 2,
          resistance: 0.88,
        },
        useSvgWarp,
        filterRef
      );

      applyCollapseStyle(
        descRef.current,
        p,
        {
          ...pullFromMeasured(descCenter, targetSingularityX, targetSingularityY, 0.54),
          stretchFactor: isDesktop ? 0.22 : 0.15,
          skewDeg: isDesktop ? -6 : -3,
          rotateDeg: -2,
          resistance: 0.82,
        },
        useSvgWarp,
        filterRef
      );

      applyCollapseStyle(ctaRef.current, p, {
        ...pullFromMeasured(ctaCenter, targetSingularityX, targetSingularityY, 0.5),
        stretchFactor: isDesktop ? 0.18 : 0.14,
        skewDeg: isDesktop ? -5 : -2,
        rotateDeg: isDesktop ? -3 : -2,
        resistance: 0.94,
      });

      applyCollapseStyle(counterRef.current, p, {
        ...pullFromMeasured(counterCenter, targetSingularityX, targetSingularityY, 0.48),
        stretchFactor: isDesktop ? 0.16 : 0.12,
        skewDeg: isDesktop ? -4 : -2,
        rotateDeg: isDesktop ? -3 : -2,
        resistance: 0.7,
      });

      applyCollapseStyle(railRef.current, p, {
        ...pullFromMeasured(railCenter, targetSingularityX, targetSingularityY, 0.62),
        stretchFactor: 0.14,
        skewDeg: 4,
        rotateDeg: -6,
        resistance: 0.72,
      });

      applyCollapseStyle(
        modelCollapseRef.current,
        p,
        {
          ...pullFromMeasured(modelCenter, targetSingularityX, targetSingularityY, 0.95),
          stretchFactor: 0.14,
          skewDeg: -2.5,
          rotateDeg: -7,
          resistance: 1.0,
        },
        useSvgWarp,
        filterRef
      );

      if (wreathTransformRef.current) {
        wreathTransformRef.current.style.transform = `translate3d(${shiftX.toFixed(
          2
        )}px, ${shiftY.toFixed(2)}px, 0) scale(${frame.wreathScale})`;
        wreathTransformRef.current.style.opacity = p >= 0.715 ? '0' : '1';
      }

      if (wreathBlurRef.current) {
        wreathBlurRef.current.style.filter =
          frame.wreathBlurPx > 0.05 ? `blur(${frame.wreathBlurPx}px)` : 'none';
      }

      const blackholeTransform = `translate3d(${shiftX.toFixed(
        2
      )}px, ${shiftY.toFixed(2)}px, 0) scale(${frame.scale})`;
      const blackholeOpacity = String(frame.heroVisibility);

      if (blackholeOuterRef.current) {
        blackholeOuterRef.current.style.transform = blackholeTransform;
        blackholeOuterRef.current.style.opacity = blackholeOpacity;
      }

      if (blackholeFrontOuterRef.current) {
        blackholeFrontOuterRef.current.style.transform = blackholeTransform;
        blackholeFrontOuterRef.current.style.opacity = blackholeOpacity;
      }

      if (heroOverlayGroupRef.current) {
        heroOverlayGroupRef.current.style.opacity = String(frame.heroVisibility);
        heroOverlayGroupRef.current.style.pointerEvents =
          p < 0.28 && frame.heroVisibility > 0.5 ? 'auto' : 'none';
      }

      // Véu externo constrói 0 -> 1 no final do Estado B (e permanece 1 atrás do voidVeilExit no Estado C)
      if (voidVeilBuildRef.current) {
        const buildOpacity = smootherstep(0.55, 0.67, p);
        voidVeilBuildRef.current.style.opacity = String(buildOpacity.toFixed(4));
      }
    };

    let nativeMode = isNativeScrollOnly();
    const damper = new CinematicProgressDamper(HERO_TRAVERSAL_DAMPER_CONFIG);
    if (initialUnlocked) {
      damper.snap(1);
    }
    let damperRafId = 0;
    let lastTickMs = 0;

    const measureMetrics = () => {
      if (typeof window === 'undefined' || !trackRef.current) return;
      const winW = window.innerWidth;
      const winH = Math.max(window.innerHeight, 320);
      const prev = metricsRef.current;

      const shouldUpdateStableVh =
        !nativeMode ||
        prev.stableHeight === 0 ||
        shouldAcceptMobileViewportHeightUpdate(prev.stableWidth, prev.stableHeight, winW, winH);

      const stableWidth = shouldUpdateStableVh ? winW : prev.stableWidth;
      const stableHeight = shouldUpdateStableVh ? winH : prev.stableHeight;

      const rect = trackRef.current.getBoundingClientRect();
      const sectionTopDocY = rect.top + getEffectiveScrollY();
      const traversalSpanPx = computeTraversalSpanPx({
        stableViewportHeight: stableHeight || winH,
        isNative: nativeMode,
      });
      setGlobalTraversalSpanPx(traversalSpanPx);
      setGlobalTraversalReleaseScrollY(sectionTopDocY + traversalSpanPx);

      metricsRef.current = {
        sectionTopDocY,
        traversalSpanPx,
        stableWidth,
        stableHeight,
      };

      if (spacerRef.current) {
        spacerRef.current.style.height = `${traversalSpanPx}px`;
      }

      if (trackRef.current) {
        trackRef.current.style.setProperty(
          '--limiar-traversal-span',
          `${traversalSpanPx}px`
        );
      }
    };

    const readScrolledPastTop = () => {
      if (typeof window === 'undefined') return 0;
      return Math.max(0, getEffectiveScrollY() - metricsRef.current.sectionTopDocY);
    };

    const evaluatePhaseTransition = (visualU: number, scrolledPastTop: number) => {
      const S = metricsRef.current.traversalSpanPx;
      const curPhase = phaseRef.current;

      if (curPhase === 'free-navigation') {
        if (scrolledPastTop < S - 4) {
          reverseBackToTraversal(scrolledPastTop <= 1 && visualU <= 0.002);
        }
        return;
      }

      if (curPhase === 'collections-reveal') {
        if (scrolledPastTop < S - 2) {
          reverseBackToTraversal(scrolledPastTop <= 1 && visualU <= 0.002);
        }
        return;
      }

      // Estados A & B
      const atBoundary =
        (nativeMode || prefersReducedMotionRef.current)
          ? scrolledPastTop >= S - 2
          : visualU >= 0.992 && scrolledPastTop >= S - 3;

      if (atBoundary) {
        enterCollectionsReveal();
        return;
      }

      if (scrolledPastTop <= 1 && visualU <= 0.002) {
        if (curPhase !== 'hero-fixed') {
          reverseBackToTraversal(true);
        }
      } else if (curPhase !== 'traversal-active') {
        phaseRef.current = 'traversal-active';
        setPhase('traversal-active');
        setGlobalTraversalPhase('traversal-active');
      }
    };

    const stepDamper = (now: number) => {
      if (nativeMode || document.visibilityState === 'hidden') {
        damperRafId = 0;
        lastTickMs = 0;
        return;
      }
      const dtSec = lastTickMs > 0 ? (now - lastTickMs) / 1000 : 1 / 60;
      lastTickMs = now;
      const smoothedU = damper.step(dtSec);
      const timelineP = mapUnitProgressToTimeline(smoothedU);
      applyFrame(timelineP);

      evaluatePhaseTransition(smoothedU, readScrolledPastTop());

      if (!damper.isSettled()) {
        damperRafId = window.requestAnimationFrame(stepDamper);
      } else {
        damperRafId = 0;
        lastTickMs = 0;
      }
    };

    const syncFromScroll = () => {
      if (introActiveRef.current) return;
      const currentY = getEffectiveScrollY();
      const prevY = lastMeasuredScrollYRef.current;
      const nowMs = performance.now();
      lastScrollTsRef.current = nowMs;
      if (currentY > prevY + 0.5) {
        lastDownIntentTsRef.current = nowMs;
      }
      lastMeasuredScrollYRef.current = currentY;

      const scrolledPastTop = readScrolledPastTop();
      const targetU = computeDeterministicTraversalProgress(
        scrolledPastTop,
        metricsRef.current.traversalSpanPx
      );

      if (nativeMode || prefersReducedMotionRef.current) {
        if (damperRafId) {
          window.cancelAnimationFrame(damperRafId);
          damperRafId = 0;
          lastTickMs = 0;
        }
        const directU = damper.snap(targetU);
        const timelineP = mapUnitProgressToTimeline(directU);
        applyFrame(timelineP);
        evaluatePhaseTransition(directU, scrolledPastTop);
        return;
      }

      // Desktop com mouse/trackpad: amortecimento progressivo no eixo [0..1]
      damper.setTarget(targetU);
      const currentU = damper.getValue();
      evaluatePhaseTransition(currentU, scrolledPastTop);

      if (!damper.isSettled() && !damperRafId && document.visibilityState !== 'hidden') {
        lastTickMs = performance.now();
        damperRafId = window.requestAnimationFrame(stepDamper);
      }
    };

    const snapFromLayout = () => {
      if (introActiveRef.current) {
        damper.snap(0);
        applyFrame(0);
        return;
      }
      const scrolledPastTop = readScrolledPastTop();
      const targetU = computeDeterministicTraversalProgress(
        scrolledPastTop,
        metricsRef.current.traversalSpanPx
      );
      const snappedU = damper.snap(targetU);
      applyFrame(mapUnitProgressToTimeline(snappedU));
      if (!initialUnlocked) {
        evaluatePhaseTransition(snappedU, scrolledPastTop);
      } else if (scrolledPastTop < metricsRef.current.traversalSpanPx - 4) {
        evaluatePhaseTransition(snappedU, scrolledPastTop);
      }
    };

    resyncRef.current = () => {
      nativeMode = isNativeScrollOnly();
      const nextCssDriven = nativeMode && supportsCssScrollTimeline();
      setIsCssDriven(nextCssDriven);
      isCssDrivenRef.current = nextCssDriven;

      if (nativeMode && damperRafId) {
        window.cancelAnimationFrame(damperRafId);
        damperRafId = 0;
        lastTickMs = 0;
      }
      wasAtRestRef.current = false;
      measureMetrics();
      snapFromLayout();
    };

    const onResize = () => {
      const prevNative = nativeMode;
      nativeMode = isNativeScrollOnly();
      const nextCssDriven = nativeMode && supportsCssScrollTimeline();
      setIsCssDriven(nextCssDriven);
      isCssDrivenRef.current = nextCssDriven;

      if (nativeMode && damperRafId) {
        window.cancelAnimationFrame(damperRafId);
        damperRafId = 0;
        lastTickMs = 0;
      }

      const significantChange =
        !nativeMode ||
        prevNative !== nativeMode ||
        shouldAcceptMobileViewportHeightUpdate(
          metricsRef.current.stableWidth,
          metricsRef.current.stableHeight,
          window.innerWidth,
          window.innerHeight
        );

      if (significantChange) {
        wasAtRestRef.current = false;
      }

      measureMetrics();
      snapFromLayout();
    };

    const onPageShow = () => {
      measureMetrics();
      snapFromLayout();
    };

    measureMetrics();
    snapFromLayout();

    const unsubPhysics = subscribePhysicsScroll(syncFromScroll);
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('pageshow', onPageShow, { passive: true });
    if (!nativeMode) {
      window.visualViewport?.addEventListener('resize', onResize, { passive: true });
    }

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && trackRef.current) {
      resizeObserver = new ResizeObserver(() => {
        measureMetrics();
        if (phaseRef.current !== 'collections-reveal') {
          snapFromLayout();
        }
      });
      resizeObserver.observe(trackRef.current);
    }

    return () => {
      resyncRef.current = null;
      setGlobalTraversalPhase('free-navigation');
      clearUnlockTimers();
      if (voidVeilExitAnimRef.current) {
        try {
          voidVeilExitAnimRef.current.onfinish = null;
          voidVeilExitAnimRef.current.cancel();
        } catch {
          // noop
        }
        voidVeilExitAnimRef.current = null;
      }
      if (damperRafId) window.cancelAnimationFrame(damperRafId);
      unsubPhysics();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pageshow', onPageShow);
      window.visualViewport?.removeEventListener('resize', onResize);
      resizeObserver?.disconnect();
    };
  }, [clearUnlockTimers, driveVoidVeilExit, initialUnlocked, progressMv, warpFilterId]);

  // Medição FLIP em cache + condução 60fps da abertura integrada (zero re-render React)
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    if (!introActive) {
      const clearNode = (
        el: HTMLElement | null,
        clearOpacity = true,
        clearTransform = true,
        clearFilter = true
      ) => {
        if (!el) return;
        if (clearOpacity) el.style.opacity = '';
        if (clearTransform) el.style.transform = '';
        if (clearFilter) el.style.filter = '';
        el.style.pointerEvents = '';
      };

      clearNode(introRearFlipRef.current);
      clearNode(introFrontFlipRef.current);
      clearNode(introLogoFlipRef.current);
      clearNode(introRearBhBirthRef.current);
      clearNode(introFrontBhBirthRef.current);
      clearNode(introWreathBirthRef.current);
      clearNode(introModelRef.current);
      clearNode(leftColRef.current, true, false, false);
      clearNode(railRef.current, true, false, false);
      if (scrollHintRef.current && progressRef.current <= 0.0001) {
        scrollHintRef.current.style.opacity = '';
      }

      if (wreathRotateRef.current) {
        if (isCssDriven && !prefersReducedMotion) {
          wreathRotateRef.current.style.transform = '';
          wreathRotateRef.current.style.animationDelay = `${computeSyncedCssSpinDelaySec(
            angleDegRef.current,
            32
          )}s`;
        } else {
          wreathRotateRef.current.style.animationDelay = '';
          wreathRotateRef.current.style.transform = `rotate(${angleDegRef.current.toFixed(3)}deg)`;
        }
      }

      wasAtRestRef.current = false;
      resyncRef.current?.();
      return;
    }

    const measureFlip = () => {
      const anchor = bhAnchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      flipOffsetRef.current = computeFlipOffset(rect, {
        width: window.innerWidth || 1440,
        height: window.innerHeight || 900,
      });
      flipMeasuredRef.current = true;
    };

    const applyIntroFrame = (frame: SingularityIntroFrame, dtSec: number) => {
      if (!flipMeasuredRef.current) {
        measureFlip();
      }
      const { tx, ty } = flipOffsetRef.current;
      const curTx = (tx * frame.flip.centerFactor).toFixed(2);
      const curTy = (ty * frame.flip.centerFactor).toFixed(2);
      const flipTransform = `translate3d(${curTx}px, ${curTy}px, 0) scale(${frame.flip.scale})`;

      if (introRearFlipRef.current) {
        introRearFlipRef.current.style.transform = flipTransform;
      }
      if (introFrontFlipRef.current) {
        introFrontFlipRef.current.style.transform = flipTransform;
      }
      if (introLogoFlipRef.current) {
        introLogoFlipRef.current.style.transform = flipTransform;
      }

      const bhOpacity = String(frame.blackhole.opacity);
      const bhTransform = `scale(${frame.blackhole.scale})`;
      if (introRearBhBirthRef.current) {
        introRearBhBirthRef.current.style.opacity = bhOpacity;
        introRearBhBirthRef.current.style.transform = bhTransform;
      }
      if (introFrontBhBirthRef.current) {
        introFrontBhBirthRef.current.style.opacity = bhOpacity;
        introFrontBhBirthRef.current.style.transform = bhTransform;
      }

      if (introLogoCollapseRef.current) {
        const sx = frame.logo.scale;
        const sy = Number((frame.logo.scale * frame.logo.stretchY).toFixed(4));
        introLogoCollapseRef.current.style.opacity = String(frame.logo.opacity);
        introLogoCollapseRef.current.style.transform = `scale(${sx}, ${sy})`;
        introLogoCollapseRef.current.style.filter =
          frame.logo.blurPx > 0.05 ? `blur(${frame.logo.blurPx}px)` : 'none';
      }
      if (introLogoDarkLayerRef.current) {
        introLogoDarkLayerRef.current.style.opacity = String(
          Number((1 - frame.logo.lightHorizonMix).toFixed(4))
        );
      }
      if (introLogoLightLayerRef.current) {
        introLogoLightLayerRef.current.style.opacity = String(frame.logo.lightHorizonMix);
      }

      if (introWreathBirthRef.current) {
        introWreathBirthRef.current.style.opacity = String(frame.wreath.opacity);
        introWreathBirthRef.current.style.transform = `scale(${frame.wreath.scale})`;
      }

      if (frame.wreath.speedMultiplier > 0 && dtSec > 0 && !prefersReducedMotionRef.current) {
        const restDegPerSec = isCssDrivenRef.current ? 360 / 32 : 3.6;
        angleDegRef.current =
          (angleDegRef.current - restDegPerSec * frame.wreath.speedMultiplier * dtSec) % 360000;
      }
      if (wreathRotateRef.current) {
        wreathRotateRef.current.style.transform = `rotate(${angleDegRef.current.toFixed(3)}deg)`;
      }

      const isMobileViewport = window.innerWidth < 768 || isNativeScrollOnly();
      if (introModelRef.current) {
        introModelRef.current.style.opacity = String(frame.model.opacity);
        introModelRef.current.style.transform = `translate3d(0px, ${frame.model.yPx}px, 0)`;
        introModelRef.current.style.filter =
          !isMobileViewport && frame.model.blurPx > 0.05
            ? `blur(${frame.model.blurPx}px)`
            : 'none';
      }

      if (leftColRef.current) {
        leftColRef.current.style.opacity = String(frame.chrome.heroContentOpacity);
        leftColRef.current.style.pointerEvents =
          frame.chrome.heroContentOpacity > 0.65 ? 'auto' : 'none';
      }
      if (railRef.current) {
        railRef.current.style.opacity = String(frame.chrome.heroContentOpacity);
      }
      if (scrollHintRef.current) {
        scrollHintRef.current.style.opacity = String(frame.chrome.heroContentOpacity);
      }
    };

    measureFlip();
    applyIntroFrame(getLatestIntroFrame(), 0);

    const onIntroResize = () => {
      measureFlip();
      applyIntroFrame(getLatestIntroFrame(), 0);
    };

    window.addEventListener('resize', onIntroResize, { passive: true });
    let flipObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      flipObserver = new ResizeObserver(onIntroResize);
      if (bhAnchorRef.current) flipObserver.observe(bhAnchorRef.current);
      if (compositionRef.current) flipObserver.observe(compositionRef.current);
    }
    if (document.fonts?.ready) {
      void document.fonts.ready.then(onIntroResize);
    }

    const unsubIntro = subscribeIntroTick(applyIntroFrame);

    return () => {
      unsubIntro();
      flipObserver?.disconnect();
      window.removeEventListener('resize', onIntroResize);
    };
  }, [introActive, isCssDriven, prefersReducedMotion, subscribeIntroTick, getLatestIntroFrame]);

  useEffect(() => {
    if (!portalRevealed) return;
    resyncRef.current?.();
  }, [portalRevealed]);

  // Rotação contínua exclusivamente anti-horária (suspende durante intro, aba oculta ou após p >= 0.72; em modo CSS-driven roda via CSS nativo)
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !portalRevealed ||
      isCssDriven ||
      prefersReducedMotion
    ) {
      return;
    }

    let rafId = 0;
    let lastTime = performance.now();
    lastScrollYRef.current = getEffectiveScrollY();

    const BASE_DEG_PER_SEC = 3.6;
    const PROGRESS_EXTRA_DEG_PER_SEC = 26.0;
    const MAX_VELOCITY_BOOST = 82.0;
    const MAX_TOTAL_DEG_PER_SEC = 112.0;

    const shouldRun = () =>
      !isCssDrivenRef.current &&
      !prefersReducedMotionRef.current &&
      (typeof document === 'undefined' || document.visibilityState !== 'hidden') &&
      phaseRef.current !== 'collections-reveal' &&
      phaseRef.current !== 'free-navigation' &&
      progressRef.current < TRAVERSAL_HANDOFF_PROGRESS;

    const tick = (now: number) => {
      if (!shouldRun()) {
        rafId = 0;
        smoothedBoostRef.current = 0;
        return;
      }

      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

      const currentScrollY = getEffectiveScrollY();
      const deltaScrollPx = Math.abs(currentScrollY - lastScrollYRef.current);
      lastScrollYRef.current = currentScrollY;

      const p = progressRef.current;
      const scrollSpeedPxPerSec = deltaScrollPx / dt;
      const targetBoost = Math.min(MAX_VELOCITY_BOOST, scrollSpeedPxPerSec * 0.032);
      const dampRate = targetBoost > smoothedBoostRef.current ? 11.0 : 4.2;
      const alpha = 1 - Math.exp(-dampRate * dt);
      smoothedBoostRef.current += (targetBoost - smoothedBoostRef.current) * alpha;
      if (targetBoost === 0 && smoothedBoostRef.current < 0.02) {
        smoothedBoostRef.current = 0;
      }

      const progressSpeed =
        BASE_DEG_PER_SEC + smootherstep(0.06, 0.68, p) * PROGRESS_EXTRA_DEG_PER_SEC;
      const effectiveSpeed = Math.min(
        MAX_TOTAL_DEG_PER_SEC,
        progressSpeed + smoothedBoostRef.current
      );

      // Sempre subtrai para garantir sentido exclusivamente anti-horário (inclusive ao rolar para cima)
      angleDegRef.current = (angleDegRef.current - effectiveSpeed * dt) % 360000;

      if (wreathRotateRef.current) {
        wreathRotateRef.current.style.transform = `rotate(${angleDegRef.current.toFixed(3)}deg)`;
      }

      rafId = window.requestAnimationFrame(tick);
    };

    const ensureLoop = () => {
      if (!rafId && shouldRun()) {
        lastTime = performance.now();
        lastScrollYRef.current = getEffectiveScrollY();
        rafId = window.requestAnimationFrame(tick);
      }
    };

    ensureWreathLoopRef.current = ensureLoop;
    ensureLoop();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        ensureLoop();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      ensureWreathLoopRef.current = null;
      document.removeEventListener('visibilitychange', onVisibility);
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [portalRevealed, isCssDriven, prefersReducedMotion, phase]);

  const nativeMode = isNativeScrollOnly();

  return (
    <section
      ref={trackRef}
      data-testid="hero-traversal-track"
      data-traversal-phase={phase}
      data-traversal-stage={
        phase === 'hero-fixed'
          ? 'repouso'
          : phase === 'traversal-active'
          ? 'colapso'
          : 'revelacao'
      }
      data-traversal-progress={initialUnlocked ? '0.720' : '0.000'}
      data-traversal-mode={
        isCssDriven ? 'css-driven' : nativeMode ? 'js-fallback' : 'desktop'
      }
      className="relative limiar-traversal-track"
    >
      {/* Gatilho exclusivo de view-timeline para CSS Scroll-driven Animations mobile */}
      <div
        aria-hidden="true"
        className="limiar-traversal-trigger pointer-events-none absolute top-0 left-0 w-px"
      />

      {/* Filtro SVG de distorção gravitacional discreta (qualidade alta) */}
      <svg aria-hidden="true" className="absolute w-0 h-0 overflow-hidden pointer-events-none">
        <defs>
          <filter id={warpFilterId} x="-15%" y="-15%" width="130%" height="130%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012 0.022"
              numOctaves="2"
              seed="7"
              result="gravNoise"
            />
            <feDisplacementMap
              ref={displacementRef}
              in="SourceGraphic"
              in2="gravNoise"
              scale="0"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* Palco Sticky: fixa exclusivamente a travessia hero -> singularidade -> véu em 100dvh */}
      <div
        ref={stickyStageRef}
        className="sticky top-0 z-10 h-[100dvh] w-full overflow-hidden flex flex-col md:flex-row md:items-center pointer-events-none limiar-sticky-stage"
      >
        {/* CAMADA DE TRAVESSIA: HERO + SINGULARIDADE PROCEDURAL */}
        <div
          ref={heroOverlayGroupRef}
          className="relative z-10 w-full h-full md:h-auto flex items-center pointer-events-auto limiar-hero-overlay-group"
        >
          <div className="mx-auto max-w-[1360px] px-4 sm:px-8 pt-[76px] sm:pt-24 pb-6 sm:pb-10 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-4 sm:gap-6">
              {/* Coluna Esquerda: Texto & CTA */}
              <div
                ref={leftColRef}
                style={introActive ? { opacity: 0, pointerEvents: 'none' } : undefined}
                className="lg:col-span-6 xl:col-span-6 relative z-30 space-y-3 sm:space-y-6 lg:space-y-8"
              >
                <div
                  ref={eyebrowRef}
                  className="will-change-transform origin-right limiar-hero-text-collapse"
                >
                  <p
                    className={`${
                      mountedWithIntro ? '' : 'limiar-enter'
                    } text-[11px] sm:text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]`}
                    style={{ animationDelay: '0ms' }}
                  >
                    {slide.eyebrow}
                  </p>
                </div>

                <div
                  ref={titleRef}
                  className="will-change-transform origin-right limiar-hero-text-collapse"
                >
                  <div
                    className={`${
                      mountedWithIntro ? '' : 'limiar-enter'
                    } flex items-start gap-4`}
                    style={{ animationDelay: '45ms' }}
                  >
                    <h1 className="font-display font-light text-3xl sm:text-5xl xl:text-[64px] leading-[1.03] tracking-[0.03em] text-[var(--text-primary)] uppercase text-balance max-w-xl">
                      {slide.title}
                    </h1>
                    <LimiarStar className="w-6 h-6 sm:w-9 sm:h-9 text-[var(--text-secondary)] shrink-0 mt-1.5 sm:mt-2 opacity-80" />
                  </div>
                </div>

                <div
                  ref={descRef}
                  className="will-change-transform origin-right limiar-hero-text-collapse"
                >
                  <p
                    className={`${
                      mountedWithIntro ? '' : 'limiar-enter'
                    } text-sm sm:text-base lg:text-lg text-[var(--text-secondary)] max-w-md leading-relaxed`}
                    style={{ animationDelay: '90ms' }}
                  >
                    {slide.description}
                  </p>
                </div>

                <div
                  ref={ctaRef}
                  className="pt-0.5 sm:pt-1 will-change-transform origin-right limiar-hero-text-collapse"
                >
                  <div
                    className={mountedWithIntro ? undefined : 'limiar-enter'}
                    style={{ animationDelay: '135ms' }}
                  >
                    <ThresholdMagnetic maxPull={4}>
                      <UltravioletButton href={slide.ctaHref} size="lg">
                        {slide.ctaLabel}
                      </UltravioletButton>
                    </ThresholdMagnetic>
                  </div>
                </div>

                <div
                  ref={counterRef}
                  className="pt-1 sm:pt-4 will-change-transform origin-right limiar-hero-text-collapse"
                >
                  <div
                    className={`${
                      mountedWithIntro ? '' : 'limiar-enter'
                    } flex items-center gap-4 text-[11px] tracking-[0.2em] text-[var(--text-muted)] tabular-nums`}
                    style={{ animationDelay: '180ms' }}
                  >
                    <span>0{activeSlideIndex + 1}</span>
                    <span className="w-16 h-[1px] bg-[var(--border-strong)] relative overflow-hidden">
                      <span className="absolute inset-y-0 left-0 w-full bg-[var(--text-primary)] opacity-75" />
                    </span>
                    <span>0{totalSlides}</span>
                  </div>
                </div>
              </div>

              {/* Coluna Direita: Singularidade Procedural + Cybersigilism + Modelo */}
              <div
                ref={rightColRef}
                className="lg:col-span-6 xl:col-span-6 relative flex items-end justify-center xl:pr-10"
              >
                <HeroThresholdComposition
                  modelAlt={slide.imageAlt}
                  progressMv={progressMv}
                  isCssDriven={isCssDriven}
                  introActive={introActive}
                  onBlackHoleError={() => {
                    if (introActiveRef.current) {
                      markPortalRevealed();
                    }
                  }}
                  collapseRefs={{
                    compositionRef,
                    blackholeOuterRef,
                    blackholeFrontOuterRef,
                    wreathTransformRef,
                    wreathRotateRef,
                    wreathBlurRef,
                    modelCollapseRef,
                  }}
                  introRefs={{
                    bhAnchorRef,
                    introRearFlipRef,
                    introFrontFlipRef,
                    introLogoFlipRef,
                    introRearBhBirthRef,
                    introFrontBhBirthRef,
                    introWreathBirthRef,
                    introLogoCollapseRef,
                    introLogoDarkLayerRef,
                    introLogoLightLayerRef,
                    introModelRef,
                  }}
                />

                {/* Rail lateral discreto */}
                <div
                  ref={railRef}
                  style={introActive ? { opacity: 0 } : undefined}
                  aria-hidden="true"
                  className="hidden xl:flex flex-col items-center gap-3 absolute right-0 top-1/2 -translate-y-1/2 z-30 text-[var(--text-muted)] will-change-transform"
                >
                  <span className="w-[1px] h-10 bg-[var(--border-hairline)]" />
                  <EclipseSigil className="w-5 h-5 text-[var(--text-secondary)]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-primary)]" />
                  <span className="w-1 h-1 rounded-full bg-[var(--border-strong)]" />
                  <span className="w-[1px] h-10 bg-[var(--border-hairline)]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Indicador sutil de travessia em repouso */}
        <div
          ref={scrollHintRef}
          style={introActive ? { opacity: 0 } : undefined}
          aria-hidden="true"
          className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 z-20 hidden sm:flex flex-col items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)] limiar-scroll-hint"
        >
          <span>Role para atravessar</span>
          <span className="w-[1px] h-5 bg-gradient-to-b from-[var(--text-muted)] to-transparent" />
        </div>

        {/* VÉU DE ESCURIDÃO ANINHADO:
            - Externo (build): 0 -> 1 no final do Estado B (via view-timeline no mobile ou applyFrame no desktop)
            - Interno (exit): 1 no Estado B, abre gradualmente 1 -> 0 no Estado C (reversível via WAAPI) */}
        <div
          ref={voidVeilBuildRef}
          aria-hidden="true"
          data-testid="horizon-void-veil-build"
          className="pointer-events-none absolute inset-0 z-[24] opacity-0"
        >
          <div
            ref={voidVeilExitRef}
            data-testid="horizon-void-veil"
            className="w-full h-full opacity-100"
            style={{
              background:
                'radial-gradient(circle at 50% 50%, #030304 0%, #050507 65%, #070709 100%)',
            }}
          />
        </div>
      </div>

      {/* Espaço exato S da travessia gravitacional antes da entrada sequencial das coleções */}
      <div
        ref={spacerRef}
        aria-hidden="true"
        style={{ height: `${initialSpanPx}px` }}
        className="pointer-events-none"
      />

      {/* REVELAÇÃO SEQUENCIAL DAS COLEÇÕES + CONTEÚDO UNIFICADO DA HOMEPAGE */}
      <CollectionsRevealSection
        collections={collections}
        progressMv={progressMv}
        isCssDriven={isCssDriven}
        revealDirection={revealDirection}
        freeNavUnlocked={freeNavUnlocked}
        reducedMotion={prefersReducedMotion}
        onRevealComplete={handleRevealComplete}
        onRevealReversed={handleRevealReversed}
        onViewAllProducts={handleViewAllProductsClick}
      >
        {postCollectionsContent}
      </CollectionsRevealSection>
    </section>
  );
}

