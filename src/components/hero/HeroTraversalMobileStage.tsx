import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supportsCssScrollDrivenAnimations } from '../../motion/scrollPhysics';
import { useThresholdPointer } from '../../motion/ThresholdMotionProvider';
import type { Collection } from '../../types/commerce';
import {
  CollectionsRevealSection,
  type CollectionsMobileDomRefs,
} from '../collections/CollectionsRevealSection';
import { LimiarStar } from '../ornaments/CybersigilismOrnaments';
import { UltravioletButton } from '../ui/UltravioletButton';
import type { HeroSlideData } from './HeroTraversalStage';

interface HeroTraversalMobileStageProps {
  slide: HeroSlideData;
  activeSlideIndex: number;
  totalSlides: number;
  collections: Collection[];
  onViewAllProducts: () => void;
  postCollectionsContent?: React.ReactNode;
}

type KeyframeStop = readonly [t: number, value: number];

function sampleStops(t: number, stops: readonly KeyframeStop[]): number {
  if (t <= stops[0][0]) return stops[0][1];
  const last = stops[stops.length - 1];
  if (t >= last[0]) return last[1];
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, v0] = stops[i];
    const [t1, v1] = stops[i + 1];
    if (t >= t0 && t <= t1) {
      const span = t1 - t0;
      const local = span > 0 ? (t - t0) / span : 1;
      return v0 + (v1 - v0) * local;
    }
  }
  return last[1];
}

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

const BH_SHIFT_Y_SVH: readonly KeyframeStop[] = [
  [0, 0],
  [0.05, 0],
  [0.18, -2.2],
  [0.34, -9.7],
  [0.44, -10],
  [1, -10],
];

const BH_SCALE: readonly KeyframeStop[] = [
  [0, 1],
  [0.05, 1],
  [0.18, 1.28],
  [0.34, 2.46],
  [0.39, 3.45],
  [0.44, 4.4],
  [1, 4.4],
];

const BH_OPACITY: readonly KeyframeStop[] = [
  [0, 1],
  [0.34, 1],
  [0.39, 0.72],
  [0.44, 0],
  [1, 0],
];

const HORIZON_SCALE: readonly KeyframeStop[] = [
  [0, 1],
  [0.05, 1],
  [0.18, 1.42],
  [0.34, 3.2],
  [0.44, 9.2],
  [1, 9.2],
];

const HORIZON_OPACITY: readonly KeyframeStop[] = [
  [0, 1],
  [0.44, 1],
  [0.48, 0],
  [1, 0],
];

const WREATH_SCALE: readonly KeyframeStop[] = [
  [0, 1],
  [0.05, 1],
  [0.18, 2.24],
  [0.34, 5.27],
  [0.44, 5.4],
  [1, 5.4],
];

const WREATH_OPACITY: readonly KeyframeStop[] = [
  [0, 1],
  [0.34, 1],
  [0.44, 0],
  [1, 0],
];

const WREATH_SHARP_OPACITY: readonly KeyframeStop[] = [
  [0, 0.86],
  [0.08, 0.86],
  [0.18, 0.76],
  [0.34, 0.12],
  [0.4, 0],
  [1, 0],
];

const WREATH_BLUR_OPACITY: readonly KeyframeStop[] = [
  [0, 0],
  [0.08, 0],
  [0.18, 0.12],
  [0.34, 0.78],
  [0.4, 0.86],
  [0.45, 0],
  [1, 0],
];

const VOID_VEIL_OPACITY: readonly KeyframeStop[] = [
  [0, 0],
  [0.34, 0],
  [0.44, 1],
  [0.47, 1],
  [0.57, 0],
  [1, 0],
];

const MODEL_Y_SVH: readonly KeyframeStop[] = [
  [0, 0],
  [0.05, 0],
  [0.18, -2.2],
  [0.34, -10.4],
  [0.43, -12],
  [1, -12],
];

const MODEL_SCALE_X: readonly KeyframeStop[] = [
  [0, 1],
  [0.05, 1],
  [0.18, 0.95],
  [0.34, 0.41],
  [0.43, 0.14],
  [1, 0.14],
];

