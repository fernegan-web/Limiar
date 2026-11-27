import React, { useCallback, useEffect, useRef } from 'react';
import { GRAFISMOS_ASSETS, preloadSobreBlockAssets } from '../../data/sobreLimiarContent';
import {
  CinematicProgressDamper,
  getEffectiveScrollY,
  subscribePhysicsScroll,
  type ProgressDamperConfig,
} from '../../motion/scrollPhysics';
import { clamp } from '../../motion/thresholdConfig';
import { frameScheduler } from '../../performance/frameScheduler';
import { Block01Manifesto } from './Block01Manifesto';
import { Block02Raizes } from './Block02Raizes';
import { Block03Identidade } from './Block03Identidade';
import { Block04Materia } from './Block04Materia';
import { Block05Autorais } from './Block05Autorais';
import { Block06Comunidade } from './Block06Comunidade';
import { OrganicFiligree } from './OrganicFiligree';

const SOBRE_DAMPER_CONFIG: ProgressDamperConfig = {
  stiffness: 34,
  damping: 12.2,
  maxSpeedPerSec: 1.45,
  softCatchupThreshold: 0.28,
};

const SOBRE_TASK_ID = 'sobre-desktop-dampers';

const BLOCK_IDS = [
  'sobre-bloco-01-manifesto',
  'sobre-bloco-02-raizes',
  'sobre-bloco-03-identidade',
  'sobre-bloco-04-materia',
  'sobre-bloco-05-autorais',
  'sobre-bloco-06-comunidade',
] as const;

const RUNWAY_CLASSES = [
  'limiar-sobre-runway',
  'limiar-sobre-runway limiar-sobre-runway--overlap',
  'limiar-sobre-runway limiar-sobre-runway--overlap',
  'limiar-sobre-runway limiar-sobre-runway--overlap limiar-sobre-runway--long',
  'limiar-sobre-runway limiar-sobre-runway--overlap',
  'limiar-sobre-runway limiar-sobre-runway--overlap limiar-sobre-runway--long',
] as const;

function isStickyDesktopViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= 768 && window.innerHeight >= 680;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

interface CachedRunwayGeometry {
  topDocY: number;
  height: number;
}

/**
 * Seção institucional "Sobre a Limiar" — seis blocos consecutivos controlados
 * pelo scroll com retenção localizada por sticky, platôs reais de contemplação
 * e fluxo vertical natural no mobile.
 */
