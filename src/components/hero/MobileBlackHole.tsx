import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { MotionValue } from 'motion/react';
import { useTheme } from '../../context/ThemeContext';
import {
  computeSingularityFrame,
  resolveOperationalState,
  smootherstep,
  type BlackHoleOperationalState,
} from '../../motion/gravitationalTimeline';
import { useThresholdPointer } from '../../motion/ThresholdMotionProvider';

interface MobileBlackHoleProps {
  progressMv?: MotionValue<number>;
  frontContainerRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
}

const REST_HORIZON_RADIUS = 0.48;

/**
 * Renderizador dedicado Mobile-First do buraco negro Limiar:
 * - Zero contexto WebGL, zero shader FBM por pixel, zero transferência entre canvases.
 * - Camadas orbitais pré-renderizadas diretamente a partir da equação procedural original:
 *   `orbital-disk-512.webp` (disco orbital único e sincronizado, bipartido em passagem traseira z-10 e frontal z-30),
 *   `inner-halo-768.webp` (halo interno de fótons ao redor do horizonte) e núcleo negro #020203.
 * - Elimina sobreposição de discos estáticos redundantes (`rear-accretion-768` e `front-orbit-768`),
 *   representando um único buraco negro coeso com profundidade tridimensional ao redor da modelo.
 * - Movimento orbital contínuo e expansão do horizonte de eventos em transform/opacity acelerados por GPU.
 * - Vinculado diretamente ao progressMv (1:1 com window.scrollY) e suspenso completamente em p >= 0.72.
 */
