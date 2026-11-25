import React, { useCallback, useEffect, useRef } from 'react';
import { GRAFISMOS_ASSETS, preloadSobreBlockAssets } from '../../data/sobreLimiarContent';
import {
  CinematicProgressDamper,
  getEffectiveScrollY,
  subscribePhysicsScroll,
  type ProgressDamperConfig,
} from '../../motion/scrollPhysics';
import { clamp } from '../../motion/thresholdConfig';
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

    let rafId = 0;
    let lastTime = performance.now();
    let lastScrollY = getEffectiveScrollY();

    const triggerLookaheadPreload = (activeIndex: number) => {
      const targetIndex = Math.min(5, activeIndex + 1);
      if (targetIndex > preloadedUpToRef.current) {
        for (let i = preloadedUpToRef.current + 1; i <= targetIndex; i++) {
          preloadSobreBlockAssets(i);
        }
        preloadedUpToRef.current = targetIndex;
      }
    };

    const updateMobileFlow = () => {
      const vh = window.innerHeight || 800;
      for (let i = 0; i < 6; i++) {
        // No mobile, preserva fluxo natural sem esconder textos nem prender altura sticky
        applyFnsRef.current[i]?.(null);

        const el = mobileCardRefs.current[i];
        const runway = runwayRefs.current[i];
        if (!el || !runway) continue;

        const rect = runway.getBoundingClientRect();
        if (rect.top < vh * 1.4 && rect.bottom > -vh * 0.4) {
          triggerLookaheadPreload(i);
        }

        if (prefersReducedMotion()) {
          el.style.opacity = '1';
          el.style.transform = 'none';
          continue;
        }

        // Entrada suave quando entra pela base da viewport; permanece 100% legível na leitura
        const enterT = clamp((vh * 0.94 - rect.top) / (vh * 0.34), 0, 1);
        const eased = 1 - Math.pow(1 - enterT, 3);
        const exitT =
          i === 5
            ? 1
            : clamp((rect.bottom - vh * 0.04) / (vh * 0.22), 0.25, 1);
        const opacity = Math.min(eased, exitT);

        el.style.opacity = opacity >= 0.995 ? '1' : opacity.toFixed(3);
        el.style.transform =
          eased >= 0.995 ? 'none' : `translate3d(0, ${((1 - eased) * 18).toFixed(2)}px, 0)`;
      }
    };

    const stepDesktopDamper = (now: number) => {
      rafId = 0;
      const dtSec = Math.min((now - lastTime) / 1000, 0.045);
      lastTime = now;

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

      if (anyMoving) {
        rafId = window.requestAnimationFrame(stepDesktopDamper);
      }
    };

    const syncAll = (snapImmediate = false) => {
      const reduced = prefersReducedMotion();
      const desktopSticky = isStickyDesktopViewport();

      if (reduced) {
        if (rafId) {
          window.cancelAnimationFrame(rafId);
          rafId = 0;
        }
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
        if (rafId) {
          window.cancelAnimationFrame(rafId);
          rafId = 0;
        }
        updateMobileFlow();
        return;
      }

      // Garante reset de wrapper mobile quando alterna para desktop
      for (let i = 0; i < 6; i++) {
        const m = mobileCardRefs.current[i];
        if (m) {
          m.style.opacity = '1';
          m.style.transform = 'none';
        }
      }

      const vh = window.innerHeight || 900;
      const currentY = getEffectiveScrollY();
      const scrollJump = Math.abs(currentY - lastScrollY);
      lastScrollY = currentY;
      const shouldSnap = snapImmediate || scrollJump > vh * 1.8;

      let needsRaf = false;
      for (let i = 0; i < 6; i++) {
        const runway = runwayRefs.current[i];
        if (!runway) continue;

        const rect = runway.getBoundingClientRect();
        const travel = Math.max(1, rect.height - vh);
        const leadIn = i === 0 ? vh * 0.28 : vh * 0.36;
        const rawP = clamp((leadIn - rect.top) / (leadIn + travel), 0, 1);

        if (rawP > 0.01 && rawP < 0.99) {
          triggerLookaheadPreload(i);
        }

        const damper = dampersRef.current[i];
        if (shouldSnap) {
          const snapped = damper.snap(rawP);
          lastRenderedRef.current[i] = snapped;
          applyFnsRef.current[i]?.(snapped);
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

      if (needsRaf && !rafId) {
        lastTime = performance.now();
        rafId = window.requestAnimationFrame(stepDesktopDamper);
      }
    };

    // Pré-carrega o primeiro bloco apenas quando o visitante se aproxima da seção
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          triggerLookaheadPreload(0);
          observer.disconnect();
        }
      },
      { rootMargin: '420px 0px' }
    );
    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    syncAll(true);
    const unsubScroll = subscribePhysicsScroll(() => syncAll(false));
    const handleResize = () => syncAll(true);
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      observer.disconnect();
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
