import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useMotionValue, useScroll } from 'motion/react';
import {
  computeElementCollapse,
  computeSingularityFrame,
  smootherstep,
  type BlackHoleQualityTier,
  type CollapseVectorConfig,
} from '../../motion/gravitationalTimeline';
import { ThresholdMagnetic } from '../../motion/ThresholdPrimitives';
import type { Collection } from '../../types/commerce';
import { CollectionsRevealSection } from '../collections/CollectionsRevealSection';
import { EclipseSigil, LimiarStar } from '../ornaments/CybersigilismOrnaments';
import { UltravioletButton } from '../ui/UltravioletButton';
import { HeroThresholdComposition } from './HeroThresholdComposition';

export interface HeroSlideData {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  image: string;
  imageAlt: string;
}

interface HeroTraversalStageProps {
  slide: HeroSlideData;
  activeSlideIndex: number;
  totalSlides: number;
  collections: Collection[];
  onViewAllProducts: () => void;
}

function applyCollapseStyle(
  node: HTMLElement | null,
  progress: number,
  config: CollapseVectorConfig,
  enableSvgWarpFilter = false,
  svgFilterUrl?: string
) {
  if (!node) return;
  const st = computeElementCollapse(progress, config);
  node.style.opacity = String(st.opacity);
  node.style.transform = `translate3d(${st.x}px, ${st.y}px, 0) scale(${st.scale * st.scaleX}, ${st.scale * st.scaleY}) skewX(${st.skewXDeg}deg) rotate(${st.rotateDeg}deg)`;
  const blurFilter = st.blurPx > 0.1 ? `blur(${st.blurPx}px)` : '';
  const warpFilter =
    enableSvgWarpFilter && svgFilterUrl && progress > 0.24 && progress < 0.7
      ? ` url(${svgFilterUrl})`
      : '';
  node.style.filter = `${blurFilter}${warpFilter}`.trim() || 'none';
  node.style.pointerEvents = st.pointerInteractive ? 'auto' : 'none';
}

function computePullTowardSingularity(
  node: HTMLElement | null,
  parentNode: HTMLElement | null,
  targetX: number,
  targetY: number,
  pullFactor = 0.56
): { pullX: number; pullY: number } {
  if (!node || !parentNode) {
    return { pullX: 0, pullY: 0 };
  }
  const parentRect = parentNode.getBoundingClientRect();
  const restCenterX = parentRect.left + node.offsetLeft + node.offsetWidth * 0.5;
  const restCenterY = parentRect.top + node.offsetTop + node.offsetHeight * 0.5;
  return {
    pullX: (targetX - restCenterX) * pullFactor,
    pullY: (targetY - restCenterY) * pullFactor,
  };
}

