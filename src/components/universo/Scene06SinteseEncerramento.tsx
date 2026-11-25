import React, { useCallback, useEffect, useRef } from 'react';
import { UNIVERSO_ASSETS } from '../../data/universoLimiarAssets';
import { computeScene06Synthesis } from '../../motion/universoTimeline';
import { useThresholdPointer } from '../../motion/ThresholdMotionProvider';
import { LimiarStar } from '../ornaments/CybersigilismOrnaments';
import { LimiarLogo } from '../ui/LimiarLogo';
import { UltravioletButton } from '../ui/UltravioletButton';
import type { UniversoSceneProps } from './Scene01FraturaDimensional';

/**
 * CENA 06 — SÍNTESE E ENCERRAMENTO
 * Fragmentos de todas as cenas retornam em trajetórias espaciais curvas,
 * convergem em uma montagem editorial única, estabilizam para contemplação e
 * deslocam-se para as extremidades, liberando o espaço negativo para a logo
 * oficial e a assinatura final de Limiar.
 */
export function Scene06SinteseEncerramento({ isMobile, registerApply }: UniversoSceneProps) {
  const { nx, ny, reducedMotion } = useThresholdPointer();
  const fragmentRefs = useRef<(HTMLDivElement | null)[]>([]);
  const collageWorldRef = useRef<HTMLDivElement | null>(null);
  const signatureRef = useRef<HTMLDivElement | null>(null);

  const stabilityRef = useRef(0);
  const activeRef = useRef(false);

  const apply = useCallback(
    (progress: number, isActive: boolean) => {
      activeRef.current = isActive;
      const p = reducedMotion ? 0.94 : progress;
      const state = computeScene06Synthesis(p, isMobile);
      stabilityRef.current = state.collageStability;

      state.fragments.forEach((frag, idx) => {
        const el = fragmentRefs.current[idx];
        if (!el) return;
        el.style.opacity = String(frag.opacity);
        el.style.transform = `translate3d(${frag.tx}px, ${frag.ty}px, ${frag.tz}px) rotate(${frag.rotDeg}deg) scale(${frag.scale})`;
      });

      if (signatureRef.current) {
        signatureRef.current.style.opacity = String(state.signatureOpacity);
        signatureRef.current.style.transform = `translate3d(0, ${state.signatureY}px, 0) scale(${state.signatureScale})`;
        signatureRef.current.style.pointerEvents = state.ctaInteractive ? 'auto' : 'none';
      }
    },
    [isMobile, reducedMotion]
  );

  useEffect(() => {
    registerApply(apply);
    apply(0, false);
  }, [registerApply, apply]);

  useEffect(() => {
    if (reducedMotion || isMobile) return;
    const unsubX = nx.on('change', (vx) => {
      if (!activeRef.current || !collageWorldRef.current) return;
      const weight = stabilityRef.current;
      collageWorldRef.current.style.transform = `perspective(1200px) rotateY(${(vx * 3.5 * weight).toFixed(2)}deg)`;
    });
    const unsubY = ny.on('change', (vy) => {
      if (!activeRef.current || !collageWorldRef.current) return;
      const weight = stabilityRef.current;
      collageWorldRef.current.style.transform = `perspective(1200px) rotateX(${(-vy * 2.5 * weight).toFixed(2)}deg)`;
    });
    return () => {
      unsubX();
      unsubY();
    };
  }, [nx, ny, reducedMotion, isMobile]);

  const portrait = UNIVERSO_ASSETS.editorial.identityPortrait;
  const darkpsy = UNIVERSO_ASSETS.cultural.darkpsyStage;
  const skate = UNIVERSO_ASSETS.cultural.skateUrban;
  const macro = UNIVERSO_ASSETS.textileDetails.fabricMacro;
  const cutout = UNIVERSO_ASSETS.modelCutouts.officialModel;
  const cyber = UNIVERSO_ASSETS.graphics.cybersigilismOverlay;

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-[var(--bg-canvas)] select-none">
      {/* Atmosfera sutil de encerramento */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(58% 48% at 50% 48%, var(--atmosphere-radial-1) 0%, transparent 74%)',
        }}
      />

      {/* CAMADA DE CONVERGÊNCIA & DESCONSTRUÇÃO DOS FRAGMENTOS */}
      <div
        ref={collageWorldRef}
        className="pointer-events-none relative w-[92vw] max-w-[1040px] h-[68vh] sm:h-[74vh] flex items-center justify-center"
        style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
      >
        {/* Fragmento 0: Retrato Editorial (Superior Esquerdo da Colagem) */}
        <div
          ref={(node) => {
            fragmentRefs.current[0] = node;
          }}
          className="absolute left-[4%] sm:left-[8%] top-[8%] w-[40vw] sm:w-[24vw] max-w-[270px] aspect-[3/4] overflow-hidden border border-[var(--border-hairline)] bg-[var(--bg-card-media)] shadow-[var(--shadow-glass)] opacity-0 will-change-transform"
        >
          <img
            src={portrait.src}
            alt={portrait.alt}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
            style={{ objectPosition: portrait.objectPosition }}
          />
        </div>

        {/* Fragmento 1: Cultura Darkpsy (Superior Direito) */}
        <div
          ref={(node) => {
            fragmentRefs.current[1] = node;
          }}
          className="absolute right-[4%] sm:right-[7%] top-[12%] w-[46vw] sm:w-[30vw] max-w-[350px] aspect-[16/9] overflow-hidden border border-[var(--border-hairline)] bg-[var(--bg-card-media)] shadow-[var(--shadow-glass)] opacity-0 will-change-transform"
        >
          <img
            src={darkpsy.src}
            alt={darkpsy.alt}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Fragmento 2: Skate Concreto (Inferior Esquerdo) */}
        <div
          ref={(node) => {
            fragmentRefs.current[2] = node;
          }}
          className="absolute left-[6%] sm:left-[12%] bottom-[10%] w-[44vw] sm:w-[27vw] max-w-[320px] aspect-[4/3] overflow-hidden border border-[var(--border-hairline)] bg-[var(--bg-card-media)] shadow-[var(--shadow-glass)] opacity-0 will-change-transform"
        >
          <img
            src={skate.src}
            alt={skate.alt}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Fragmento 3: Textura Têxtil Macro (Inferior Direito) */}
        <div
          ref={(node) => {
            fragmentRefs.current[3] = node;
          }}
          className="absolute right-[6%] sm:right-[10%] bottom-[12%] w-[40vw] sm:w-[24vw] max-w-[280px] aspect-[4/3] overflow-hidden border border-[var(--border-hairline)] bg-[var(--bg-card-media)] shadow-[var(--shadow-glass)] opacity-0 will-change-transform"
        >
          <img
            src={macro.src}
            alt={macro.alt}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Fragmento 4: Recorte da Modelo Oficial no Centro da Colagem */}
        <div
          ref={(node) => {
            fragmentRefs.current[4] = node;
          }}
          className="absolute z-10 w-[56vw] sm:w-[32vw] max-w-[380px] opacity-0 will-change-transform"
        >
          <img
            src={cutout.src}
            alt={cutout.alt}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="w-full h-auto object-contain drop-shadow-[0_24px_48px_rgba(0,0,0,0.45)] [mask-image:linear-gradient(to_bottom,black_0%,black_85%,transparent_100%)]"
          />
        </div>

        {/* Fragmento 5: Grafismo Cybersigilism & Plano Tipográfico */}
        <div
          ref={(node) => {
            fragmentRefs.current[5] = node;
          }}
          className="absolute z-20 flex flex-col items-center justify-center opacity-0 will-change-transform"
        >
          <img
            src={cyber.src}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="w-56 sm:w-80 h-auto object-contain opacity-35 dark:opacity-45 invert mix-blend-multiply dark:invert-0 dark:mix-blend-screen"
          />
          <span className="mt-2 font-display text-[11px] uppercase tracking-[0.28em] text-[var(--text-primary)] bg-[var(--bg-glass-strong)] px-3 py-1 border border-[var(--border-hairline)]">
            IDENTIDADE · CULTURA · FREQUÊNCIA
          </span>
        </div>
      </div>

      {/* ESPAÇO NEGATIVO & ASSINATURA FINAL LIMIAR */}
      <div
        ref={signatureRef}
        className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center px-6 opacity-0 will-change-transform"
      >
        <div className="max-w-2xl w-full flex flex-col items-center text-center space-y-6 sm:space-y-7">
          {/* Logo Oficial Limiar */}
          <LimiarLogo className="h-16 sm:h-20 w-auto" alt="Limiar" />

          <div className="flex items-center gap-3 text-[var(--text-muted)]">
            <span className="w-10 h-[1px] bg-[var(--border-strong)]" />
            <span className="text-[11px] uppercase tracking-[0.28em] font-medium text-[var(--text-primary)]">
              LIMIAR
            </span>
            <span className="w-10 h-[1px] bg-[var(--border-strong)]" />
          </div>

          <div className="space-y-3">
            <h2 className="font-display font-light text-2xl sm:text-4xl lg:text-[42px] leading-[1.12] tracking-[0.02em] text-[var(--text-primary)] text-balance">
              Não existe uma versão definitiva de quem somos.
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              A travessia não acontece duas vezes da mesma forma.
            </p>
            <p className="inline-flex items-center gap-2 text-xs sm:text-sm uppercase tracking-[0.2em] text-[var(--accent-uv)] font-medium pt-1">
              <LimiarStar className="w-3.5 h-3.5 shrink-0" />
              <span>Existe um outro lado.</span>
            </p>
          </div>

          <div className="pt-2">
            <UltravioletButton href="/loja" variant="primary" size="lg">
              ATRAVESSE O LIMIAR.
            </UltravioletButton>
          </div>
        </div>
      </div>
    </div>
  );
}