export function MobileBlackHole({
  progressMv,
  frontContainerRef,
  className = '',
}: MobileBlackHoleProps) {
  const { theme } = useTheme();
  const { portalRevealed } = useThresholdPointer();
  const isLightMode = theme === 'light';

  const rootRef = useRef<HTMLDivElement | null>(null);
  const innerHaloRef = useRef<HTMLImageElement | null>(null);
  const rearDiskSpinRef = useRef<HTMLImageElement | null>(null);
  const frontDiskSpinRef = useRef<HTMLImageElement | null>(null);
  const horizonCoreRef = useRef<HTMLDivElement | null>(null);
  const frontLayerOpacityRef = useRef<HTMLDivElement | null>(null);

  const [frontHost, setFrontHost] = useState<HTMLElement | null>(null);
  const [inViewport, setInViewport] = useState(true);
  const [tabVisible, setTabVisible] = useState(
    typeof document === 'undefined' ? true : !document.hidden
  );

  const computeEffectiveState = (
    p: number,
    visible: boolean,
    tab: boolean,
    revealed: boolean
  ): BlackHoleOperationalState => {
    if (!revealed) return 'inactive';
    return resolveOperationalState({
      progress: p,
      inViewport: visible,
      tabVisible: tab,
    });
  };

  const [opState, setOpState] = useState<BlackHoleOperationalState>(() =>
    computeEffectiveState(progressMv?.get() ?? 0, true, true, portalRevealed)
  );

  const portalRevealedRef = useRef(portalRevealed);
  const inViewportRef = useRef(inViewport);
  const tabVisibleRef = useRef(tabVisible);
  const opStateRef = useRef(opState);

  portalRevealedRef.current = portalRevealed;
  inViewportRef.current = inViewport;
  tabVisibleRef.current = tabVisible;
  opStateRef.current = opState;

  useEffect(() => {
    const host = frontContainerRef?.current ?? null;
    if (host) {
      host.style.opacity = '1';
      setFrontHost(host);
    }
  }, [frontContainerRef]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVisibility = () => {
      setTabVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setInViewport(entry.isIntersecting);
        }
      },
      { rootMargin: '160px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Aplica expansão do horizonte e absorção da matéria frontal sincronizadas 1:1 com progressMv
  useEffect(() => {
    const applyProgress = (p: number) => {
      const frame = computeSingularityFrame(p, true);

      if (horizonCoreRef.current) {
        const horizonScale = frame.horizonRadius / REST_HORIZON_RADIUS;
        horizonCoreRef.current.style.transform = `scale(${horizonScale.toFixed(3)})`;
      }

      if (frontLayerOpacityRef.current) {
        // Quando o horizonte cresce (p = 0.46..0.64), engole o arco frontal antes do fade final
        const swallowFront = 1 - smootherstep(0.46, 0.64, p);
        frontLayerOpacityRef.current.style.opacity = String(swallowFront.toFixed(3));
      }

      const nextState = computeEffectiveState(
        p,
        inViewportRef.current,
        tabVisibleRef.current,
        portalRevealedRef.current
      );
      if (nextState !== opStateRef.current) {
        opStateRef.current = nextState;
        setOpState(nextState);
      }
    };

    applyProgress(progressMv?.get() ?? 0);
    const unsub = progressMv?.on('change', applyProgress);
    return () => unsub?.();
  }, [progressMv, inViewport, tabVisible, portalRevealed]);

  // Loop único e econômico de rotação orbital contínua (suspende totalmente em inactive / p >= 0.72)
  useEffect(() => {
    if (typeof window === 'undefined' || opState === 'inactive') return;

    let rafId = 0;
    let lastTime = performance.now();
    let diskAngleDeg = 0;
    let haloAngleDeg = 0;

    const tick = (now: number) => {
      const dt = Math.min(Math.max((now - lastTime) / 1000, 0.001), 0.05);
      lastTime = now;

      const speedFactor = opStateRef.current === 'traversal' ? 1.85 : 1.0;
      diskAngleDeg = (diskAngleDeg + 20 * speedFactor * dt) % 360000;
      haloAngleDeg = (haloAngleDeg - 9 * speedFactor * dt) % 360000;

      const diskTransform = `rotate(${diskAngleDeg.toFixed(2)}deg)`;
      if (rearDiskSpinRef.current) {
        rearDiskSpinRef.current.style.transform = diskTransform;
      }
      if (frontDiskSpinRef.current) {
        frontDiskSpinRef.current.style.transform = diskTransform;
      }
      if (innerHaloRef.current) {
        innerHaloRef.current.style.transform = `rotate(${haloAngleDeg.toFixed(2)}deg)`;
      }

      if (opStateRef.current !== 'inactive') {
        rafId = window.requestAnimationFrame(tick);
      } else {
        rafId = 0;
      }
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [opState]);

  const frontPortalContent = (
    <div
      ref={frontLayerOpacityRef}
      aria-hidden="true"
      className="pointer-events-none relative w-full h-full"
    >
      {/* Sombra da face inferior do disco frontal (apenas no dark mode, preservando a leitura no light mode) */}
      {!isLightMode && (
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[108%] h-[34%] -rotate-[12.6deg] opacity-85"
          style={{
            background:
              'radial-gradient(66% 52% at 50% 62%, rgba(5, 5, 8, 0.9) 24%, rgba(5, 5, 8, 0.55) 56%, transparent 82%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, transparent 0%, transparent 48%, black 60%, black 100%)',
            maskImage:
              'linear-gradient(to bottom, transparent 0%, transparent 48%, black 60%, black 100%)',
          }}
        />
      )}

      {/* Arco orbital frontal animado passando na frente da modelo (mascarado à metade frontal inferior) */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center -rotate-[12.6deg]"
        style={{
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent 0%, transparent 46%, rgba(0,0,0,0.85) 53%, black 59%, black 100%)',
          maskImage:
            'linear-gradient(to bottom, transparent 0%, transparent 46%, rgba(0,0,0,0.85) 53%, black 59%, black 100%)',
        }}
      >
        <div
          className="flex items-center justify-center shrink-0"
          style={{
            width: '109.85%',
            height: '145%',
            transform: 'scale(1.4706, 0.2597)',
          }}
        >
          <img
            ref={frontDiskSpinRef}
            src="/assets/blackhole/orbital-disk-512.webp"
            alt=""
            width={512}
            height={512}
            decoding="async"
            draggable={false}
            className="w-full h-full object-contain opacity-95 will-change-transform select-none"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div
      ref={rootRef}
      data-blackhole-engine="mobile-composited"
      data-blackhole-state={opState}
      className={`relative w-full aspect-[1.32/1] flex items-center justify-center ${className}`}
    >
      {/* Brilho atmosférico sutil em volta do disco */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-[8%] rounded-full opacity-55 dark:opacity-70"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(161, 138, 200, 0.16) 28%, rgba(164, 199, 90, 0.08) 46%, transparent 70%)',
        }}
      />

      {/* Disco orbital animado no plano traseiro (mascarado à metade posterior acima do centro) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center -rotate-[12.6deg]"
        style={{
          WebkitMaskImage:
            'linear-gradient(to bottom, black 0%, black 44%, rgba(0,0,0,0.45) 52%, transparent 60%, transparent 100%)',
          maskImage:
            'linear-gradient(to bottom, black 0%, black 44%, rgba(0,0,0,0.45) 52%, transparent 60%, transparent 100%)',
        }}
      >
        <div
          className="flex items-center justify-center shrink-0"
          style={{
            width: '109.85%',
            height: '145%',
            transform: 'scale(1.4706, 0.2597)',
          }}
        >
          <img
            ref={rearDiskSpinRef}
            src="/assets/blackhole/orbital-disk-512.webp"
            alt=""
            width={512}
            height={512}
            decoding="async"
            draggable={false}
            className="w-full h-full object-contain opacity-95 will-change-transform select-none"
          />
        </div>
      </div>

      {/* Halo interno de fótons em rotação contínua suave */}
      <img
        ref={innerHaloRef}
        src="/assets/blackhole/inner-halo-768.webp"
        alt=""
        width={768}
        height={582}
        decoding="async"
        draggable={false}
        className="pointer-events-none absolute inset-0 w-full h-full object-contain opacity-90 will-change-transform select-none"
      />

      {/* Horizonte de eventos preto central com expansão sincronizada ao scroll */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[36.36%] h-[48%] flex items-center justify-center"
      >
        <div
          ref={horizonCoreRef}
          className="w-full h-full rounded-full bg-[#020203] will-change-transform"
          style={{
            boxShadow: '0 0 12px 2px rgba(2, 2, 3, 0.96)',
          }}
        />
      </div>

      {frontHost ? createPortal(frontPortalContent, frontHost) : null}
    </div>
  );
}
