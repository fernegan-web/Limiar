import React, { useEffect, useRef } from 'react';
import { BLOCO_05_CONTENT } from '../../data/sobreLimiarContent';
import { computeBlock05State } from '../../motion/sobreTimeline';
import { OrganicFiligree } from './OrganicFiligree';
import type { SobreBlockProps } from './Block01Manifesto';
import { applyVisualState, resetVisualState } from './sobreDomHelpers';

export function Block05Autorais({ registerApply }: SobreBlockProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const headerPanelRef = useRef<HTMLDivElement | null>(null);
  const teeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const captionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const grafismoRef = useRef<HTMLDivElement | null>(null);
  const grafismoSecondaryRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    registerApply((p) => {
      if (p === null) {
        resetVisualState(stageRef.current);
        resetVisualState(headerPanelRef.current);
        teeRefs.current.forEach((el) => resetVisualState(el));
        captionRefs.current.forEach((el) => resetVisualState(el));
        resetVisualState(grafismoRef.current, false);
        resetVisualState(grafismoSecondaryRef.current, false);
        return;
      }

      const st = computeBlock05State(p);
      if (stageRef.current) {
        stageRef.current.style.pointerEvents = st.interactive ? 'auto' : 'none';
      }

      applyVisualState(headerPanelRef.current, st.headerPanel, { allowPointer: true });
      st.tees.forEach((ts, i) => applyVisualState(teeRefs.current[i] ?? null, ts));
      st.captions.forEach((cs, i) => applyVisualState(captionRefs.current[i] ?? null, cs));
      applyVisualState(grafismoRef.current, st.grafismo, {
        extraY: st.grafismo.ambientY,
        allowPointer: false,
      });
      applyVisualState(grafismoSecondaryRef.current, st.grafismoSecondary, {
        extraY: st.grafismoSecondary.ambientY,
        allowPointer: false,
      });
    });
  }, [registerApply]);

  return (
    <div
      ref={stageRef}
      className="relative mx-auto max-w-[1360px] w-full px-4 sm:px-8 py-12 md:pt-20 md:pb-6 md:h-full flex items-center"
    >
      {/* Dois filamentos neotribais em cantos opostos atrás dos cards autorais (z-0) */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-visible">
        <OrganicFiligree
          ref={grafismoRef}
          src={BLOCO_05_CONTENT.grafismos[0]}
          opacityClass="opacity-[0.55]"
          className="absolute -right-24 sm:-right-28 -bottom-20 lg:-bottom-28 w-[320px] sm:w-[460px] lg:w-[580px] h-[460px] sm:h-[640px] lg:h-[780px] rotate-[22deg]"
        />
        <OrganicFiligree
          ref={grafismoSecondaryRef}
          src={BLOCO_05_CONTENT.grafismos[1]}
          opacityClass="opacity-[0.52]"
          className="absolute -left-24 sm:-left-28 -top-20 lg:-top-28 w-[240px] sm:w-[370px] lg:w-[470px] h-[340px] sm:h-[510px] lg:h-[630px] -rotate-[14deg]"
        />
      </div>

      <div className="relative z-10 w-full space-y-5 lg:space-y-6">
        {/* Cabeçalho editorial compacto em glassmorphism */}
        <div
          ref={headerPanelRef}
          className="relative z-20 glass-surface rounded-[20px] sm:rounded-[28px] p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8 items-center"
        >
          <div className="lg:col-span-4 space-y-2">
            <div className="flex items-center gap-3 text-[var(--text-muted)]">
              <span aria-hidden="true" className="w-6 h-[1px] bg-[var(--border-strong)]" />
              <p className="text-[11px] uppercase tracking-[0.22em] font-medium">
                {BLOCO_05_CONTENT.eyebrow}
              </p>
            </div>
            <h2 className="font-display font-bold text-3xl sm:text-4xl leading-[1.06] tracking-[-0.015em] text-[var(--text-primary)] text-balance">
              {BLOCO_05_CONTENT.headline}
            </h2>
          </div>

          <div className="lg:col-span-8 space-y-2">
            {BLOCO_05_CONTENT.paragraphs.map((text, idx) => (
              <p
                key={idx}
                className="text-[14px] sm:text-[15px] text-[var(--text-secondary)] leading-[1.58]"
              >
                {text}
              </p>
            ))}
          </div>
        </div>

        {/* Três criações autorais com maior presença visual sobre cards translúcidos */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-7">
          {BLOCO_05_CONTENT.pieces.map((piece, idx) => (
            <div
              key={piece.id}
              ref={(node) => {
                teeRefs.current[idx] = node;
              }}
              className="glass-surface rounded-[20px] sm:rounded-[28px] px-4 pt-4 pb-5 sm:px-6 sm:pt-5 sm:pb-6 flex flex-col items-center text-center"
            >
              <div className="relative w-full max-w-[290px] sm:max-w-[310px] lg:max-w-[330px] h-[270px] sm:h-[300px] lg:h-[40vh] lg:max-h-[365px] flex items-center justify-center">
                {/* Halo neutro sutil para destacar as peças escuras dentro dos cards */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-4 rounded-full bg-[radial-gradient(circle_at_50%_46%,rgba(20,21,22,0.08),transparent_70%)] dark:bg-[radial-gradient(circle_at_50%_46%,rgba(232,231,224,0.08),transparent_70%)]"
                />
                <img
                  src={piece.image.src}
                  alt={piece.image.alt}
                  width={piece.image.width}
                  height={piece.image.height}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="relative z-10 w-full h-full object-contain scale-[1.06] drop-shadow-[0_18px_32px_rgba(0,0,0,0.28)]"
                />
              </div>

              <div
                ref={(node) => {
                  captionRefs.current[idx] = node;
                }}
                className="pt-3 border-t border-[var(--border-hairline)] w-full space-y-1"
              >
                <h3 className="font-display font-semibold text-base sm:text-lg tracking-[0.02em] text-[var(--text-primary)]">
                  {piece.name}
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                  {piece.subtitle}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
