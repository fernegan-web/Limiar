import React, { useEffect, useRef } from 'react';
import { BLOCO_03_CONTENT } from '../../data/sobreLimiarContent';
import { computeBlock03State } from '../../motion/sobreTimeline';
import { OrganicFiligree } from './OrganicFiligree';
import type { SobreBlockProps } from './Block01Manifesto';
import { applyVisualState, resetVisualState } from './sobreDomHelpers';

const PORTRAIT_SLOTS = [
  'aspect-[10/14.2] sm:-translate-y-2',
  'aspect-[2/3]',
  'aspect-[10/13.8] sm:-translate-y-3',
  'aspect-[10/14.6]',
] as const;

export function Block03Identidade({ registerApply }: SobreBlockProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const textPanelRef = useRef<HTMLDivElement | null>(null);
  const photoRefs = useRef<(HTMLDivElement | null)[]>([]);
  const grafismoRef = useRef<HTMLDivElement | null>(null);
  const grafismoSecondaryRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    registerApply((p) => {
      if (p === null) {
        resetVisualState(stageRef.current);
        resetVisualState(textPanelRef.current);
        photoRefs.current.forEach((el) => resetVisualState(el));
        resetVisualState(grafismoRef.current, false);
        resetVisualState(grafismoSecondaryRef.current, false);
        return;
      }

      const st = computeBlock03State(p);
      if (stageRef.current) {
        stageRef.current.style.pointerEvents = st.interactive ? 'auto' : 'none';
      }

      applyVisualState(textPanelRef.current, st.textPanel, { allowPointer: true });
      st.photos.forEach((ps, i) => {
        const clip =
          ps.clipBottomPercent > 0.1
            ? `inset(${ps.clipBottomPercent.toFixed(2)}% 0 0 0 round 24px)`
            : undefined;
        applyVisualState(photoRefs.current[i] ?? null, ps, { clipPath: clip });
      });
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
      className="relative mx-auto max-w-[1360px] w-full px-4 sm:px-8 py-12 md:pt-20 md:pb-5 md:h-full flex items-center"
    >
      {/* Dois filamentos neotribais em cantos opostos e escalas assimétricas, sempre em z-0 */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-visible">
        <OrganicFiligree
          ref={grafismoRef}
          src={BLOCO_03_CONTENT.grafismos[0]}
          opacityClass="opacity-[0.55]"
          className="absolute -right-20 sm:-right-24 lg:-right-28 -top-16 lg:-top-24 w-[320px] sm:w-[460px] lg:w-[560px] h-[460px] sm:h-[640px] lg:h-[780px] -rotate-[10deg]"
        />
        <OrganicFiligree
          ref={grafismoSecondaryRef}
          src={BLOCO_03_CONTENT.grafismos[1]}
          opacityClass="opacity-[0.52]"
          className="absolute -left-24 sm:-left-28 -bottom-20 lg:-bottom-32 w-[250px] sm:w-[390px] lg:w-[490px] h-[360px] sm:h-[530px] lg:h-[660px] rotate-[19deg]"
        />
      </div>

      <div className="relative z-10 w-full space-y-5 lg:space-y-6">
        {/* Faixa superior larga assimétrica: Título à esquerda + painel de apoio à direita */}
        <div
          ref={textPanelRef}
          className="relative z-20 glass-surface rounded-[20px] sm:rounded-[28px] p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8 items-center"
        >
          <div className="lg:col-span-5 space-y-2">
            <div className="flex items-center gap-3 text-[var(--text-muted)]">
              <span aria-hidden="true" className="w-6 h-[1px] bg-[var(--border-strong)]" />
              <p className="text-[11px] uppercase tracking-[0.22em] font-medium">
                {BLOCO_03_CONTENT.eyebrow}
              </p>
            </div>
            <h2 className="font-display font-bold text-3xl sm:text-4xl xl:text-[42px] leading-[1.06] tracking-[-0.015em] text-[var(--text-primary)] text-balance">
              {BLOCO_03_CONTENT.headline}
            </h2>
          </div>

          <div className="lg:col-span-7 space-y-2">
            {BLOCO_03_CONTENT.paragraphs.map((text, idx) => (
              <p
                key={idx}
                className="text-[14px] sm:text-[15px] text-[var(--text-secondary)] leading-[1.6]"
              >
                {text}
              </p>
            ))}
          </div>
        </div>

        {/* 4 fotografias verticais em proporção editorial preservando looks completos */}
        <div className="relative z-10 mx-auto w-full max-w-[1220px] lg:max-w-[min(100%,1220px,calc(52vh*2.66+48px))] grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 items-end">
          {BLOCO_03_CONTENT.images.map((img, idx) => (
            <div key={img.src} className={PORTRAIT_SLOTS[idx]}>
              <div
                ref={(node) => {
                  photoRefs.current[idx] = node;
                }}
                className="w-full h-full rounded-[18px] sm:rounded-[24px] overflow-hidden border border-[var(--border-hairline)] bg-[var(--bg-card-media)] shadow-[var(--shadow-glass)]"
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  width={img.width}
                  height={img.height}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center rounded-[inherit]"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
