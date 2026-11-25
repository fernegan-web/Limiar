import React, { useEffect, useRef } from 'react';
import { BLOCO_04_CONTENT } from '../../data/sobreLimiarContent';
import { computeBlock04State } from '../../motion/sobreTimeline';
import { OrganicFiligree } from './OrganicFiligree';
import type { SobreBlockProps } from './Block01Manifesto';
import { applyVisualState, resetVisualState } from './sobreDomHelpers';

export function Block04Materia({ registerApply }: SobreBlockProps) {
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

      const st = computeBlock04State(p);
      if (stageRef.current) {
        stageRef.current.style.pointerEvents = st.interactive ? 'auto' : 'none';
      }

      applyVisualState(textPanelRef.current, st.textPanel, { allowPointer: true });
      st.photos.forEach((ps, i) => {
        const inset = ps.clipInsetPercent;
        const clip =
          inset > 0.1
            ? i % 2 === 0
              ? `inset(0 ${inset.toFixed(2)}% 0 0 round 22px)`
              : `inset(${inset.toFixed(2)}% 0 0 0 round 22px)`
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

  const imgs = BLOCO_04_CONTENT.images;

  return (
    <div
      ref={stageRef}
      className="relative mx-auto max-w-[1360px] w-full px-4 sm:px-8 py-12 md:pt-20 md:pb-6 md:h-full flex items-center"
    >
      {/* Dois filamentos neotribais nos espaços negativos externos em cantos opostos (z-0) */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-visible">
        <OrganicFiligree
          ref={grafismoRef}
          src={BLOCO_04_CONTENT.grafismos[0]}
          opacityClass="opacity-[0.58]"
          className="absolute -left-24 sm:-left-28 -top-16 lg:-top-24 w-[340px] sm:w-[480px] lg:w-[580px] h-[480px] sm:h-[660px] lg:h-[800px] rotate-[18deg]"
        />
        <OrganicFiligree
          ref={grafismoSecondaryRef}
          src={BLOCO_04_CONTENT.grafismos[1]}
          opacityClass="opacity-[0.52]"
          className="absolute -right-20 sm:-right-28 -bottom-20 lg:-bottom-28 w-[260px] sm:w-[400px] lg:w-[480px] h-[360px] sm:h-[540px] lg:h-[650px] -rotate-[26deg]"
        />
      </div>

      <div className="relative z-10 w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
        {/* Mosaico editorial compacto com as 6 fotografias reunidas à esquerda */}
        <div className="lg:col-span-7 order-2 lg:order-1 grid grid-cols-2 sm:grid-cols-12 sm:grid-rows-[142px_126px_142px] lg:grid-rows-[170px_148px_170px] gap-3 sm:gap-3.5">
          {/* 01. Estampa tribal — destaque vertical esquerdo */}
          <div
            ref={(node) => {
              photoRefs.current[0] = node;
            }}
            className="col-span-2 sm:col-start-1 sm:col-span-5 sm:row-start-1 sm:row-span-2 aspect-[16/10] sm:aspect-auto sm:h-full rounded-[18px] sm:rounded-[22px] overflow-hidden border border-[var(--border-hairline)] bg-[var(--bg-card-media)] shadow-[var(--shadow-glass)]"
          >
            <img
              src={imgs[0].src}
              alt={imgs[0].alt}
              width={imgs[0].width}
              height={imgs[0].height}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover rounded-[inherit]"
            />
          </div>

          {/* 02. Estampa colorida — faixa superior direita */}
          <div
            ref={(node) => {
              photoRefs.current[1] = node;
            }}
            className="col-span-1 sm:col-start-6 sm:col-span-7 sm:row-start-1 sm:row-span-1 aspect-[4/3] sm:aspect-auto sm:h-full rounded-[16px] sm:rounded-[22px] overflow-hidden border border-[var(--border-hairline)] bg-[var(--bg-card-media)] shadow-[var(--shadow-glass)]"
          >
            <img
              src={imgs[1].src}
              alt={imgs[1].alt}
              width={imgs[1].width}
              height={imgs[1].height}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover rounded-[inherit]"
            />
          </div>

          {/* 03. Macro tecido desgastado — núcleo compacto */}
          <div
            ref={(node) => {
              photoRefs.current[2] = node;
            }}
            className="col-span-1 sm:col-start-6 sm:col-span-3 sm:row-start-2 sm:row-span-1 aspect-[4/3] sm:aspect-auto sm:h-full rounded-[16px] sm:rounded-[20px] overflow-hidden border border-[var(--border-hairline)] bg-[var(--bg-card-media)] shadow-[var(--shadow-glass)]"
          >
            <img
              src={imgs[2].src}
              alt={imgs[2].alt}
              width={imgs[2].width}
              height={imgs[2].height}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover rounded-[inherit]"
            />
          </div>

          {/* 04. Zíper e costuras — âncora vertical direita */}
          <div
            ref={(node) => {
              photoRefs.current[3] = node;
            }}
            className="col-span-1 sm:col-start-9 sm:col-span-4 sm:row-start-2 sm:row-span-2 aspect-[4/3] sm:aspect-auto sm:h-full rounded-[16px] sm:rounded-[22px] overflow-hidden border border-[var(--border-hairline)] bg-[var(--bg-card-media)] shadow-[var(--shadow-glass)]"
          >
            <img
              src={imgs[3].src}
              alt={imgs[3].alt}
              width={imgs[3].width}
              height={imgs[3].height}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover rounded-[inherit]"
            />
          </div>

          {/* 05. Hardware metálico — base esquerda */}
          <div
            ref={(node) => {
              photoRefs.current[4] = node;
            }}
            className="col-span-1 sm:col-start-1 sm:col-span-3 sm:row-start-3 sm:row-span-1 aspect-[4/3] sm:aspect-auto sm:h-full rounded-[16px] sm:rounded-[20px] overflow-hidden border border-[var(--border-hairline)] bg-[var(--bg-card-media)] shadow-[var(--shadow-glass)]"
          >
            <img
              src={imgs[4].src}
              alt={imgs[4].alt}
              width={imgs[4].width}
              height={imgs[4].height}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover rounded-[inherit]"
            />
          </div>

          {/* 06. Joias e correntes — base central horizontal */}
          <div
            ref={(node) => {
              photoRefs.current[5] = node;
            }}
            className="col-span-2 sm:col-start-4 sm:col-span-5 sm:row-start-3 sm:row-span-1 aspect-[16/9] sm:aspect-auto sm:h-full rounded-[18px] sm:rounded-[22px] overflow-hidden border border-[var(--border-hairline)] bg-[var(--bg-card-media)] shadow-[var(--shadow-glass)]"
          >
            <img
              src={imgs[5].src}
              alt={imgs[5].alt}
              width={imgs[5].width}
              height={imgs[5].height}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover rounded-[inherit]"
            />
          </div>
        </div>

        {/* Painel de texto à direita */}
        <div
          ref={textPanelRef}
          className="lg:col-span-5 order-1 lg:order-2 glass-surface rounded-[20px] sm:rounded-[28px] p-6 sm:p-8 space-y-5"
        >
          <div className="space-y-2.5">
            <div className="flex items-center gap-3 text-[var(--text-muted)]">
              <span aria-hidden="true" className="w-6 h-[1px] bg-[var(--border-strong)]" />
              <p className="text-[11px] uppercase tracking-[0.22em] font-medium">
                {BLOCO_04_CONTENT.eyebrow}
              </p>
            </div>
            <h2 className="font-display font-bold text-3xl sm:text-4xl xl:text-[44px] leading-[1.06] tracking-[-0.015em] text-[var(--text-primary)] text-balance">
              {BLOCO_04_CONTENT.headline}
            </h2>
          </div>

          <div className="space-y-3.5">
            {BLOCO_04_CONTENT.paragraphs.map((text, idx) => (
              <p
                key={idx}
                className="text-[15px] sm:text-base text-[var(--text-secondary)] leading-[1.68]"
              >
                {text}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
