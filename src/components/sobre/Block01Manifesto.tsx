import React, { useEffect, useRef } from 'react';
import { BLOCO_01_CONTENT } from '../../data/sobreLimiarContent';
import { computeBlock01State } from '../../motion/sobreTimeline';
import { OrganicFiligree } from './OrganicFiligree';
import { applyVisualState, resetVisualState } from './sobreDomHelpers';

export interface SobreBlockProps {
  registerApply: (fn: (progress: number | null) => void) => void;
}

export function Block01Manifesto({ registerApply }: SobreBlockProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLDivElement | null>(null);
  const paraRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const photoRef = useRef<HTMLDivElement | null>(null);
  const grafismoRef = useRef<HTMLDivElement | null>(null);
  const grafismoSecondaryRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    registerApply((p) => {
      if (p === null) {
        resetVisualState(stageRef.current);
        resetVisualState(panelRef.current);
        resetVisualState(titleRef.current);
        paraRefs.current.forEach((el) => resetVisualState(el));
        resetVisualState(photoRef.current);
        resetVisualState(grafismoRef.current, false);
        resetVisualState(grafismoSecondaryRef.current, false);
        return;
      }

      const st = computeBlock01State(p);
      if (stageRef.current) {
        stageRef.current.style.pointerEvents = st.interactive ? 'auto' : 'none';
      }

      applyVisualState(panelRef.current, st.panel, { allowPointer: true });
      applyVisualState(titleRef.current, st.title);
      st.paragraphs.forEach((ps, i) => applyVisualState(paraRefs.current[i] ?? null, ps));

      const clip =
        st.photo.clipRightPercent > 0.1
          ? `inset(0 ${st.photo.clipRightPercent.toFixed(2)}% 0 0 round 26px)`
          : undefined;
      applyVisualState(photoRef.current, st.photo, { clipPath: clip });
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
      className="relative mx-auto max-w-[1360px] w-full px-4 sm:px-8 pt-10 pb-16 md:pt-20 md:pb-8 md:h-full flex items-center"
    >
      {/* Camada de fundo exclusiva para dois filamentos neotribais assimétricos (z-0, atrás de tudo) */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-visible">
        <OrganicFiligree
          ref={grafismoRef}
          src={BLOCO_01_CONTENT.grafismos[0]}
          opacityClass="opacity-[0.58]"
          className="absolute -right-20 sm:-right-24 lg:-right-32 -top-12 lg:-top-20 w-[300px] sm:w-[440px] lg:w-[560px] h-[440px] sm:h-[620px] lg:h-[780px] -rotate-[16deg]"
        />
        <OrganicFiligree
          ref={grafismoSecondaryRef}
          src={BLOCO_01_CONTENT.grafismos[1]}
          opacityClass="opacity-[0.52]"
          className="absolute -left-24 sm:-left-28 lg:-left-32 -bottom-20 lg:-bottom-28 w-[240px] sm:w-[370px] lg:w-[460px] h-[340px] sm:h-[500px] lg:h-[620px] rotate-[24deg]"
        />
      </div>

      <div className="relative z-10 w-full grid grid-cols-1 lg:grid-cols-12 items-center gap-6 lg:gap-6">
        {/* Coluna textual à esquerda: Título forte + painel glassmorphism */}
        <div className="lg:col-span-5 relative z-20 space-y-5">
          <div ref={titleRef} className="space-y-3">
            <div className="flex items-center gap-3 text-[var(--text-muted)]">
              <span aria-hidden="true" className="w-6 h-[1px] bg-[var(--border-strong)]" />
              <p className="text-[11px] uppercase tracking-[0.22em] font-medium">
                {BLOCO_01_CONTENT.eyebrow}
              </p>
            </div>
            <h2 className="font-display font-bold text-3xl sm:text-5xl xl:text-[54px] leading-[1.03] tracking-[-0.02em] text-[var(--text-primary)] text-balance">
              {BLOCO_01_CONTENT.headline}
            </h2>
          </div>

          <div
            ref={panelRef}
            className="glass-surface rounded-[20px] sm:rounded-[28px] p-6 sm:p-8 space-y-4"
          >
            {BLOCO_01_CONTENT.paragraphs.map((text, idx) => (
              <p
                key={idx}
                ref={(node) => {
                  paraRefs.current[idx] = node;
                }}
                className={
                  idx === 2
                    ? 'text-[15px] sm:text-base font-medium text-[var(--text-primary)] leading-[1.65] pt-2 border-t border-[var(--border-hairline)]'
                    : 'text-[15px] sm:text-base text-[var(--text-secondary)] leading-[1.7]'
                }
              >
                {text}
              </p>
            ))}
          </div>
        </div>

        {/* Fotografia protagonista horizontal DARKWING à direita */}
        <div className="lg:col-span-7 relative z-10">
          <div
            ref={photoRef}
            className="relative rounded-[20px] sm:rounded-[28px] overflow-hidden border border-[var(--border-hairline)] bg-[var(--bg-card-media)] shadow-[var(--shadow-elevated)] aspect-[16/9]"
          >
            <img
              src={BLOCO_01_CONTENT.image.src}
              alt={BLOCO_01_CONTENT.image.alt}
              width={BLOCO_01_CONTENT.image.width}
              height={BLOCO_01_CONTENT.image.height}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center rounded-[inherit]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