const MODEL_SCALE_Y: readonly KeyframeStop[] = [
  [0, 1],
  [0.05, 1],
  [0.18, 0.99],
  [0.34, 0.51],
  [0.43, 0.18],
  [1, 0.18],
];

const MODEL_OPACITY: readonly KeyframeStop[] = [
  [0, 1],
  [0.05, 1],
  [0.18, 0.98],
  [0.34, 0.48],
  [0.43, 0],
  [1, 0],
];

interface FallbackTextConfig {
  endT: number;
  pullXVw: number;
  pullYSvh: number;
  midScaleX: number;
  midScaleY: number;
  endScaleX: number;
  endScaleY: number;
  skewDeg: number;
  rotateDeg: number;
}

function applyFallbackTextSuction(
  node: HTMLElement | null,
  t: number,
  cfg: FallbackTextConfig
) {
  if (!node) return;
  if (t <= 0.05) {
    node.style.transform = 'translate3d(0, 0, 0) scale(1, 1) skewX(0deg) rotate(0deg)';
    node.style.opacity = '1';
    return;
  }
  if (t >= cfg.endT) {
    node.style.transform = `translate3d(${cfg.pullXVw}vw, ${cfg.pullYSvh}svh, 0) scale(${cfg.endScaleX}, ${cfg.endScaleY}) skewX(${cfg.skewDeg}deg) rotate(${cfg.rotateDeg}deg)`;
    node.style.opacity = '0';
    return;
  }
  const u = clamp01((t - 0.05) / (cfg.endT - 0.05));
  const eased = u * u * (3 - 2 * u);
  const x = (cfg.pullXVw * eased).toFixed(2);
  const y = (cfg.pullYSvh * eased).toFixed(2);
  const sx = (1 + (cfg.endScaleX - 1) * eased).toFixed(3);
  const sy = (1 + (cfg.endScaleY - 1) * eased).toFixed(3);
  const sk = (cfg.skewDeg * eased).toFixed(2);
  const rot = (cfg.rotateDeg * eased).toFixed(2);
  const op = Math.max(0, 1 - eased * 1.12).toFixed(3);
  node.style.transform = `translate3d(${x}vw, ${y}svh, 0) scale(${sx}, ${sy}) skewX(${sk}deg) rotate(${rot}deg)`;
  node.style.opacity = op;
}

function applyFallbackReveal(
  node: HTMLElement | null,
  t: number,
  startT: number,
  endT: number,
  startY: number,
  startScale: number
) {
  if (!node) return;
  const raw = clamp01((t - startT) / Math.max(0.001, endT - startT));
  const eased = raw * raw * (3 - 2 * raw);
  node.style.opacity = eased.toFixed(3);
  if (eased >= 0.999) {
    node.style.transform = 'translate3d(0, 0, 0) scale(1)';
  } else {
    const y = ((1 - eased) * startY).toFixed(2);
    const s = (startScale + (1 - startScale) * eased).toFixed(3);
    node.style.transform = `translate3d(0, ${y}px, 0) scale(${s})`;
  }
}

