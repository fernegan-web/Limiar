import React, { useEffect, useRef } from 'react';
import {
  INTRO_FAILSAFE_MS,
  INTRO_TOTAL_DURATION_MS,
  computeIntroFrame,
} from '../../motion/portalIntroTimeline';

interface PortalIntroOverlayProps {
  onPortalOpen: () => void;
  onComplete: () => void;
}

/**
 * Introdução cinematográfica de travessia (~2s):
 * - 7 camadas independentes sincronizadas em um único loop requestAnimationFrame.
 * - Zero re-renderizações React durante a timeline (mutação direta de refs GPU).
 * - Máscara circular radial invertida no encerramento que revela a homepage por trás.
 * - Respeita dark/light mode desde o primeiro frame e encerra com failsafe seguro.
 */
export function PortalIntroOverlay({
  onPortalOpen,
  onComplete,
}: PortalIntroOverlayProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const backdropMaskRef = useRef<HTMLDivElement | null>(null);
  const tribalsRef = useRef<HTMLDivElement | null>(null);
  const mistRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const filamentsRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const orbitalsRef = useRef<HTMLDivElement | null>(null);
  const particlesOuterRef = useRef<HTMLDivElement | null>(null);
  const particlesOrbitARef = useRef<HTMLDivElement | null>(null);
  const particlesOrbitBRef = useRef<HTMLDivElement | null>(null);
  const logoRef = useRef<HTMLDivElement | null>(null);

  const onPortalOpenRef = useRef(onPortalOpen);
  const onCompleteRef = useRef(onComplete);
  onPortalOpenRef.current = onPortalOpen;
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    let rafId = 0;
    let finished = false;
    let portalNotified = false;
    let startTime = 0;

    const finishSafely = () => {
      if (finished) return;
      finished = true;
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
      if (!portalNotified) {
        portalNotified = true;
        onPortalOpenRef.current();
      }
      onCompleteRef.current();
    };

    const reducedMql = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMql.matches) {
      finishSafely();
      return () => {
        document.documentElement.style.overflow = prevHtmlOverflow;
        document.body.style.overflow = prevBodyOverflow;
      };
    }

    const applyFrame = (elapsedMs: number) => {
      const f = computeIntroFrame(elapsedMs);

      if (f.portalOpened && !portalNotified) {
        portalNotified = true;
        onPortalOpenRef.current();
      }

      if (backdropMaskRef.current) {
        if (f.portalMaskActive) {
          const maskValue = `radial-gradient(circle at 50% 50%, transparent ${f.portalInnerVmax}vmax, rgba(0,0,0,0.45) ${(
            f.portalInnerVmax + 2.6
          ).toFixed(3)}vmax, black ${f.portalOuterVmax}vmax)`;
          backdropMaskRef.current.style.maskImage = maskValue;
          backdropMaskRef.current.style.webkitMaskImage = maskValue;
        } else {
          backdropMaskRef.current.style.maskImage = 'none';
          backdropMaskRef.current.style.webkitMaskImage = 'none';
        }
      }

      if (tribalsRef.current) {
        tribalsRef.current.style.opacity = String(f.tribals.opacity);
        tribalsRef.current.style.transform = `translate3d(0, 0, 0) scale(${f.tribals.scale})`;
      }

      if (mistRef.current) {
        mistRef.current.style.opacity = String(f.mist.opacity);
        mistRef.current.style.transform = `translate3d(0, 0, 0) scale(${f.mist.scale}) rotate(${f.mist.rotateDeg}deg)`;
      }

      if (glowRef.current) {
        glowRef.current.style.opacity = String(f.energyGlowOpacity);
      }

      if (filamentsRef.current) {
        filamentsRef.current.style.opacity = String(f.filaments.opacity);
        filamentsRef.current.style.transform = `translate3d(0, 0, 0) scale(${f.filaments.scale}) rotate(${f.filaments.rotateDeg}deg)`;
      }

      if (ringRef.current) {
        ringRef.current.style.opacity = String(f.ring.opacity);
        ringRef.current.style.transform = `translate3d(0, 0, 0) scale(${f.ring.scale}) rotate(${f.ring.rotateDeg}deg)`;
      }

      if (orbitalsRef.current) {
        orbitalsRef.current.style.opacity = String(f.orbitals.opacity);
        orbitalsRef.current.style.transform = `translate3d(0, 0, 0) scale(${f.orbitals.scale}) rotate(${f.orbitals.rotateDeg}deg)`;
      }

      if (particlesOuterRef.current) {
        particlesOuterRef.current.style.opacity = String(f.particles.opacity);
        particlesOuterRef.current.style.transform = `translate3d(0, 0, 0) scale(${f.particles.scale})`;
      }

      if (particlesOrbitARef.current) {
        const boostScale = 1 + f.particles.pulseBoost * 0.28;
        particlesOrbitARef.current.style.transform = `rotate(${f.particles.orbitAngleDeg}deg) scale(${boostScale})`;
      }

      if (particlesOrbitBRef.current) {
        const boostScale = 1 + f.particles.pulseBoost * 0.22;
        particlesOrbitBRef.current.style.transform = `rotate(${-f.particles.orbitAngleDeg * 0.72}deg) scale(${boostScale})`;
      }

      if (logoRef.current) {
        logoRef.current.style.opacity = String(f.logo.opacity);
        logoRef.current.style.transform = `translate3d(0, 0, 0) scale(${f.logo.scale})`;
        logoRef.current.style.filter =
          f.logo.blurPx > 0.05 ? `blur(${f.logo.blurPx}px)` : 'none';
      }

      if (rootRef.current) {
        rootRef.current.setAttribute(
          'data-intro-stage',
          f.portalOpened ? 'travessia' : elapsedMs >= 1200 ? 'concentracao' : 'formacao'
        );
      }

      if (f.finished) {
        finishSafely();
      }
    };

    // Garante estado inicial exato antes do primeiro tick
    applyFrame(0);

    const step = (now: number) => {
      if (finished) return;
      if (!startTime) startTime = now;
      const elapsed = now - startTime;
      applyFrame(elapsed);
      if (!finished && elapsed < INTRO_TOTAL_DURATION_MS) {
        rafId = window.requestAnimationFrame(step);
      }
    };

    rafId = window.requestAnimationFrame(step);
    const failsafeId = window.setTimeout(finishSafely, INTRO_FAILSAFE_MS);

    const handleReducedChange = () => {
      if (reducedMql.matches) finishSafely();
    };
    reducedMql.addEventListener?.('change', handleReducedChange);

    return () => {
      finished = true;
      if (rafId) window.cancelAnimationFrame(rafId);
      window.clearTimeout(failsafeId);
      reducedMql.removeEventListener?.('change', handleReducedChange);
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, []);

  return (
    <div
      ref={rootRef}
      data-portal-intro="true"
      data-intro-stage="despertar"
      role="presentation"
      aria-hidden="true"
      className="fixed inset-0 z-[10000] overflow-hidden select-none flex items-center justify-center"
    >
      {/* ====================================================================
          CAMADA 01 + CAMADA 02 + NÉVOA AUXILIAR (SUJEITOS À MÁSCARA CIRCULAR)
          ==================================================================== */}
      <div
        ref={backdropMaskRef}
        data-intro-mask="true"
        className="absolute inset-0 bg-[var(--bg-canvas)] flex items-center justify-center overflow-hidden"
      >
        {/* Glow energético pastel sutil ao redor do centro */}
        <div
          ref={glowRef}
          style={{ opacity: 0 }}
          className="pointer-events-none absolute w-[min(92vw,700px)] aspect-square rounded-full bg-[radial-gradient(circle,rgba(161,138,200,0.20)_0%,rgba(164,199,90,0.14)_36%,transparent_72%)] dark:bg-[radial-gradient(circle,rgba(161,138,200,0.28)_0%,rgba(164,199,90,0.18)_36%,transparent_72%)] will-change-[opacity]"
        />

        {/* Camada auxiliar: névoa cósmica de singularidade (apenas dark mode, screen) */}
        <div
          ref={mistRef}
          style={{ opacity: 0 }}
          className="hidden dark:flex pointer-events-none absolute inset-0 items-center justify-center will-change-[transform,opacity]"
        >
          <picture className="w-[min(115vw,1060px)] max-w-none flex items-center justify-center">
            <source srcSet="/assets/intro-mist.webp" type="image/webp" />
            <img
              src="/assets/aistudio/Buraco_Negro_em_N_voa_C_smica_1a774422.png"
              alt=""
              draggable={false}
              className="w-full h-auto block object-contain opacity-[0.62] mix-blend-screen [mask-image:radial-gradient(ellipse_88%_82%_at_50%_50%,black_45%,transparent_94%)]"
            />
          </picture>
        </div>

        {/* Camada 02: Dark neotribais periféricos posicionados nas extremidades */}
        <div
          ref={tribalsRef}
          style={{ opacity: 0 }}
          className="pointer-events-none absolute inset-0 flex items-center justify-center will-change-[transform,opacity]"
        >
          <picture className="flex items-center justify-center w-[100vw] max-w-[1620px] max-sm:w-auto max-sm:h-[88vh]">
            <source srcSet="/assets/intro-tribals.webp" type="image/webp" />
            <img
              src="/assets/aistudio/Ornamentos_Tribais_Neon_Sim_tricos_858157d2.png"
              alt=""
              draggable={false}
              className="w-full h-auto max-sm:h-full max-sm:w-auto max-sm:max-w-none block object-contain opacity-[0.38] contrast-[1.04] dark:opacity-[0.58] dark:contrast-100"
            />
          </picture>
        </div>
      </div>

      {/* ====================================================================
          CAMADA 03: FILAMENTOS ENERGÉTICOS EXTERNOS (ROTAÇÃO OPOSTA + EXPANSÃO)
          ==================================================================== */}
      <div
        ref={filamentsRef}
        style={{ opacity: 0 }}
        className="pointer-events-none absolute flex items-center justify-center w-[min(92vw,720px)] sm:w-[min(78vw,820px)] lg:w-[min(64vw,900px)] aspect-[3/2] will-change-[transform,opacity]"
      >
        <picture className="w-full h-full flex items-center justify-center">
          <source srcSet="/assets/intro-filaments.webp" type="image/webp" />
          <img
            src="/assets/aistudio/V_rtice_Espectral_Neon_em_Halo_79c42089.png"
            alt=""
            draggable={false}
            className="w-full h-full block object-contain opacity-[0.68] brightness-[0.84] contrast-[1.08] dark:opacity-[0.88] dark:brightness-100 dark:contrast-100 dark:mix-blend-screen"
          />
        </picture>
      </div>

      {/* ====================================================================
          CAMADA 05: CÍRCULOS ORBITAIS EXTREMAMENTE FINOS (SVG)
          ==================================================================== */}
      <div
        ref={orbitalsRef}
        style={{ opacity: 0 }}
        className="pointer-events-none absolute flex items-center justify-center w-[min(78vw,480px)] sm:w-[min(62vw,540px)] lg:w-[min(48vw,580px)] aspect-square will-change-[transform,opacity]"
      >
        <svg
          viewBox="0 0 400 400"
          fill="none"
          className="w-full h-full text-[var(--text-primary)] opacity-[0.26] dark:opacity-[0.32]"
        >
          <circle
            cx="200"
            cy="200"
            r="164"
            stroke="currentColor"
            strokeWidth="0.7"
            strokeDasharray="2 7"
          />
          <circle
            cx="200"
            cy="200"
            r="186"
            stroke="currentColor"
            strokeWidth="0.65"
            strokeOpacity="0.72"
          />
          <path
            d="M200 10 A190 190 0 0 1 355 90"
            stroke="var(--accent-uv)"
            strokeWidth="0.95"
            strokeOpacity="0.65"
          />
          <path
            d="M200 390 A190 190 0 0 1 45 310"
            stroke="var(--accent-acid)"
            strokeWidth="0.95"
            strokeOpacity="0.6"
          />
        </svg>
      </div>

      {/* ====================================================================
          CAMADA 04: ANEL ENERGÉTICO CIRCULAR ANEXADO (TRAÇA A ABERTURA DO PORTAL)
          ==================================================================== */}
      <div
        ref={ringRef}
        style={{ opacity: 0 }}
        className="pointer-events-none absolute flex items-center justify-center w-[min(66vw,410px)] sm:w-[min(52vw,460px)] lg:w-[min(40vw,500px)] aspect-square will-change-[transform,opacity]"
      >
        <picture className="w-full h-full flex items-center justify-center">
          <source srcSet="/assets/intro-ring.webp" type="image/webp" />
            <img
              src="/assets/aistudio/Portal_Ritual_Et_reo_Limiar_881e8aa3.png"
              alt=""
              draggable={false}
              className="w-full h-full block object-contain opacity-[0.82] brightness-[0.82] contrast-[1.12] dark:opacity-[0.94] dark:brightness-100 dark:contrast-105"
            />
        </picture>
      </div>

      {/* ====================================================================
          CAMADA 06: PEQUENOS PONTOS LUMINOSOS EM VERDE PASTEL E ULTRAVIOLETA
          ==================================================================== */}
      <div
        ref={particlesOuterRef}
        style={{ opacity: 0 }}
        className="pointer-events-none absolute flex items-center justify-center w-[min(78vw,480px)] sm:w-[min(62vw,540px)] lg:w-[min(48vw,580px)] aspect-square will-change-[transform,opacity]"
      >
        <div ref={particlesOrbitARef} className="absolute inset-0">
          <span className="absolute top-[7%] left-1/2 -translate-x-1/2 w-[4.5px] h-[4.5px] rounded-full bg-[#A4C75A] shadow-[0_0_10px_rgba(164,199,90,0.85)]" />
          <span className="absolute bottom-[8%] left-1/2 -translate-x-1/2 w-[3.5px] h-[3.5px] rounded-full bg-[#A18AC8] shadow-[0_0_10px_rgba(161,138,200,0.85)]" />
          <span className="absolute top-[28%] right-[9%] w-[3px] h-[3px] rounded-full bg-[#A18AC8] shadow-[0_0_8px_rgba(161,138,200,0.8)]" />
          <span className="absolute bottom-[28%] left-[9%] w-[3px] h-[3px] rounded-full bg-[#A4C75A] shadow-[0_0_8px_rgba(164,199,90,0.8)]" />
        </div>
        <div ref={particlesOrbitBRef} className="absolute inset-[10%]">
          <span className="absolute top-1/2 left-[2%] -translate-y-1/2 w-[3.5px] h-[3.5px] rounded-full bg-[#A18AC8] shadow-[0_0_9px_rgba(161,138,200,0.85)]" />
          <span className="absolute top-1/2 right-[2%] -translate-y-1/2 w-[3.5px] h-[3.5px] rounded-full bg-[#A4C75A] shadow-[0_0_9px_rgba(164,199,90,0.85)]" />
        </div>
      </div>

      {/* ====================================================================
          CAMADA 07: LOGO OFICIAL DE LIMIAR CENTRALIZADA (BRANCA NO DARK / PRETA NO LIGHT)
          ==================================================================== */}
      <div
        ref={logoRef}
        style={{ opacity: 0 }}
        className="pointer-events-none relative z-10 flex items-center justify-center will-change-[transform,opacity,filter]"
      >
        <img
          src="/assets/aistudio/LIMIAR_LOGO_d4da5a59.png"
          alt="Limiar"
          draggable={false}
          className="w-[144px] sm:w-[178px] lg:w-[206px] h-auto object-contain select-none invert mix-blend-multiply dark:invert-0 dark:mix-blend-screen"
        />
      </div>
    </div>
  );
}
