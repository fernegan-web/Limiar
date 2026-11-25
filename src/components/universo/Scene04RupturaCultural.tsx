import React, { useCallback, useEffect, useRef } from 'react';
import { UNIVERSO_ASSETS } from '../../data/universoLimiarAssets';
import { computeScene04CulturalRupture } from '../../motion/universoTimeline';
import { useThresholdPointer } from '../../motion/ThresholdMotionProvider';
import { EclipseSigil } from '../ornaments/CybersigilismOrnaments';
import type { UniversoSceneProps } from './Scene01FraturaDimensional';

const POLYGON_REGIONS = [
  'polygon(0% 0%, 56% 0%, 42% 48%, 0% 58%)',
  'polygon(56% 0%, 100% 0%, 100% 52%, 42% 48%)',
  'polygon(0% 58%, 42% 48%, 58% 100%, 0% 100%)',
  'polygon(42% 48%, 100% 52%, 100% 100%, 58% 100%)',
] as const;

const LINE_INDICES = [0, 1, 2, 3, 4, 5, 6, 7];

/**
 * CENA 04 — RUPTURA CULTURAL
 * Montagem geométrica rítmica: a superfície recebida da Cena 03 se parte em
 * regiões poligonais assimétricas que deslizam em eixos distintos para revelar
 * fotografias de skate, moda underground e cultura darkpsy em escalas alternadas,
 * convergindo ao final em linhas estruturais que iniciam a Cena 05.
 */