export function HeroTraversalMobileStage({
  slide,
  activeSlideIndex,
  totalSlides,
  collections,
  onViewAllProducts,
  postCollectionsContent,
}: HeroTraversalMobileStageProps) {
  const { portalRevealed } = useThresholdPointer();
  const [cssTimelineSupported] = useState<boolean>(() =>
    supportsCssScrollDrivenAnimations()
  );
  const driver = cssTimelineSupported ? 'css-scroll-timeline' : 'raf-fallback';

  const runwayRef = useRef<HTMLDivElement | null>(null);
  const stickyStageRef = useRef<HTMLDivElement | null>(null);
  const overlayGroupRef = useRef<HTMLDivElement | null>(null);

  const eyebrowRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLDivElement | null>(null);
  const descRef = useRef<HTMLDivElement | null>(null);
  const ctaRef = useRef<HTMLDivElement | null>(null);
  const counterRef = useRef<HTMLDivElement | null>(null);

  const blackholeRearRef = useRef<HTMLDivElement | null>(null);
  const horizonRef = useRef<HTMLDivElement | null>(null);
  const frontOrbitRef = useRef<HTMLDivElement | null>(null);
  const wreathRef = useRef<HTMLDivElement | null>(null);
  const wreathSharpRef = useRef<HTMLImageElement | null>(null);
  const wreathBlurRef = useRef<HTMLImageElement | null>(null);
  const modelRef = useRef<HTMLDivElement | null>(null);
  const voidVeilRef = useRef<HTMLDivElement | null>(null);

  const collectionsRefsRef = useRef<CollectionsMobileDomRefs | null>(null);
  const handleRegisterCollectionsRefs = useCallback(
    (refs: CollectionsMobileDomRefs | null) => {
      collectionsRefsRef.current = refs;
    },
    []
  );

  // Fallback mínimo (apenas navegadores incompatíveis com animation-timeline):
  // no máximo 1 requestAnimationFrame pendente por frame, consumindo o scroll atual sem interpolação temporal.
  useEffect(() => {
    if (cssTimelineSupported || typeof window === 'undefined') return;

    let rafId = 0;
    let rafPending = false;
    let lastAppliedT = -1;

    const applyFallbackFrame = () => {
      rafPending = false;
      rafId = 0;

      const runway = runwayRef.current;
      if (!runway) return;

      const rect = runway.getBoundingClientRect();
      const span = Math.max(1, rect.height);
      const t = clamp01(-rect.top / span);

      if (Math.abs(t - lastAppliedT) < 0.0002) return;
      lastAppliedT = t;

      if (stickyStageRef.current) {
        stickyStageRef.current.style.visibility = t >= 0.58 ? 'hidden' : 'visible';
      }

      if (overlayGroupRef.current) {
        overlayGroupRef.current.style.pointerEvents = t <= 0.16 ? 'auto' : 'none';
      }

      const bhY = sampleStops(t, BH_SHIFT_Y_SVH).toFixed(2);
      const bhS = sampleStops(t, BH_SCALE).toFixed(3);
      const bhOp = sampleStops(t, BH_OPACITY).toFixed(3);
      const bhTransform = `translate3d(0, ${bhY}svh, 0) scale(${bhS})`;

      if (blackholeRearRef.current) {
        blackholeRearRef.current.style.transform = bhTransform;
        blackholeRearRef.current.style.opacity = bhOp;
      }
      if (frontOrbitRef.current) {
        frontOrbitRef.current.style.transform = bhTransform;
        frontOrbitRef.current.style.opacity = bhOp;
      }

      if (horizonRef.current) {
        const hs = sampleStops(t, HORIZON_SCALE).toFixed(3);
        horizonRef.current.style.transform = `translate3d(0, ${bhY}svh, 0) scale(${hs})`;
        horizonRef.current.style.opacity = sampleStops(t, HORIZON_OPACITY).toFixed(3);
      }

      if (wreathRef.current) {
        const ws = sampleStops(t, WREATH_SCALE).toFixed(3);
        wreathRef.current.style.transform = `translate3d(0, ${bhY}svh, 0) scale(${ws})`;
        wreathRef.current.style.opacity = sampleStops(t, WREATH_OPACITY).toFixed(3);
      }
      if (wreathSharpRef.current) {
        wreathSharpRef.current.style.opacity = sampleStops(t, WREATH_SHARP_OPACITY).toFixed(3);
      }
      if (wreathBlurRef.current) {
        wreathBlurRef.current.style.opacity = sampleStops(t, WREATH_BLUR_OPACITY).toFixed(3);
      }

      if (modelRef.current) {
        const my = sampleStops(t, MODEL_Y_SVH).toFixed(2);
        const msx = sampleStops(t, MODEL_SCALE_X).toFixed(3);
        const msy = sampleStops(t, MODEL_SCALE_Y).toFixed(3);
        const mop = sampleStops(t, MODEL_OPACITY).toFixed(3);
        const u = clamp01((t - 0.05) / 0.38);
        const sk = (-2.5 * u).toFixed(2);
        const rot = (-7 * u).toFixed(2);
        modelRef.current.style.transform = `translate3d(0, ${my}svh, 0) scale(${msx}, ${msy}) skewX(${sk}deg) rotate(${rot}deg)`;
        modelRef.current.style.opacity = mop;
      }

      applyFallbackTextSuction(eyebrowRef.current, t, {
        endT: 0.31,
        pullXVw: 10,
        pullYSvh: 19,
        midScaleX: 0.84,
        midScaleY: 0.94,
        endScaleX: 0.22,
        endScaleY: 0.28,
        skewDeg: -3,
        rotateDeg: 2,
      });
      applyFallbackTextSuction(titleRef.current, t, {
        endT: 0.4,
        pullXVw: 9,
        pullYSvh: 18.5,
        midScaleX: 0.92,
        midScaleY: 0.98,
        endScaleX: 0.14,
        endScaleY: 0.19,
        skewDeg: -4,
        rotateDeg: 2,
      });
      applyFallbackTextSuction(descRef.current, t, {
        endT: 0.36,
        pullXVw: 8,
        pullYSvh: 13.5,
        midScaleX: 0.9,
        midScaleY: 0.96,
        endScaleX: 0.16,
        endScaleY: 0.21,
        skewDeg: -3,
        rotateDeg: -2,
      });
      applyFallbackTextSuction(ctaRef.current, t, {
        endT: 0.42,
        pullXVw: 8,
        pullYSvh: 8.5,
        midScaleX: 0.94,
        midScaleY: 0.98,
        endScaleX: 0.15,
        endScaleY: 0.19,
        skewDeg: -2,
        rotateDeg: -2,
      });
      applyFallbackTextSuction(counterRef.current, t, {
        endT: 0.31,
        pullXVw: 9,
        pullYSvh: 4.5,
        midScaleX: 0.84,
        midScaleY: 0.92,
        endScaleX: 0.2,
        endScaleY: 0.25,
        skewDeg: -2,
        rotateDeg: -2,
      });

      if (voidVeilRef.current) {
        voidVeilRef.current.style.opacity = sampleStops(t, VOID_VEIL_OPACITY).toFixed(3);
      }

      const colRefs = collectionsRefsRef.current;
      if (colRefs) {
        if (colRefs.envGlowRef.current) {
          const glowOp = clamp01((t - 0.5) / 0.14);
          colRefs.envGlowRef.current.style.opacity = glowOp.toFixed(3);
        }
        applyFallbackReveal(colRefs.headerRef.current, t, 0.54, 0.69, 28, 0.97);
        colRefs.cardRefs.current.forEach((card, idx) => {
          const startT = idx === 0 ? 0.58 : 0.63;
          const endT = idx === 0 ? 0.75 : 0.8;
          applyFallbackReveal(card, t, startT, endT, 42, 0.93);
        });
        applyFallbackReveal(colRefs.ctaRef.current, t, 0.68, 0.84, 24, 0.96);
      }
    };

    const scheduleSingleRaf = () => {
      if (rafPending) return;
      rafPending = true;
      rafId = window.requestAnimationFrame(applyFallbackFrame);
    };

    applyFallbackFrame();
    window.addEventListener('scroll', scheduleSingleRaf, { passive: true });
    window.addEventListener('pageshow', scheduleSingleRaf, { passive: true });
    window.addEventListener('resize', scheduleSingleRaf, { passive: true });

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', scheduleSingleRaf);
      window.removeEventListener('pageshow', scheduleSingleRaf);
      window.removeEventListener('resize', scheduleSingleRaf);
    };
  }, [cssTimelineSupported, portalRevealed]);

  return (
    <section
      data-testid="hero-traversal-track"
      data-mobile-traversal-driver={driver}
      className="limiar-mob-track relative"
    >
      <div ref={runwayRef} className="limiar-mob-runway">
        {/* Palco Sticky com altura estável em 100lvh + padding-bottom compensado por 100svh */}
        <div ref={stickyStageRef} className="limiar-mob-sticky">
          {/* CAMADA DE TRAVESSIA: HERO + COMPOSIÇÃO ORBITAL MOBILE */}
          <div
            ref={overlayGroupRef}
            className="limiar-mob-overlay-group relative z-10 w-full h-full md:h-auto flex items-center pointer-events-auto"
          >
            <div className="mx-auto max-w-[1360px] px-4 sm:px-8 pt-12 sm:pt-14 pb-6 sm:pb-10 w-full">
              <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-4 sm:gap-6">
                {/* Coluna Esquerda / Superior: Texto & CTA */}
                <div className="lg:col-span-6 xl:col-span-6 relative z-30 space-y-3 sm:space-y-6 lg:space-y-8">
                  <div
                    ref={eyebrowRef}
                    className="limiar-mob-eyebrow origin-center lg:origin-right"
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
                    className="limiar-mob-title origin-center lg:origin-right"
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
                    className="limiar-mob-desc origin-center lg:origin-right"
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
                    className="limiar-mob-cta pt-0.5 sm:pt-1 origin-center lg:origin-right"
                  >
                    <div
                      className="limiar-enter"
                      style={{ animationDelay: '135ms' }}
                    >
                      <UltravioletButton href={slide.ctaHref} size="lg">
                        {slide.ctaLabel}
                      </UltravioletButton>
                    </div>
                  </div>

                  <div
                    ref={counterRef}
                    className="limiar-mob-counter pt-1 sm:pt-4 origin-center lg:origin-right"
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

                {/* Coluna Direita / Inferior: Composição Orbital Pré-renderizada + Wreath + Modelo */}
                <div className="lg:col-span-6 xl:col-span-6 relative flex items-end justify-center xl:pr-10">
                  <div className="relative w-full max-w-[540px] lg:max-w-[610px] min-h-[360px] sm:min-h-[460px] lg:min-h-[540px] flex items-end justify-center select-none">
                    {/* CAMADAS 02 + 03 — MOLDURA WREATH & BURACO NEGRO ORBITAL TRASEIRO */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute top-[41.5%] sm:top-[43.2%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[148%] sm:w-[156%] lg:w-[156%] aspect-[1.32/1] max-w-none z-0 flex items-center justify-center"
                    >
                      {/* Moldura Wreath Cybersigilism com crossfade pré-desfocado + rotação CSS */}
                      <div
                        ref={wreathRef}
                        data-hero-layer="cybersigilism"
                        className="limiar-mob-wreath relative w-[70.27%] sm:w-[70.51%] aspect-square flex items-center justify-center origin-center z-0"
                      >
                        <div className="limiar-mob-ambient limiar-mob-wreath-spin relative w-full h-full origin-center">
                          <img
                            ref={wreathSharpRef}
                            src="/assets/hero-wreath-640.webp"
                            alt=""
                            width={640}
                            height={640}
                            decoding="async"
                            fetchPriority="high"
                            draggable={false}
                            className="limiar-mob-wreath-sharp absolute inset-0 w-full h-full block object-contain opacity-[0.86] pointer-events-none"
                          />
                          <img
                            ref={wreathBlurRef}
                            src="/assets/hero-wreath-640-blur.webp"
                            alt=""
                            width={640}
                            height={640}
                            decoding="async"
                            draggable={false}
                            className="limiar-mob-wreath-blur absolute inset-0 w-full h-full block object-contain opacity-0 pointer-events-none"
                          />
                        </div>
                      </div>

                      {/* Matéria Orbital Traseira + Halo Interno (transparência nativa no WebP) */}
                      <div
                        ref={blackholeRearRef}
                        data-hero-layer="blackhole"
                        className="limiar-mob-blackhole-rear absolute inset-0 z-10 flex items-center justify-center origin-center pointer-events-none"
                      >
                        <img
                          src="/assets/blackhole/rear-accretion-768.webp"
                          alt=""
                          width={768}
                          height={582}
                          decoding="async"
                          fetchPriority="high"
                          draggable={false}
                          className="limiar-mob-ambient limiar-mob-orbit-rear absolute inset-0 w-full h-full object-contain pointer-events-none"
                        />
                        <img
                          src="/assets/blackhole/inner-halo-768.webp"
                          alt=""
                          width={768}
                          height={582}
                          decoding="async"
                          draggable={false}
                          className="limiar-mob-ambient limiar-mob-orbit-halo absolute inset-0 w-full h-full object-contain pointer-events-none"
                        />
                      </div>

                      {/* Horizonte de Eventos Preto (camada irmã plana sem escala aninhada) */}
                      <div
                        ref={horizonRef}
                        aria-hidden="true"
                        className="limiar-mob-horizon absolute z-[12] w-[37.2%] aspect-square rounded-full origin-center pointer-events-none"
                        style={{
                          background:
                            'radial-gradient(circle, #020203 93%, rgba(2,2,3,0.92) 97%, rgba(2,2,3,0) 100%)',
                        }}
                      />
                    </div>

                    {/* CAMADA 04 — MODELO OFICIAL LIMIAR */}
                    <div
                      ref={modelRef}
                      data-hero-layer="model"
                      className="limiar-mob-model pointer-events-none absolute inset-x-0 mx-auto bottom-[21%] sm:bottom-[22%] z-20 w-[94%] sm:w-[88%] lg:w-[95%] max-w-[540px] origin-center"
                    >
                      <picture>
                        <source
                          srcSet="/assets/hero-model-640.webp 640w, /assets/hero-model-1080.webp 1080w"
                          sizes="(max-width: 640px) 94vw, 540px"
                          type="image/webp"
                        />
                        <img
                          src="/assets/hero-model-640.webp"
                          alt={slide.imageAlt}
                          width={640}
                          height={585}
                          decoding="async"
                          fetchPriority="high"
                          draggable={false}
                          className="w-full h-auto block object-contain object-bottom [mask-image:linear-gradient(to_bottom,black_0%,black_85%,transparent_100%)]"
                        />
                      </picture>
                    </div>

                    {/* CAMADA 05 — MATÉRIA ORBITAL FRONTAL (ACIMA DA MODELO E DA MOLDURA) */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute top-[41.5%] sm:top-[43.2%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[148%] sm:w-[156%] lg:w-[156%] aspect-[1.32/1] max-w-none z-30 flex items-center justify-center"
                    >
                      <div
                        ref={frontOrbitRef}
                        data-hero-layer="blackhole-front"
                        className="limiar-mob-front-orbit absolute inset-0 flex items-center justify-center origin-center"
                      >
                        <img
                          src="/assets/blackhole/front-orbit-768.webp"
                          alt=""
                          width={768}
                          height={582}
                          decoding="async"
                          fetchPriority="high"
                          draggable={false}
                          className="limiar-mob-ambient limiar-mob-orbit-front w-full h-full object-contain pointer-events-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* VÉU DE ESCURIDÃO DO HORIZONTE DE EVENTOS */}
          <div
            ref={voidVeilRef}
            aria-hidden="true"
            data-testid="horizon-void-veil"
            className="limiar-mob-void-veil pointer-events-none absolute inset-0 z-[24] opacity-0"
            style={{
              background:
                'radial-gradient(circle at 50% 50%, #030304 0%, #050507 65%, #070709 100%)',
            }}
          />
        </div>
      </div>

      {/* REVELAÇÃO SEQUENCIAL DAS COLEÇÕES + CONTEÚDO UNIFICADO DA HOMEPAGE */}
      <CollectionsRevealSection
        collections={collections}
        mobileTimelineMode={cssTimelineSupported ? 'css' : 'raf'}
        onRegisterMobileRefs={handleRegisterCollectionsRefs}
        onViewAllProducts={onViewAllProducts}
      >
        {postCollectionsContent}
      </CollectionsRevealSection>
    </section>
  );
}
