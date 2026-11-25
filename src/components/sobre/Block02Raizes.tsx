import React, { useEffect, useRef } from 'react';
import { BLOCO_02_CONTENT } from '../../data/sobreLimiarContent';
import { computeBlock02State } from '../../motion/sobreTimeline';
import { OrganicFiligree } from './OrganicFiligree';
import type { SobreBlockProps } from './Block01Manifesto';
import { applyVisualState, resetVisualState } from './sobreDomHelpers';

export function Block02Raizes({ registerApply }: SobreBlockProps) {
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

      const st = computeBlock02State(p);
      if (stageRef.current) {
        stageRef.current.style.pointerEvents = st.interactive ? 'auto' : 'none';
      }

      applyVisualState(textPanelRef.current, st.textPanel, { allowPointer: true });
      st.photos.forEach((ps, i) => applyVisualState(photoRefs.current[i] ?? null, ps));
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

  const allPhotos = [BLOCO_02_CONTENT.mainImage, ...BLOCO_02_CONTENT.complementaryImages];

  return (
    <div
      ref={stageRef}
      className="relative mx-auto max-w-[1360px] w-full px-4 sm:px-8 py-12 md:pt-20 md:pb-8 md:h-full flex items-center"
    >
      {/* Dois filamentos neotribais em cantos opostos e escalas assimétricas, sempre em z-0 */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-visible">
        <OrganicFiligree
          ref={grafismoRef}
          src={BLOCO_02_CONTENT.grafismos[0]}
          opacityClass="opacity-[0.58]"
          className="absolute -left-24 sm:-left-28 lg:-left-32 -bottom-20 lg:-bottom-28 w-[320px] sm:w-[460px] lg:w-[560px] h-[460px] sm:h-[640px] lg:h-[780px] rotate-[14deg]"
        />
        <OrganicFiligree
          ref={grafismoSecondaryRef}
          src={BLOCO_02_CONTENT.grafismos[1]}
          opacityClass="opacity-[0.50]"
          className="absolute -right-20 sm:-right-28 -top-20 lg:-top-28 w-[240px] sm:w-[370px] lg:w-[460px] h-[340px] sm:h-[500px] lg:h-[620px] -rotate-[22deg]"
        />
      </div>

      <div className="relative z-10 w-full grid grid-cols-1 lg:grid-cols-12 items-center gap-6 lg:gap-8">
        {/* Composição fotográfica assimétrica à ESQUERDA no desktop */}
        <div className="lg:col-span-7 order-2 lg:order-1 relative z-10">
          <div className="grid grid-cols-12 gap-3 sm:gap-4 items-start">
            {/* Foto principal: Skatista */}
            <div
              ref={(node) => {
                photoRefs.current[0] = node;
              }}
              className="col-span-12 sm:col-span-8 rounded-[18px] sm:rounded-[24px] overflow-hidden border border-[var(--border-hairline)] bg-[var(--bg-card-media)] shadow-[var(--shadow-glass)] aspect-[16/10]"
            >
              <img
                src={allPhotos[0].src}
                alt={allPhotos[0].alt}
                width={allPhotos[0].width}
                height={allPhotos[0].height}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center rounded-[inherit]"
              />
            </div>

            {/* Complementar 1: Breakdance */}
            <div
              ref={(node) => {
                photoRefs.current[1] = node;
              }}
              className="col-span-6 sm:col-span-4 sm:mt-6 rounded-[16px] sm:rounded-[22px] overflow-hidden border border-[var(--border-hairline)] bg-[var(--bg-card-media)] shadow-[var(--shadow-glass)] aspect-[4/5]"
            >
              <img
                src={allPhotos[1].src}
                alt={allPhotos[1].alt}
                width={allPhotos[1].width}
                height={allPhotos[1].height}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center rounded-[inherit]"
              />
            </div>

            {/* Complementar 2: Artista no grafite */}
            <div
              ref={(node) => {
                photoRefs.current[2] = node;
              }}
              className="col-span-6 sm:col-span-5 sm:-mt-3 rounded-[16px] sm:rounded-[22px] overflow-hidden border border-[var(--border-hairline)] bg-[var(--bg-card-media)] shadow-[var(--shadow-glass)] aspect-[4/3]"
            >
              <img
                src={allPhotos[2].src}
                alt={allPhotos[2].alt}
                width={allPhotos[2].width}
                height={allPhotos[2].height}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center rounded-[inherit]"
              />
            </div>

            {/* Complementar 3: Ritual na floresta */}
            <div
              ref={(node) => {
                photoRefs.current[3] = node;
              }}
              className="col-span-12 sm:col-span-7 rounded-[18px] sm:rounded-[24px] overflow-hidden border border-[var(--border-hairline)] bg-[var(--bg-card-media)] shadow-[var(--shadow-glass)] aspect-[16/10]"
            >
              <img
                src={allPhotos[3].src}
                alt={allPhotos[3].alt}
                width={allPhotos[3].width}
                height={allPhotos[3].height}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center rounded-[inherit]"
              />
            </div>
          </div>
        </div>

        {/* Painel de texto à DIREITA no desktop */}
        <div ref={textPanelRef} className="lg:col-span-5 order-1 lg:order-2 relative z-20">
          <div className="glass-surface rounded-[20px] sm:rounded-[28px] p-6 sm:p-8 space-y-5">
            <div className="space-y-2.5">
              <div className="flex items-center gap-3 text-[var(--text-muted)]">
                <span aria-hidden="true" className="w-6 h-[1px] bg-[var(--border-strong)]" />
                <p className="text-[11px] uppercase tracking-[0.22em] font-medium">
                  {BLOCO_02_CONTENT.eyebrow}
                </p>
              </div>
              <h2 className="font-display font-bold text-3xl sm:text-4xl xl:text-[44px] leading-[1.06] tracking-[-0.015em] text-[var(--text-primary)] text-balance">
                {BLOCO_02_CONTENT.headline}
              </h2>
            </div>

            <div className="space-y-3.5">
              {BLOCO_02_CONTENT.paragraphs.map((text, idx) => (
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
    </div>
  );
}
