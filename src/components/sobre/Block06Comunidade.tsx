import React, { useCallback, useEffect, useRef } from 'react';
import { BLOCO_06_CONTENT } from '../../data/sobreLimiarContent';
import { useRouter } from '../../context/RouterContext';
import { scrollToWithPhysics } from '../../motion/scrollPhysics';
import { computeBlock06State } from '../../motion/sobreTimeline';
import { LimiarLogo } from '../ui/LimiarLogo';
import { UltravioletButton } from '../ui/UltravioletButton';
import { OrganicFiligree } from './OrganicFiligree';
import type { SobreBlockProps } from './Block01Manifesto';
import { applyVisualState, resetVisualState } from './sobreDomHelpers';

export function Block06Comunidade({ registerApply }: SobreBlockProps) {
  const { navigate } = useRouter();

  const stageRef = useRef<HTMLDivElement | null>(null);
  const collectivePanelRef = useRef<HTMLDivElement | null>(null);
  const photoRefs = useRef<(HTMLDivElement | null)[]>([]);
  const closingRef = useRef<HTMLDivElement | null>(null);
  const grafLeftRef = useRef<HTMLDivElement | null>(null);
  const grafRightRef = useRef<HTMLDivElement | null>(null);

  const handleGoToCollections = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      const target = document.querySelector('[data-testid="collections-reveal-section"]');
      if (target instanceof HTMLElement) {
        e.preventDefault();
        scrollToWithPhysics(target, { duration: 1.25, offset: -68 });
      } else {
        e.preventDefault();
        navigate('/colecoes');
      }
    },
    [navigate]
  );

  useEffect(() => {
    registerApply((p) => {
      if (p === null) {
        resetVisualState(stageRef.current);
        resetVisualState(collectivePanelRef.current);
        photoRefs.current.forEach((el) => resetVisualState(el));
        resetVisualState(closingRef.current);
        resetVisualState(grafLeftRef.current, false);
        resetVisualState(grafRightRef.current, false);
        return;
      }

      const st = computeBlock06State(p);
      if (stageRef.current) {
        stageRef.current.style.pointerEvents =
          st.collectivePanel.opacity > 0.15 || st.ctaInteractive ? 'auto' : 'none';
      }

      applyVisualState(collectivePanelRef.current, st.collectivePanel, { allowPointer: true });
      st.photos.forEach((ps, i) => applyVisualState(photoRefs.current[i] ?? null, ps));
      applyVisualState(closingRef.current, st.closingSignature, {
        allowPointer: st.ctaInteractive,
      });
      applyVisualState(grafLeftRef.current, st.grafismoLeft, {
        extraY: st.grafismoLeft.ambientY,
        allowPointer: false,
      });
      applyVisualState(grafRightRef.current, st.grafismoRight, {
        extraY: st.grafismoRight.ambientY,
        allowPointer: false,
      });
    });
  }, [registerApply]);

  const allPhotos = [BLOCO_06_CONTENT.mainImage, ...BLOCO_06_CONTENT.complementaryImages];

  return (
    <div
      ref={stageRef}
      className="relative mx-auto max-w-[1360px] w-full px-4 sm:px-8 py-12 md:pt-20 md:pb-8 md:h-full flex flex-col justify-center"
    >
      {/* Dois filamentos neotribais amplos em cantos opostos (z-0), visíveis em mobile e desktop */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-visible">
        <OrganicFiligree
          ref={grafLeftRef}
          src={BLOCO_06_CONTENT.grafismos[0]}
          opacityClass="opacity-[0.55]"
          className="absolute -left-24 sm:-left-28 lg:-left-32 -top-16 lg:-top-24 w-[250px] sm:w-[410px] lg:w-[540px] h-[360px] sm:h-[560px] lg:h-[740px] -rotate-[18deg]"
        />
        <OrganicFiligree
          ref={grafRightRef}
          src={BLOCO_06_CONTENT.grafismos[1]}
          opacityClass="opacity-[0.58]"
          className="absolute -right-20 lg:-right-28 -bottom-16 lg:-bottom-24 w-[280px] sm:w-[400px] lg:w-[480px] h-[400px] sm:h-[550px] lg:h-[660px] rotate-[24deg]"
        />
      </div>

      {/* Camada de conteúdo sempre acima dos filamentos (z-10) */}
      <div className="relative z-10 w-full space-y-12 md:space-y-0">
        {/* ATO 1: Composição fotográfica única à esquerda + painel de texto à direita */}
        <div className="relative grid grid-cols-1 lg:grid-cols-12 items-center gap-6 lg:gap-8">
          <div className="lg:col-span-7 min-w-0 order-2 lg:order-1 flex justify-center lg:justify-end">
            <div className="grid grid-cols-[2fr_1fr] grid-rows-2 gap-3 sm:gap-3.5 w-full max-w-[min(100%,648px)] lg:h-[clamp(390px,58vh,535px)] lg:w-auto aspect-[6/5]">
              {/* Fotografia principal vertical de grande destaque */}
              <div
                ref={(node) => {
                  photoRefs.current[0] = node;
                }}
                className="row-span-2 h-full rounded-[20px] sm:rounded-[26px] overflow-hidden border border-[var(--border-hairline)] bg-[var(--bg-card-media)] shadow-[var(--shadow-elevated)]"
              >
                <img
                  src={allPhotos[0].src}
                  alt={allPhotos[0].alt}
                  width={allPhotos[0].width}
                  height={allPhotos[0].height}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-top rounded-[inherit]"
                />
              </div>

              {/* Duas fotografias complementares menores empilhadas verticalmente */}
              {allPhotos.slice(1).map((img, i) => (
                <div
                  key={img.src}
                  ref={(node) => {
                    photoRefs.current[i + 1] = node;
                  }}
                  className="h-full rounded-[16px] sm:rounded-[22px] overflow-hidden border border-[var(--border-hairline)] bg-[var(--bg-card-media)] shadow-[var(--shadow-glass)]"
                >
                  <img
                    src={img.src}
                    alt={img.alt}
                    width={img.width}
                    height={img.height}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-top rounded-[inherit]"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 order-1 lg:order-2">
            <div
              ref={collectivePanelRef}
              className="glass-surface rounded-[20px] sm:rounded-[28px] p-6 sm:p-8 space-y-5"
            >
              <div className="space-y-2.5">
                <div className="flex items-center gap-3 text-[var(--text-muted)]">
                  <span aria-hidden="true" className="w-6 h-[1px] bg-[var(--border-strong)]" />
                  <p className="text-[11px] uppercase tracking-[0.22em] font-medium">
                    {BLOCO_06_CONTENT.eyebrow}
                  </p>
                </div>
                <h2 className="font-display font-bold text-3xl sm:text-4xl xl:text-[42px] leading-[1.06] tracking-[-0.015em] text-[var(--text-primary)] text-balance">
                  {BLOCO_06_CONTENT.headline}
                </h2>
              </div>

              <div className="space-y-3">
                {BLOCO_06_CONTENT.introParagraphs.map((text, idx) => (
                  <p
                    key={idx}
                    className={
                      idx === 0
                        ? 'text-base font-medium text-[var(--text-primary)] leading-[1.6]'
                        : 'text-[15px] text-[var(--text-secondary)] leading-[1.68]'
                    }
                  >
                    {text}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ATO 2: Encerramento limpo com logo oficial, manifesto final e CTA interativo */}
        <div
          ref={closingRef}
          className="limiar-sobre-closing-overlay z-20 flex items-center justify-center"
        >
          <div className="glass-surface-strong rounded-[22px] sm:rounded-[30px] p-7 sm:p-11 max-w-2xl w-full text-center flex flex-col items-center gap-5">
            <LimiarLogo className="h-12 sm:h-16 w-auto" alt="Limiar" />

            <div className="space-y-2.5 max-w-lg">
              {BLOCO_06_CONTENT.closingParagraphs.map((line, idx) => (
                <p
                  key={idx}
                  className="text-[15px] sm:text-base text-[var(--text-secondary)] leading-[1.68]"
                >
                  {line}
                </p>
              ))}
            </div>

            <p className="font-display font-bold text-xl sm:text-2xl tracking-[-0.01em] text-[var(--text-primary)] pt-1">
              {BLOCO_06_CONTENT.closingStatement}
            </p>

            <div className="pt-2">
              <UltravioletButton
                href="/colecoes"
                variant="secondary"
                size="lg"
                onClick={handleGoToCollections}
              >
                {BLOCO_06_CONTENT.ctaLabel}
              </UltravioletButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