export function Scene04RupturaCultural({ isMobile, registerApply }: UniversoSceneProps) {
  const { reducedMotion } = useThresholdPointer();

  const sliceRefs = useRef<(HTMLDivElement | null)[]>([]);
  const skateRef = useRef<HTMLDivElement | null>(null);
  const apparelRef = useRef<HTMLDivElement | null>(null);
  const bannerRef = useRef<HTMLDivElement | null>(null);
  const headlineRef = useRef<HTMLDivElement | null>(null);
  const phase1CopyRef = useRef<HTMLDivElement | null>(null);
  const phase2CopyRef = useRef<HTMLDivElement | null>(null);
  const handoffGridRef = useRef<HTMLDivElement | null>(null);
  const railRefs = useRef<(HTMLDivElement | null)[]>([]);

  const apply = useCallback(
    (progress: number, _active: boolean) => {
      const p = reducedMotion ? 0.55 : progress;
      const state = computeScene04CulturalRupture(p, isMobile);

      state.initialSlices.forEach((sl, idx) => {
        const el = sliceRefs.current[idx];
        if (!el) return;
        el.style.opacity = String(sl.opacity);
        el.style.transform = `translate3d(${sl.txPct}%, ${sl.tyPct}%, 0) scale(${sl.scale})`;
      });

      if (skateRef.current) {
        skateRef.current.style.opacity = String(state.skatePanelOpacity);
        skateRef.current.style.transform = `translate3d(${state.skatePanelX}px, ${state.skatePanelY}px, 0) scale(${state.skatePanelScale})`;
      }

      if (apparelRef.current) {
        apparelRef.current.style.opacity = String(state.apparelPanelOpacity);
        apparelRef.current.style.transform = `translate3d(${state.apparelPanelX}px, ${state.apparelPanelY}px, 0) scale(${state.apparelPanelScale})`;
      }

      if (bannerRef.current) {
        bannerRef.current.style.opacity = String(state.bannerInsertOpacity);
        bannerRef.current.style.transform = `scale(${state.bannerInsertScale})`;
      }

      if (headlineRef.current) {
        headlineRef.current.style.transform = `translate3d(${state.headlineShiftX}px, 0, 0)`;
      }

      if (phase1CopyRef.current) {
        phase1CopyRef.current.style.opacity = String(state.phase1CopyOpacity);
      }

      if (phase2CopyRef.current) {
        phase2CopyRef.current.style.opacity = String(state.phase2CopyOpacity);
      }

      if (handoffGridRef.current) {
        handoffGridRef.current.style.opacity = String(state.handoffLinesProgress);
      }

      railRefs.current.forEach((rail, idx) => {
        if (!rail) return;
        const dir = idx % 2 === 0 ? 1 : -1;
        const shift = (1 - state.handoffLinesProgress) * dir * 32;
        rail.style.transform = `translate3d(${shift.toFixed(1)}%, 0, 0) scaleX(${(0.35 + state.handoffLinesProgress * 0.65).toFixed(3)})`;
      });
    },
    [isMobile, reducedMotion]
  );

  useEffect(() => {
    registerApply(apply);
    apply(0, false);
  }, [registerApply, apply]);

  const darkpsy = UNIVERSO_ASSETS.cultural.darkpsyStage;
  const skate = UNIVERSO_ASSETS.cultural.skateUrban;
  const tribal = UNIVERSO_ASSETS.textileDetails.tribalPrint;
  const eclipse = UNIVERSO_ASSETS.editorial.eclipseHorizon;

  return (
    <div className="relative w-full h-full overflow-hidden bg-[var(--bg-canvas)] select-none">
      {/* CAMADA BASE REVELADA PELOS CORTES GEOMÉTRICOS: Skate & Energia Urbana */}
      <div
        ref={skateRef}
        className="absolute inset-4 sm:inset-10 lg:inset-14 overflow-hidden border border-[var(--border-hairline)] bg-[var(--bg-card-media)] opacity-0 will-change-transform"
        style={{
          clipPath: isMobile
            ? 'polygon(0% 10%, 100% 0%, 100% 88%, 0% 96%)'
            : 'polygon(6% 6%, 72% 0%, 62% 94%, 0% 100%)',
        }}
      >
        <img
          src={skate.src}
          alt={skate.alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
          style={{ objectPosition: skate.objectPosition }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent"
        />
      </div>

      {/* CONTRA-CORTE DE ESCALA: Peça Streetwear / Grafismo Tribal */}
      <div
        ref={apparelRef}
        className="absolute right-4 sm:right-12 bottom-16 sm:bottom-14 w-[56vw] sm:w-[34vw] max-w-[420px] aspect-[4/5] overflow-hidden border border-[var(--border-strong)] bg-[var(--bg-card-media)] shadow-[var(--shadow-elevated)] opacity-0 will-change-transform z-10"
      >
        <img
          src={tribal.src}
          alt={tribal.alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
          style={{ objectPosition: tribal.objectPosition }}
        />
      </div>

      {/* MOMENTO MINIMALISTA DE ENCAIXE */}
      <div
        ref={bannerRef}
        className="absolute left-5 sm:left-16 bottom-12 sm:bottom-20 w-[72vw] sm:w-[42vw] max-w-[540px] aspect-[16/9] overflow-hidden border border-[var(--border-hairline)] opacity-0 will-change-transform z-10"
      >
        <img
          src={eclipse.src}
          alt={eclipse.alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
          style={{ objectPosition: eclipse.objectPosition }}
        />
      </div>

      {/* 4 REGIÕES POLIGONAIS INICIAIS DA CENA DARKPSY (continuidade direta da Cena 03) */}
      <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
        {POLYGON_REGIONS.map((clip, idx) => (
          <div
            key={`culture-slice-${idx}`}
            ref={(node) => {
              sliceRefs.current[idx] = node;
            }}
            className="absolute inset-0 will-change-transform"
            style={{ clipPath: clip }}
          >
            <img
              src={darkpsy.src}
              alt={idx === 0 ? darkpsy.alt : ''}
              aria-hidden={idx !== 0}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
              style={{ objectPosition: darkpsy.objectPosition }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/20 to-black/55"
            />
          </div>
        ))}
      </div>

      {/* TIPOGRAFIA INTERAGINDO COM OS CORTES GEOMÉTRICOS */}
      <div className="pointer-events-none relative z-30 w-full h-full mx-auto max-w-[1360px] px-5 sm:px-10 flex flex-col justify-between py-20 sm:py-24">
        <div ref={phase1CopyRef} className="max-w-xl space-y-2 opacity-0">
          <div className="inline-flex items-center gap-2 bg-[var(--bg-glass-strong)] backdrop-blur-md border border-[var(--border-hairline)] px-3 py-1.5">
            <EclipseSigil className="w-3.5 h-3.5 text-[var(--accent-acid)] shrink-0" />
            <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-[var(--text-primary)] font-medium">
              CAPÍTULO 02 — CULTURA &amp; DESIGN
            </span>
          </div>

          <div ref={headlineRef} className="will-change-transform pt-2">
            <h3 className="inline-block font-display font-light text-3xl sm:text-5xl lg:text-6xl uppercase tracking-[-0.02em] leading-[0.98] text-[var(--text-primary)] bg-[var(--bg-glass-strong)] backdrop-blur-md border border-[var(--border-hairline)] px-4 sm:px-6 py-2.5 sm:py-3.5 shadow-[var(--shadow-glass)]">
              Da pista às ruas.
            </h3>
          </div>
        </div>

        <div
          ref={phase2CopyRef}
          className="self-end max-w-md bg-[var(--bg-glass-strong)] backdrop-blur-md border border-[var(--border-hairline)] p-5 sm:p-6 space-y-2 opacity-0"
        >
          <p className="text-sm sm:text-base font-medium text-[var(--text-primary)] leading-snug">
            Limiar nasce do encontro entre música, arte, movimento e identidade.
          </p>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
            Da cultura underground às infinitas possibilidades de expressão.
          </p>
        </div>
      </div>

      {/* ALINHAMENTO FINAL EM LINHAS ESTRUTURAIS PREPARANDO A CENA 05 */}
      <div
        ref={handoffGridRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-40 bg-[var(--bg-canvas)] flex flex-col justify-evenly py-12 opacity-0"
      >
        {LINE_INDICES.map((idx) => (
          <div
            key={`handoff-rail-${idx}`}
            ref={(node) => {
              railRefs.current[idx] = node;
            }}
            className="w-full h-[1px] bg-[var(--border-strong)] origin-center will-change-transform"
          />
        ))}
      </div>
    </div>
  );
}