export function SobreLimiarSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const runwayRefs = useRef<(HTMLElement | null)[]>([]);
  const mobileCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const applyFnsRef = useRef<Array<((progress: number | null) => void) | null>>(
    Array(6).fill(null)
  );
  const dampersRef = useRef<CinematicProgressDamper[]>(
    Array.from({ length: 6 }, () => new CinematicProgressDamper(SOBRE_DAMPER_CONFIG))
  );
  const lastRenderedRef = useRef<number[]>(Array(6).fill(-1));
  const preloadedUpToRef = useRef<number>(-1);

  const registerApply = useCallback((index: number, fn: (progress: number | null) => void) => {
    applyFnsRef.current[index] = fn;
  }, []);

  const register0 = useCallback((fn: (p: number | null) => void) => registerApply(0, fn), [registerApply]);
  const register1 = useCallback((fn: (p: number | null) => void) => registerApply(1, fn), [registerApply]);
  const register2 = useCallback((fn: (p: number | null) => void) => registerApply(2, fn), [registerApply]);
  const register3 = useCallback((fn: (p: number | null) => void) => registerApply(3, fn), [registerApply]);
  const register4 = useCallback((fn: (p: number | null) => void) => registerApply(4, fn), [registerApply]);
  const register5 = useCallback((fn: (p: number | null) => void) => registerApply(5, fn), [registerApply]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let lastScrollY = getEffectiveScrollY();
    let isSectionNearViewport = false;
    let mobileInitialized = false;
    const cachedRunways: CachedRunwayGeometry[] = Array.from({ length: 6 }, () => ({
      topDocY: 0,
      height: 800,
    }));
    const lastMobileOpacity = Array<number>(6).fill(-1);

    const measureRunwayGeometry = () => {
      const scrollY = window.scrollY || window.pageYOffset || 0;
      for (let i = 0; i < 6; i++) {
        const runway = runwayRefs.current[i];
        if (!runway) continue;
        const rect = runway.getBoundingClientRect();
        cachedRunways[i] = {
          topDocY: rect.top + scrollY,
          height: Math.max(1, rect.height),
        };
      }
    };

    const triggerLookaheadPreload = (activeIndex: number) => {
      const targetIndex = Math.min(5, activeIndex + 1);
      if (targetIndex > preloadedUpToRef.current) {
        for (let i = preloadedUpToRef.current + 1; i <= targetIndex; i++) {
          preloadSobreBlockAssets(i);
        }
        preloadedUpToRef.current = targetIndex;
      }
    };

    const updateMobileFlow = (forceInitial = false) => {
      const vh = window.innerHeight || 800;
      const scrollY = getEffectiveScrollY();
      const reduced = prefersReducedMotion();

      for (let i = 0; i < 6; i++) {
        if (!mobileInitialized || forceInitial) {
          // No mobile, preserva fluxo natural sem esconder textos nem prender altura sticky
          applyFnsRef.current[i]?.(null);
        }

        const el = mobileCardRefs.current[i];
        const geo = cachedRunways[i];
        if (!el) continue;

        const rectTop = geo.topDocY - scrollY;
        const rectBottom = rectTop + geo.height;

        if (!forceInitial && (rectBottom < -vh * 0.5 || rectTop > vh * 1.5)) {
          // Fora da vizinhança da viewport: não recalcula nem muta o DOM durante o scroll no Hero
          continue;
        }

        if (rectTop < vh * 1.4 && rectBottom > -vh * 0.4) {
          triggerLookaheadPreload(i);
        }

        if (reduced) {
          if (lastMobileOpacity[i] !== 1) {
            lastMobileOpacity[i] = 1;
            el.style.opacity = '1';
            el.style.transform = 'none';
          }
          continue;
        }

        const enterT = clamp((vh * 0.94 - rectTop) / (vh * 0.34), 0, 1);
        const eased = 1 - Math.pow(1 - enterT, 3);
        const exitT =
          i === 5
            ? 1
            : clamp((rectBottom - vh * 0.04) / (vh * 0.22), 0.25, 1);
        const opacity = Math.min(eased, exitT);
        const roundedOp = opacity >= 0.995 ? 1 : Number(opacity.toFixed(3));

        if (Math.abs(roundedOp - lastMobileOpacity[i]) > 0.003 || forceInitial) {
          lastMobileOpacity[i] = roundedOp;
          el.style.opacity = String(roundedOp);
          el.style.transform =
            eased >= 0.995 ? 'none' : `translate3d(0, ${((1 - eased) * 18).toFixed(2)}px, 0)`;
        }
      }
      mobileInitialized = true;
    };

    const runDesktopDamperTick = (_nowMs: number, dtMs: number): boolean => {
      const dtSec = Math.min(dtMs / 1000, 0.045);
      let anyMoving = false;

      for (let i = 0; i < 6; i++) {
        const damper = dampersRef.current[i];
        if (!damper.isSettled()) {
          const nextP = damper.step(dtSec);
          if (Math.abs(nextP - lastRenderedRef.current[i]) > 0.00025) {
            lastRenderedRef.current[i] = nextP;
            applyFnsRef.current[i]?.(nextP);
          }
          if (!damper.isSettled()) {
            anyMoving = true;
          }
        }
      }

      return anyMoving;
    };

    const syncAll = (snapImmediate = false) => {
      const reduced = prefersReducedMotion();
      const desktopSticky = isStickyDesktopViewport();

      if (reduced) {
        frameScheduler.stopTask(SOBRE_TASK_ID);
        for (let i = 0; i < 6; i++) {
          applyFnsRef.current[i]?.(i === 5 ? 0.85 : 0.42);
          const m = mobileCardRefs.current[i];
          if (m) {
            m.style.opacity = '1';
            m.style.transform = 'none';
          }
        }
        return;
      }

      if (!desktopSticky) {
        frameScheduler.stopTask(SOBRE_TASK_ID);
        if (!isSectionNearViewport && !snapImmediate && mobileInitialized) {
          return;
        }
        updateMobileFlow(snapImmediate);
        return;
      }

      // Garante reset de wrapper mobile quando alterna para desktop
      if (snapImmediate || mobileInitialized) {
        mobileInitialized = false;
        for (let i = 0; i < 6; i++) {
          lastMobileOpacity[i] = -1;
          const m = mobileCardRefs.current[i];
          if (m) {
            m.style.opacity = '1';
            m.style.transform = 'none';
          }
        }
      }

      const vh = window.innerHeight || 900;
      const currentY = getEffectiveScrollY();
      const scrollJump = Math.abs(currentY - lastScrollY);
      lastScrollY = currentY;
      const shouldSnap = snapImmediate || scrollJump > vh * 1.8;

      if (!isSectionNearViewport && !shouldSnap) {
        const allSettled = dampersRef.current.every((d) => d.isSettled());
        if (allSettled) return;
      }

      let needsRaf = false;
      for (let i = 0; i < 6; i++) {
        const geo = cachedRunways[i];
        const rectTop = geo.topDocY - currentY;
        const travel = Math.max(1, geo.height - vh);
        const leadIn = i === 0 ? vh * 0.28 : vh * 0.36;
        const rawP = clamp((leadIn - rectTop) / (leadIn + travel), 0, 1);

        if (rawP > 0.01 && rawP < 0.99) {
          triggerLookaheadPreload(i);
        }

        const damper = dampersRef.current[i];
        if (shouldSnap) {
          const snapped = damper.snap(rawP);
          if (Math.abs(snapped - lastRenderedRef.current[i]) > 0.0002 || snapImmediate) {
            lastRenderedRef.current[i] = snapped;
            applyFnsRef.current[i]?.(snapped);
          }
        } else {
          damper.setTarget(rawP);
          if (!damper.isSettled()) {
            needsRaf = true;
          } else if (Math.abs(damper.getValue() - lastRenderedRef.current[i]) > 0.00025) {
            lastRenderedRef.current[i] = damper.getValue();
            applyFnsRef.current[i]?.(damper.getValue());
          }
        }
      }

      if (needsRaf) {
        frameScheduler.scheduleTask(SOBRE_TASK_ID, runDesktopDamperTick);
      } else {
        frameScheduler.stopTask(SOBRE_TASK_ID);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const nextNear = Boolean(entry?.isIntersecting);
        isSectionNearViewport = nextNear;
        if (nextNear) {
          triggerLookaheadPreload(0);
          measureRunwayGeometry();
          syncAll(false);
        }
      },
      { rootMargin: '520px 0px' }
    );
    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            measureRunwayGeometry();
          })
        : null;
    if (resizeObserver && sectionRef.current) {
      resizeObserver.observe(sectionRef.current);
      if (document.body) {
        resizeObserver.observe(document.body);
      }
    }

    measureRunwayGeometry();
    syncAll(true);
    const unsubScroll = subscribePhysicsScroll(() => syncAll(false));
    const handleResize = () => {
      measureRunwayGeometry();
      syncAll(true);
    };
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      frameScheduler.removeTask(SOBRE_TASK_ID);
      observer.disconnect();
      resizeObserver?.disconnect();
      unsubScroll();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const blocks = [
    <Block01Manifesto key="b1" registerApply={register0} />,
    <Block02Raizes key="b2" registerApply={register1} />,
    <Block03Identidade key="b3" registerApply={register2} />,
    <Block04Materia key="b4" registerApply={register3} />,
    <Block05Autorais key="b5" registerApply={register4} />,
    <Block06Comunidade key="b6" registerApply={register5} />,
  ];

  return (
    <section
      ref={sectionRef}
      id="sobre-a-limiar"
      aria-label="Sobre a Limiar"
      className="relative z-10 overflow-x-clip pt-6 md:pt-10"
    >
      {/* Filamentos orgânicos de costura entre seções nas bordas externas (z-0, atrás de tudo) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      >
        <OrganicFiligree
          src={GRAFISMOS_ASSETS.filigrana03}
          opacityClass="opacity-[0.44]"
          className="absolute -left-24 lg:-left-28 top-[15%] w-[320px] sm:w-[460px] lg:w-[580px] h-[520px] lg:h-[780px] -rotate-[12deg]"
        />
        <OrganicFiligree
          src={GRAFISMOS_ASSETS.filigrana01}
          opacityClass="opacity-[0.44]"
          className="absolute -right-24 lg:-right-28 top-[46%] w-[320px] sm:w-[480px] lg:w-[600px] h-[540px] lg:h-[820px] rotate-[15deg]"
        />
        <OrganicFiligree
          src={GRAFISMOS_ASSETS.filigrana04}
          opacityClass="opacity-[0.44]"
          className="absolute -left-24 lg:-left-24 top-[75%] w-[320px] sm:w-[460px] lg:w-[580px] h-[520px] lg:h-[780px] rotate-[10deg]"
        />
      </div>

      {blocks.map((blockNode, index) => (
        <article
          key={BLOCK_IDS[index]}
          id={BLOCK_IDS[index]}
          ref={(node) => {
            runwayRefs.current[index] = node;
          }}
          className={`relative z-10 ${RUNWAY_CLASSES[index]}`}
        >
          <div
            ref={(node) => {
              mobileCardRefs.current[index] = node;
            }}
            className="limiar-sobre-sticky"
          >
            {blockNode}
          </div>
        </article>
      ))}
    </section>
  );
}