export function HeroTraversalStage({
  slide,
  activeSlideIndex,
  totalSlides,
  collections,
  onViewAllProducts,
}: HeroTraversalStageProps) {
  const trackRef = useRef<HTMLElement | null>(null);
  const leftColRef = useRef<HTMLDivElement | null>(null);
  const rightColRef = useRef<HTMLDivElement | null>(null);
  const compositionRef = useRef<HTMLDivElement | null>(null);

  // Refs individuais para atração e distorção direcional sem re-render React
  const eyebrowRef = useRef<HTMLParagraphElement | null>(null);
  const titleRef = useRef<HTMLDivElement | null>(null);
  const descRef = useRef<HTMLParagraphElement | null>(null);
  const ctaRef = useRef<HTMLDivElement | null>(null);
  const counterRef = useRef<HTMLDivElement | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);
  const scrollHintRef = useRef<HTMLDivElement | null>(null);

  const blackholeOuterRef = useRef<HTMLDivElement | null>(null);
  const blackholeFrontOuterRef = useRef<HTMLDivElement | null>(null);
  const wreathTransformRef = useRef<HTMLDivElement | null>(null);
  const wreathRotateRef = useRef<HTMLDivElement | null>(null);
  const wreathBlurRef = useRef<HTMLDivElement | null>(null);
  const modelCollapseRef = useRef<HTMLDivElement | null>(null);
  const voidVeilRef = useRef<HTMLDivElement | null>(null);
  const heroOverlayGroupRef = useRef<HTMLDivElement | null>(null);

  // Estado contínuo da rotação anti-horária da moldura
  const progressRef = useRef(0);
  const angleDegRef = useRef(0);
  const lastScrollYRef = useRef(0);
  const smoothedBoostRef = useRef(0);

  const displacementRef = useRef<SVGFEDisplacementMapElement | null>(null);
  const rawId = useId();
  const warpFilterId = `limiar-gravity-warp-${rawId.replace(/:/g, '')}`;

  const [qualityTier, setQualityTier] = useState<BlackHoleQualityTier>('high');

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start start', 'end end'],
  });

  const progressMv = useMotionValue(0);

  const handleQualityChange = useCallback((tier: BlackHoleQualityTier) => {
    setQualityTier(tier);
  }, []);

  useEffect(() => {
    const applyFrame = (p: number) => {
      progressMv.set(p);
      progressRef.current = p;

      const width = typeof window !== 'undefined' ? window.innerWidth : 1440;
      const height = typeof window !== 'undefined' ? window.innerHeight : 900;
      const isDesktop = width >= 1024;
      const isMobile = width < 768;

      const frame = computeSingularityFrame(p, isMobile);

      if (trackRef.current) {
        trackRef.current.dataset.traversalStage = frame.stage;
        trackRef.current.dataset.traversalProgress = p.toFixed(3);
      }

      // Centro visual real do buraco negro em coordenadas da viewport
      const compRect = compositionRef.current?.getBoundingClientRect();
      const bhCenterX = compRect ? compRect.left + compRect.width * 0.5 : width * (isDesktop ? 0.72 : 0.5);
      const bhCenterY = compRect
        ? compRect.top + compRect.height * (isMobile ? 0.415 : 0.432)
        : height * 0.48;

      const vpCenterX = width * 0.5;
      const vpCenterY = height * 0.5;

      const shiftX = (vpCenterX - bhCenterX) * frame.centerBlend;
      const shiftY = (vpCenterY - bhCenterY) * frame.centerBlend;

      // Origem ativa das atrações gravitacionais durante a travessia (centro vivo do buraco negro)
      const targetSingularityX = bhCenterX + shiftX;
      const targetSingularityY = bhCenterY + shiftY;

      // Filtro SVG leve de distorção gravitacional em GPU de alta qualidade
      const useSvgWarp = qualityTier === 'high';
      if (useSvgWarp && displacementRef.current) {
        const warpAmount =
          p > 0.22 && p < 0.68 ? Number((frame.warpIntensity * 14).toFixed(2)) : 0;
        displacementRef.current.setAttribute('scale', String(warpAmount));
      }

      const filterRef = `#${warpFilterId}`;

      const eyebrowPull = computePullTowardSingularity(
        eyebrowRef.current,
        leftColRef.current,
        targetSingularityX,
        targetSingularityY,
        0.52
      );
      applyCollapseStyle(
        eyebrowRef.current,
        p,
        {
          ...eyebrowPull,
          stretchFactor: isDesktop ? 0.24 : 0.16,
          skewDeg: isDesktop ? -7 : -3,
          rotateDeg: isDesktop ? 4 : 2,
          resistance: 0.74,
        },
        useSvgWarp,
        filterRef
      );

      const titlePull = computePullTowardSingularity(
        titleRef.current,
        leftColRef.current,
        targetSingularityX,
        targetSingularityY,
        0.58
      );
      applyCollapseStyle(
        titleRef.current,
        p,
        {
          ...titlePull,
          stretchFactor: isDesktop ? 0.28 : 0.18,
          skewDeg: isDesktop ? -8 : -4,
          rotateDeg: isDesktop ? 3 : 2,
          resistance: 0.88,
        },
        useSvgWarp,
        filterRef
      );

      const descPull = computePullTowardSingularity(
        descRef.current,
        leftColRef.current,
        targetSingularityX,
        targetSingularityY,
        0.54
      );
      applyCollapseStyle(
        descRef.current,
        p,
        {
          ...descPull,
          stretchFactor: isDesktop ? 0.22 : 0.15,
          skewDeg: isDesktop ? -6 : -3,
          rotateDeg: -2,
          resistance: 0.82,
        },
        useSvgWarp,
        filterRef
      );

      const ctaPull = computePullTowardSingularity(
        ctaRef.current,
        leftColRef.current,
        targetSingularityX,
        targetSingularityY,
        0.5
      );
      applyCollapseStyle(ctaRef.current, p, {
        ...ctaPull,
        stretchFactor: isDesktop ? 0.18 : 0.14,
        skewDeg: isDesktop ? -5 : -2,
        rotateDeg: isDesktop ? -3 : -2,
        resistance: 0.94,
      });

      const counterPull = computePullTowardSingularity(
        counterRef.current,
        leftColRef.current,
        targetSingularityX,
        targetSingularityY,
        0.48
      );
      applyCollapseStyle(counterRef.current, p, {
        ...counterPull,
        stretchFactor: isDesktop ? 0.16 : 0.12,
        skewDeg: isDesktop ? -4 : -2,
        rotateDeg: isDesktop ? -3 : -2,
        resistance: 0.7,
      });

      const railPull = computePullTowardSingularity(
        railRef.current,
        rightColRef.current,
        targetSingularityX,
        targetSingularityY,
        0.62
      );
      applyCollapseStyle(railRef.current, p, {
        ...railPull,
        stretchFactor: 0.14,
        skewDeg: 4,
        rotateDeg: -6,
        resistance: 0.72,
      });

      const modelPull = computePullTowardSingularity(
        modelCollapseRef.current,
        compositionRef.current,
        targetSingularityX,
        targetSingularityY,
        0.95
      );
      applyCollapseStyle(
        modelCollapseRef.current,
        p,
        {
          ...modelPull,
          stretchFactor: 0.14,
          skewDeg: -2.5,
          rotateDeg: -7,
          resistance: 1.0,
        },
        useSvgWarp,
        filterRef
      );

      // Moldura wreath é a camada mais próxima da câmera: acelera antes do buraco negro até sair naturalmente da viewport
      if (wreathTransformRef.current) {
        wreathTransformRef.current.style.transform = `translate3d(${shiftX.toFixed(
          2
        )}px, ${shiftY.toFixed(2)}px, 0) scale(${frame.wreathScale})`;
        wreathTransformRef.current.style.opacity = p >= 0.72 ? '0' : '1';
      }

      if (wreathBlurRef.current) {
        wreathBlurRef.current.style.filter =
          frame.wreathBlurPx > 0.05 ? `blur(${frame.wreathBlurPx}px)` : 'none';
      }

      // Posicionamento e expansão do buraco negro sem conflito com translate(-50%, -50%) do wrapper pai
      const blackholeTransform = `translate3d(${shiftX.toFixed(
        2
      )}px, ${shiftY.toFixed(2)}px, 0) scale(${frame.scale})`;
      const blackholeOpacity = String(frame.heroVisibility);

      if (blackholeOuterRef.current) {
        blackholeOuterRef.current.style.transform = blackholeTransform;
        blackholeOuterRef.current.style.opacity = blackholeOpacity;
      }

      if (blackholeFrontOuterRef.current) {
        blackholeFrontOuterRef.current.style.transform = blackholeTransform;
        blackholeFrontOuterRef.current.style.opacity = blackholeOpacity;
      }

      if (heroOverlayGroupRef.current) {
        heroOverlayGroupRef.current.style.opacity = String(frame.heroVisibility);
        heroOverlayGroupRef.current.style.pointerEvents =
          p < 0.28 && frame.heroVisibility > 0.5 ? 'auto' : 'none';
      }

      if (voidVeilRef.current) {
        voidVeilRef.current.style.opacity = String(frame.voidVeilOpacity);
      }

      if (scrollHintRef.current) {
        const hintOpacity = p < 0.08 ? Math.max(0, 1 - p / 0.08) : 0;
        scrollHintRef.current.style.opacity = String(hintOpacity.toFixed(3));
      }
    };

    applyFrame(scrollYProgress.get());
    const unsub = scrollYProgress.on('change', applyFrame);
    const onResize = () => applyFrame(scrollYProgress.get());
    window.addEventListener('resize', onResize, { passive: true });

    return () => {
      unsub();
      window.removeEventListener('resize', onResize);
    };
  }, [scrollYProgress, progressMv, qualityTier, warpFilterId]);

  // Rotação contínua exclusivamente anti-horária com aceleração progressiva e impulso suavizado pelo scroll
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let rafId = 0;
    let lastTime = performance.now();
    lastScrollYRef.current = window.scrollY;

    const BASE_DEG_PER_SEC = 3.6;
    const PROGRESS_EXTRA_DEG_PER_SEC = 26.0;
    const MAX_VELOCITY_BOOST = 82.0;
    const MAX_TOTAL_DEG_PER_SEC = 112.0;

    const tick = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

      const currentScrollY = window.scrollY;
      const deltaScrollPx = Math.abs(currentScrollY - lastScrollYRef.current);
      lastScrollYRef.current = currentScrollY;

      const p = progressRef.current;
      const isVisible =
        (typeof document === 'undefined' || document.visibilityState !== 'hidden') && p < 0.78;

      if (isVisible) {
        const scrollSpeedPxPerSec = deltaScrollPx / dt;
        const targetBoost = Math.min(MAX_VELOCITY_BOOST, scrollSpeedPxPerSec * 0.032);
        const dampRate = targetBoost > smoothedBoostRef.current ? 11.0 : 4.2;
        const alpha = 1 - Math.exp(-dampRate * dt);
        smoothedBoostRef.current += (targetBoost - smoothedBoostRef.current) * alpha;
        if (targetBoost === 0 && smoothedBoostRef.current < 0.02) {
          smoothedBoostRef.current = 0;
        }

        const progressSpeed =
          BASE_DEG_PER_SEC + smootherstep(0.06, 0.68, p) * PROGRESS_EXTRA_DEG_PER_SEC;
        const effectiveSpeed = Math.min(
          MAX_TOTAL_DEG_PER_SEC,
          progressSpeed + smoothedBoostRef.current
        );

        // Sempre subtrai para garantir sentido exclusivamente anti-horário (inclusive ao rolar para cima)
        angleDegRef.current = (angleDegRef.current - effectiveSpeed * dt) % 360000;

        if (wreathRotateRef.current) {
          wreathRotateRef.current.style.transform = `rotate(${angleDegRef.current.toFixed(3)}deg)`;
        }
      } else {
        smoothedBoostRef.current = 0;
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <section
      ref={trackRef}
      data-testid="hero-traversal-track"
      data-traversal-stage="repouso"
      data-traversal-progress="0.000"
      className="relative h-[320vh] md:h-[410vh]"
    >
      {/* Filtro SVG de distorção gravitacional discreta (qualidade alta) */}
      <svg aria-hidden="true" className="absolute w-0 h-0 overflow-hidden pointer-events-none">
        <defs>
          <filter id={warpFilterId} x="-15%" y="-15%" width="130%" height="130%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012 0.022"
              numOctaves="2"
              seed="7"
              result="gravNoise"
            />
            <feDisplacementMap
              ref={displacementRef}
              in="SourceGraphic"
              in2="gravNoise"
              scale="0"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* Palco Sticky: fixa a experiência durante os 3 estágios sem scroll hijacking */}
      <div className="sticky top-0 min-h-[100dvh] md:h-[100dvh] w-full overflow-x-clip md:overflow-hidden flex flex-col md:flex-row md:items-center">
        {/* CAMADA DE TRAVESSIA: HERO + SINGULARIDADE PROCEDURAL */}
        <div
          ref={heroOverlayGroupRef}
          className="absolute inset-x-0 top-0 h-[100dvh] md:relative md:inset-auto md:h-auto z-10 w-full flex items-center"
        >
          <div className="mx-auto max-w-[1360px] px-4 sm:px-8 pt-12 sm:pt-14 pb-6 sm:pb-10 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-4 sm:gap-6">
              {/* Coluna Esquerda: Texto & CTA */}
              <div
                ref={leftColRef}
                className="lg:col-span-6 xl:col-span-6 relative z-30 space-y-3 sm:space-y-6 lg:space-y-8"
              >
                <div
                  ref={eyebrowRef}
                  className="will-change-transform origin-right"
                >
                  <p
                    className="limiar-enter text-[11px] sm:text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]"
                    style={{ animationDelay: '0ms' }}
                  >
                    {slide.eyebrow}
                  </p>
                </div>

                <div
                  ref={titleRef}
                  className="will-change-transform origin-right"
                >
                  <div
                    className="limiar-enter flex items-start gap-4"
                    style={{ animationDelay: '45ms' }}
                  >
                    <h1 className="font-display font-light text-3xl sm:text-5xl xl:text-[64px] leading-[1.03] tracking-[0.03em] text-[var(--text-primary)] uppercase text-balance max-w-xl">
                      {slide.title}
                    </h1>
                    <LimiarStar className="w-6 h-6 sm:w-9 sm:h-9 text-[var(--text-secondary)] shrink-0 mt-1.5 sm:mt-2 opacity-80" />
                  </div>
                </div>

                <div
                  ref={descRef}
                  className="will-change-transform origin-right"
                >
                  <p
                    className="limiar-enter text-sm sm:text-base lg:text-lg text-[var(--text-secondary)] max-w-md leading-relaxed"
                    style={{ animationDelay: '90ms' }}
                  >
                    {slide.description}
                  </p>
                </div>

                <div
                  ref={ctaRef}
                  className="pt-0.5 sm:pt-1 will-change-transform origin-right"
                >
                  <div
                    className="limiar-enter"
                    style={{ animationDelay: '135ms' }}
                  >
                    <ThresholdMagnetic maxPull={4}>
                      <UltravioletButton href={slide.ctaHref} size="lg">
                        {slide.ctaLabel}
                      </UltravioletButton>
                    </ThresholdMagnetic>
                  </div>
                </div>

                <div
                  ref={counterRef}
                  className="pt-1 sm:pt-4 will-change-transform origin-right"
                >
                  <div
                    className="limiar-enter flex items-center gap-4 text-[11px] tracking-[0.2em] text-[var(--text-muted)] tabular-nums"
                    style={{ animationDelay: '180ms' }}
                  >
                    <span>0{activeSlideIndex + 1}</span>
                    <span className="w-16 h-[1px] bg-[var(--border-strong)] relative overflow-hidden">
                      <span className="absolute inset-y-0 left-0 w-full bg-[var(--text-primary)] opacity-75" />
                    </span>
                    <span>0{totalSlides}</span>
                  </div>
                </div>
              </div>

              {/* Coluna Direita: Singularidade Procedural + Cybersigilism + Modelo */}
              <div
                ref={rightColRef}
                className="lg:col-span-6 xl:col-span-6 relative flex items-end justify-center xl:pr-10"
              >
                <HeroThresholdComposition
                  modelAlt={slide.imageAlt}
                  progressMv={progressMv}
                  onBlackHoleQualityChange={handleQualityChange}
                  collapseRefs={{
                    compositionRef,
                    blackholeOuterRef,
                    blackholeFrontOuterRef,
                    wreathTransformRef,
                    wreathRotateRef,
                    wreathBlurRef,
                    modelCollapseRef,
                  }}
                />

                {/* Rail lateral discreto */}
                <div
                  ref={railRef}
                  aria-hidden="true"
                  className="hidden xl:flex flex-col items-center gap-3 absolute right-0 top-1/2 -translate-y-1/2 z-30 text-[var(--text-muted)] will-change-transform"
                >
                  <span className="w-[1px] h-10 bg-[var(--border-hairline)]" />
                  <EclipseSigil className="w-5 h-5 text-[var(--text-secondary)]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-primary)]" />
                  <span className="w-1 h-1 rounded-full bg-[var(--border-strong)]" />
                  <span className="w-[1px] h-10 bg-[var(--border-hairline)]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Indicador sutil de travessia em repouso */}
        <div
          ref={scrollHintRef}
          aria-hidden="true"
          className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 z-20 hidden sm:flex flex-col items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]"
        >
          <span>Role para atravessar</span>
          <span className="w-[1px] h-5 bg-gradient-to-b from-[var(--text-muted)] to-transparent" />
        </div>

        {/* VÉU DE ESCURIDÃO DO HORIZONTE DE EVENTOS (55%–78%) */}
        <div
          ref={voidVeilRef}
          aria-hidden="true"
          data-testid="horizon-void-veil"
          className="pointer-events-none absolute inset-0 z-[24] opacity-0"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, #030304 0%, #050507 65%, #070709 100%)',
          }}
        />

        {/* REVELAÇÃO SEQUENCIAL DAS COLEÇÕES (78%–100%) */}
        <CollectionsRevealSection
          collections={collections}
          progressMv={progressMv}
          onViewAllProducts={onViewAllProducts}
        />
      </div>
    </section>
  );
}
