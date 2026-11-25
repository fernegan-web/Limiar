import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { UNIVERSO_ASSETS } from '../../data/universoLimiarAssets';
import {
  computeScene01Fracture,
  type FractureShardState,
} from '../../motion/universoTimeline';
import { useThresholdPointer } from '../../motion/ThresholdMotionProvider';
import { EclipseSigil, LimiarStar } from '../ornaments/CybersigilismOrnaments';

export interface UniversoSceneProps {
  isMobile: boolean;
  registerApply: (fn: (progress: number, active: boolean) => void) => void;
}

const DESKTOP_SHARD_INDICES = [0, 1, 2, 3, 4, 5, 6];
const MOBILE_SHARD_INDICES = [0, 1, 2, 3, 4];

/**
 * CENA 01 — FRATURA DIMENSIONAL
 * Tipografia monumental contínua sobre 5–7 lâminas verticais assimétricas.
 * Conforme o scroll avança, a superfície se fratura em Z, inclina em perspectiva,
 * rotaciona cada lâmina em 180deg revelando a fotografia editorial do verso
 * e se recompõe perfeitamente na imagem inicial da Cena 02.
 */
export function Scene01FraturaDimensional({ isMobile, registerApply }: UniversoSceneProps) {
  const { reducedMotion } = useThresholdPointer();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const shardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const seamRefs = useRef<(HTMLDivElement | null)[]>([]);
  const secondaryCopyRef = useRef<HTMLDivElement | null>(null);
  const seamlessPortraitRef = useRef<HTMLDivElement | null>(null);
  const shardConfig = useMemo(
    () => computeScene01Fracture(0, isMobile).shards,
    [isMobile]
  );
  const shardIndices = isMobile ? MOBILE_SHARD_INDICES : DESKTOP_SHARD_INDICES;

  const apply = useCallback(
    (progress: number, _active: boolean) => {
      const p = reducedMotion ? (progress > 0.5 ? 1 : 0) : progress;
      const state = computeScene01Fracture(p, isMobile);

      if (stageRef.current) {
        stageRef.current.style.transform = `perspective(1400px) rotateX(${state.stageTiltXDeg}deg) rotateZ(${state.stageTiltDeg}deg) scale(${state.stageZoom})`;
      }

      state.shards.forEach((shard: FractureShardState, idx: number) => {
        const el = shardRefs.current[idx];
        if (el) {
          el.style.transform = `translate3d(${shard.translateX}px, ${shard.translateY}px, ${shard.translateZ}px) rotateY(${shard.rotateYDeg}deg) rotateX(${shard.rotateXDeg}deg) scale(${shard.scale})`;
        }
        const seam = seamRefs.current[idx];
        if (seam) {
          seam.style.opacity = String(state.seamLineOpacity);
        }
      });

      if (secondaryCopyRef.current) {
        secondaryCopyRef.current.style.opacity = String(state.secondaryCaptionOpacity);
        secondaryCopyRef.current.style.transform = `translate3d(0, ${(1 - state.secondaryCaptionOpacity) * 14}px, 0)`;
      }

      if (seamlessPortraitRef.current) {
        seamlessPortraitRef.current.style.opacity = String(state.reconstructedSeamlessBlend);
      }
    },
    [isMobile, reducedMotion]
  );

  useEffect(() => {
    registerApply(apply);
    apply(0, false);
  }, [registerApply, apply]);

  const portrait = UNIVERSO_ASSETS.editorial.identityPortrait;

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-[var(--bg-canvas)] select-none">
      {/* Atmosfera contida da Cena 01 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(65% 55% at 50% 48%, var(--atmosphere-radial-1) 0%, transparent 74%)',
        }}
      />

      {/* Palco 3D das lâminas assimétricas */}
      <div
        ref={stageRef}
        className="relative w-[90vw] max-w-[920px] h-[66vh] sm:h-[72vh] max-h-[680px]"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {shardIndices.map((idx) => {
          const shard = shardConfig[idx];
          if (!shard) return null;
          const innerWidthPct = (100 / shard.widthPct) * 100;
          const innerLeftPct = -(shard.leftPct / shard.widthPct) * 100;

          return (
            <div
              key={`fracture-shard-${idx}-${shardIndices.length}`}
              ref={(node) => {
                shardRefs.current[idx] = node;
              }}
              className="absolute inset-y-0 will-change-transform"
              style={{
                left: `${shard.leftPct}%`,
                width: `${shard.widthPct}%`,
                transformStyle: 'preserve-3d',
              }}
            >
              {/* FACE FRONTAL: TIPOGRAFIA MONUMENTAL CONTÍNUA FRATURADA */}
              <div
                className="absolute inset-0 overflow-hidden bg-[var(--bg-elevated)] border-y border-[var(--border-hairline)]"
                style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
              >
                <div
                  className="absolute inset-y-0"
                  style={{
                    width: `${innerWidthPct}%`,
                    left: `${innerLeftPct}%`,
                  }}
                >
                  <div className="relative w-full h-full flex flex-col justify-between p-6 sm:p-10 lg:p-12">
                    {/* Topo editorial */}
                    <div className="flex items-center justify-between gap-4 border-b border-[var(--border-hairline)] pb-4">
                      <div className="flex items-center gap-2.5 text-[var(--text-muted)]">
                        <EclipseSigil className="w-4 h-4 text-[var(--accent-uv)] shrink-0" />
                        <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.26em] font-medium">
                          ALÉM DA TRAVESSIA
                        </span>
                      </div>
                      <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)] tabular-nums">
                        01 — 02
                      </span>
                    </div>

                    {/* Bloco Tipográfico Monumental */}
                    <div className="my-auto py-4 space-y-4 sm:space-y-6">
                      <h2 className="font-display font-light text-[clamp(2.4rem,7.2vw,5.75rem)] leading-[0.94] tracking-[-0.015em] uppercase text-[var(--text-primary)]">
                        UNIVERSO
                        <span className="block font-normal text-[var(--accent-uv)] dark:text-[var(--accent-uv)]">
                          LIMIAR.
                        </span>
                      </h2>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 max-w-2xl pt-2">
                        <p className="text-sm sm:text-base font-medium text-[var(--text-primary)] leading-snug">
                          Atravessar foi apenas o início.
                        </p>
                        <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                          O que existe do outro lado ainda está em construção.
                        </p>
                      </div>
                    </div>

                    {/* Rodapé da lâmina */}
                    <div className="flex items-center justify-between gap-4 border-t border-[var(--border-hairline)] pt-4">
                      <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">
                        01 — 02 / UMA IDENTIDADE EM CONSTANTE TRANSFORMAÇÃO
                      </span>
                      <LimiarStar className="w-4 h-4 text-[var(--accent-acid)] shrink-0" />
                    </div>
                  </div>
                </div>

                {/* Linha luminosa de corte entre lâminas durante a fratura */}
                <div
                  ref={(node) => {
                    seamRefs.current[idx] = node;
                  }}
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-[var(--accent-uv)] to-transparent opacity-0"
                />
              </div>

              {/* FACE TRASEIRA (VERSO): FRAGMENTOS DA FOTOGRAFIA EDITORIAL */}
              <div
                className="absolute inset-0 overflow-hidden bg-[var(--bg-card-media)]"
                style={{
                  transform: 'rotateY(180deg)',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                }}
              >
                <div
                  className="absolute inset-y-0"
                  style={{
                    width: `${innerWidthPct}%`,
                    left: `${innerLeftPct}%`,
                  }}
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
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/20"
                  />
                </div>
              </div>
            </div>
          );
        })}

        {/* Superfície contínua final sem emendas (mesmo quadro inicial da Cena 02) */}
        <div
          ref={seamlessPortraitRef}
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-[4px] border border-[var(--border-hairline)] opacity-0"
        >
          <img
            src={portrait.src}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
            style={{ objectPosition: portrait.objectPosition }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/20"
          />
        </div>
      </div>

      {/* Micro-legenda flutuante na transição para a Cena 02 */}
      <div
        ref={secondaryCopyRef}
        className="pointer-events-none absolute bottom-7 sm:bottom-10 inset-x-0 z-20 flex justify-center px-6 opacity-0"
      >
        <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--text-primary)] bg-[var(--bg-glass-strong)] backdrop-blur-md px-4 py-1.5 border border-[var(--border-hairline)]">
          01 — 02 · IDENTIDADE EM CONSTRUÇÃO
        </p>
      </div>
    </div>
  );
}
