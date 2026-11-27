import React, { useEffect, useRef } from 'react';
import { motion, useMotionValue } from 'motion/react';
import {
  computeElementCollapse,
  computeSingularityFrame,
  smootherstep,
  type CollapseVectorConfig,
} from '../../motion/gravitationalTimeline';
import {
  CinematicProgressDamper,
  HERO_TRAVERSAL_DAMPER_CONFIG,
  getEffectiveScrollY,
  subscribePhysicsScroll,
} from '../../motion/scrollPhysics';
import { useThresholdPointer } from '../../motion/ThresholdMotionProvider';
import { ThresholdMagnetic } from '../../motion/ThresholdPrimitives';
import { THRESHOLD_EASE } from '../../motion/thresholdConfig';
import type { Collection } from '../../types/commerce';
import { CollectionsRevealSection } from '../collections/CollectionsRevealSection';
import { LimiarStar } from '../ornaments/CybersigilismOrnaments';
import { UltravioletButton } from '../ui/UltravioletButton';
import type { HeroSlideData } from './HeroTraversalStage';

interface HeroTraversalStageMobileProps {
  slide: HeroSlideData;
  activeSlideIndex: number;
  totalSlides: number;
  collections: Collection[];
  onViewAllProducts: () => void;
  postCollectionsContent?: React.ReactNode;
}

interface MeasuredBox {
  centerX: number;
  centerY: number;
}

function measureElementCenter(
  node: HTMLElement | null,
  parentRect: DOMRect | undefined
): MeasuredBox | null {
  if (!node || !parentRect) return null;
  return {
    centerX: parentRect.left + node.offsetLeft + node.offsetWidth * 0.5,
    centerY: parentRect.top + node.offsetTop + node.offsetHeight * 0.5,
  };
}

function pullFromMeasured(
  measured: MeasuredBox | null,
  targetX: number,
  targetY: number,
  pullFactor: number
): { pullX: number; pullY: number } {
  if (!measured) return { pullX: 0, pullY: 0 };
  return {
    pullX: (targetX - measured.centerX) * pullFactor,
    pullY: (targetY - measured.centerY) * pullFactor,
  };
}

/**
 * Aplica colapso gravitacional estritamente via transform e opacity
 * Sem filtros de desfoque dinâmico nem distorções SVG
 */
function applyCollapseStyleMobile(
  node: HTMLElement | null,
  progress: number,
  config: CollapseVectorConfig
) {
  if (!node) return;
  const st = computeElementCollapse(progress, config);
  node.style.opacity = String(st.opacity);
  node.style.transform = `translate3d(${st.x}px, ${st.y}px, 0) scale(${st.scale * st.scaleX}, ${st.scale * st.scaleY}) skewX(${st.skewXDeg}deg) rotate(${st.rotateDeg}deg)`;
  node.style.pointerEvents = st.pointerInteractive ? 'auto' : 'none';
}

export function HeroTraversalStageMobile({
  slide,
  activeSlideIndex,
  totalSlides,
  collections,
  onViewAllProducts,
  postCollectionsContent,
}: HeroTraversalStageMobileProps) {
  const { portalRevealed } = useThresholdPointer();
  const trackRef = useRef<HTMLElement | null>(null);
  const leftColRef = useRef<HTMLDivElement | null>(null);
  const compositionRef = useRef<HTMLDivElement | null>(null);

  // Elementos do texto e CTA
  const eyebrowRef = useRef<HTMLParagraphElement | null>(null);
  const titleRef = useRef<HTMLDivElement | null>(null);
  const descRef = useRef<HTMLParagraphElement | null>(null);
  const ctaRef = useRef<HTMLDivElement | null>(null);
  const counterRef = useRef<HTMLDivElement | null>(null);
  const scrollHintRef = useRef<HTMLDivElement | null>(null);

  // Elementos visuais da composição mobile (sem WebGL)
  const eventHorizonOuterRef = useRef<HTMLDivElement | null>(null);
  const wreathTransformRef = useRef<HTMLDivElement | null>(null);
  const wreathRotateRef = useRef<HTMLDivElement | null>(null);
  const modelCollapseRef = useRef<HTMLDivElement | null>(null);
  const voidVeilRef = useRef<HTMLDivElement | null>(null);
  const heroOverlayGroupRef = useRef<HTMLDivElement | null>(null);

  // Estado de rotação contínua da moldura tribal
  const progressRef = useRef(0);
  const angleDegRef = useRef(0);
  const lastScrollYRef = useRef(0);
  const smoothedBoostRef = useRef(0);
  const wasAtRestRef = useRef(false);
  const wasPastRevealRef = useRef(false);
  const ensureWreathLoopRef = useRef<(() => void) | null>(null);
  const metricsRef = useRef({ sectionTopDocY: 0, maxReachableScroll: 1 });

  const progressMv = useMotionValue(0);

  useEffect(() => {
    const restConfig: CollapseVectorConfig = {
      pullX: 0,
      pullY: 0,
      stretchFactor: 0,
      skewDeg: 0,
      rotateDeg: 0,
      resistance: 1,
    };

    const applyFrame = (p: number) => {
      progressMv.set(p);
      progressRef.current = p;

      if (p < 0.78) {
        ensureWreathLoopRef.current?.();
      }

      const width = typeof window !== 'undefined' ? window.innerWidth : 390;
      const height = typeof window !== 'undefined' ? window.innerHeight : 844;

      const frame = computeSingularityFrame(p, true);

      if (trackRef.current) {
        trackRef.current.dataset.traversalStage = frame.stage;
        trackRef.current.dataset.traversalProgress = p.toFixed(3);
      }

      if (scrollHintRef.current) {
        const hintOpacity = p < 0.08 ? Math.max(0, 1 - p / 0.08) : 0;
        scrollHintRef.current.style.opacity = String(hintOpacity.toFixed(3));
      }

      // Fast-path de repouso
      if (p <= 0.1) {
        wasPastRevealRef.current = false;
        if (!wasAtRestRef.current) {
          wasAtRestRef.current = true;
          applyCollapseStyleMobile(eyebrowRef.current, p, restConfig);
          applyCollapseStyleMobile(titleRef.current, p, restConfig);
          applyCollapseStyleMobile(descRef.current, p, restConfig);
          applyCollapseStyleMobile(ctaRef.current, p, restConfig);
          applyCollapseStyleMobile(counterRef.current, p, restConfig);
          applyCollapseStyleMobile(modelCollapseRef.current, p, restConfig);

          if (wreathTransformRef.current) {
            wreathTransformRef.current.style.transform = `translate3d(0px, 0px, 0) scale(${frame.wreathScale})`;
            wreathTransformRef.current.style.opacity = '1';
          }
          const restHorizonTransform = `translate3d(0px, 0px, 0) scale(${frame.scale})`;
          if (eventHorizonOuterRef.current) {
            eventHorizonOuterRef.current.style.transform = restHorizonTransform;
            eventHorizonOuterRef.current.style.opacity = '1';
          }
          if (heroOverlayGroupRef.current) {
            heroOverlayGroupRef.current.style.opacity = '1';
            heroOverlayGroupRef.current.style.pointerEvents = 'auto';
          }
          if (voidVeilRef.current) {
            voidVeilRef.current.style.opacity = '0';
          }
        }
        return;
      }

      wasAtRestRef.current = false;

      if (p >= 1) {
        if (wasPastRevealRef.current) return;
        wasPastRevealRef.current = true;
      } else {
        wasPastRevealRef.current = false;
      }

      // Leituras de geometria
      const compRect = compositionRef.current?.getBoundingClientRect();
      const leftRect = leftColRef.current?.getBoundingClientRect();

      const eyebrowCenter = measureElementCenter(eyebrowRef.current, leftRect);
      const titleCenter = measureElementCenter(titleRef.current, leftRect);
      const descCenter = measureElementCenter(descRef.current, leftRect);
      const ctaCenter = measureElementCenter(ctaRef.current, leftRect);
      const counterCenter = measureElementCenter(counterRef.current, leftRect);
      const modelCenter = measureElementCenter(modelCollapseRef.current, compRect);

      // Centro gravitacional do horizonte de eventos
      const bhCenterX = compRect
        ? compRect.left + compRect.width * 0.5
        : width * 0.5;
      const bhCenterY = compRect
        ? compRect.top + compRect.height * 0.415
        : height * 0.48;

      const vpCenterX = width * 0.5;
      const vpCenterY = height * 0.5;

      const shiftX = (vpCenterX - bhCenterX) * frame.centerBlend;
      const shiftY = (vpCenterY - bhCenterY) * frame.centerBlend;

      const targetSingularityX = bhCenterX + shiftX;
      const targetSingularityY = bhCenterY + shiftY;

      // Sucção e atração dos textos
      applyCollapseStyleMobile(eyebrowRef.current, p, {
        ...pullFromMeasured(eyebrowCenter, targetSingularityX, targetSingularityY, 0.52),
        stretchFactor: 0.16,
        skewDeg: -3,
        rotateDeg: 2,
        resistance: 0.74,
      });

      applyCollapseStyleMobile(titleRef.current, p, {
        ...pullFromMeasured(titleCenter, targetSingularityX, targetSingularityY, 0.58),
        stretchFactor: 0.18,
        skewDeg: -4,
        rotateDeg: 2,
        resistance: 0.88,
      });

      applyCollapseStyleMobile(descRef.current, p, {
        ...pullFromMeasured(descCenter, targetSingularityX, targetSingularityY, 0.54),
        stretchFactor: 0.15,
        skewDeg: -3,
        rotateDeg: -2,
        resistance: 0.82,
      });

      applyCollapseStyleMobile(ctaRef.current, p, {
        ...pullFromMeasured(ctaCenter, targetSingularityX, targetSingularityY, 0.5),
        stretchFactor: 0.14,
        skewDeg: -2,
        rotateDeg: -2,
        resistance: 0.94,
      });

      applyCollapseStyleMobile(counterRef.current, p, {
        ...pullFromMeasured(counterCenter, targetSingularityX, targetSingularityY, 0.48),
        stretchFactor: 0.12,
        skewDeg: -2,
        rotateDeg: -2,
        resistance: 0.7,
      });

      // Sucção da modelo em direção ao horizonte de eventos
      applyCollapseStyleMobile(modelCollapseRef.current, p, {
        ...pullFromMeasured(modelCenter, targetSingularityX, targetSingularityY, 0.95),
        stretchFactor: 0.14,
        skewDeg: -2.5,
        rotateDeg: -7,
        resistance: 1.0,
      });

      // Expansão e translação da moldura tribal
      if (wreathTransformRef.current) {
        wreathTransformRef.current.style.transform = `translate3d(${shiftX.toFixed(
          2
        )}px, ${shiftY.toFixed(2)}px, 0) scale(${frame.wreathScale})`;
        wreathTransformRef.current.style.opacity = p >= 0.72 ? '0' : '1';
      }

      // Expansão e translação do horizonte de eventos circular preto (#030304)
      const horizonTransform = `translate3d(${shiftX.toFixed(
        2
      )}px, ${shiftY.toFixed(2)}px, 0) scale(${frame.scale})`;
      const horizonOpacity = String(frame.heroVisibility);

      if (eventHorizonOuterRef.current) {
        eventHorizonOuterRef.current.style.transform = horizonTransform;
        eventHorizonOuterRef.current.style.opacity = horizonOpacity;
      }

      if (heroOverlayGroupRef.current) {
        heroOverlayGroupRef.current.style.opacity = String(frame.heroVisibility);
        heroOverlayGroupRef.current.style.pointerEvents =
          p < 0.28 && frame.heroVisibility > 0.5 ? 'auto' : 'none';
      }

      // Véu radial preto (#030304) cobrindo a viewport antes da revelação
      if (voidVeilRef.current) {
        voidVeilRef.current.style.opacity = String(frame.voidVeilOpacity);
      }
    };

    const damper = new CinematicProgressDamper(HERO_TRAVERSAL_DAMPER_CONFIG);
    let damperRafId = 0;
    let lastTickMs = 0;

    const measureMetrics = () => {
      if (typeof window === 'undefined' || !trackRef.current) return;
      const vh = Math.max(window.innerHeight, 320);
      const rect = trackRef.current.getBoundingClientRect();
      const sectionTopDocY = rect.top + getEffectiveScrollY();
      const maxReachableScroll = Math.max(
        1,
        document.documentElement.scrollHeight - vh - sectionTopDocY
      );
      metricsRef.current = { sectionTopDocY, maxReachableScroll };
    };

    const computeScrollProgress = () => {
      if (typeof window === 'undefined') return 0;
      const vh = Math.max(window.innerHeight, 320);
      const { sectionTopDocY, maxReachableScroll } = metricsRef.current;
      const scrolledPastTop = Math.max(0, getEffectiveScrollY() - sectionTopDocY);
      const baseSpanPx = vh * 2.12;
      const effectiveSpanPx = Math.min(baseSpanPx, maxReachableScroll / 0.94);
      return Math.min(1, Math.max(0, scrolledPastTop / Math.max(1, effectiveSpanPx)));
    };

    const stepDamper = (now: number) => {
      if (document.visibilityState === 'hidden') {
        damperRafId = 0;
        return;
      }
      const dtSec = lastTickMs > 0 ? (now - lastTickMs) / 1000 : 1 / 60;
      lastTickMs = now;
      const smoothedP = damper.step(dtSec);
      applyFrame(smoothedP);
      if (!damper.isSettled()) {
        damperRafId = window.requestAnimationFrame(stepDamper);
      } else {
        damperRafId = 0;
        lastTickMs = 0;
      }
    };

    const syncFromScroll = () => {
      const targetP = computeScrollProgress();
      damper.setTarget(targetP);
      if (!damper.isSettled() && !damperRafId && document.visibilityState !== 'hidden') {
        lastTickMs = performance.now();
        damperRafId = window.requestAnimationFrame(stepDamper);
      }
    };

    const snapFromLayout = () => {
      const snapped = damper.snap(computeScrollProgress());
      applyFrame(snapped);
    };

    const onResize = () => {
      wasAtRestRef.current = false;
      wasPastRevealRef.current = false;
      measureMetrics();
      snapFromLayout();
    };

    measureMetrics();
    snapFromLayout();

    const unsubPhysics = subscribePhysicsScroll(syncFromScroll);
    window.addEventListener('resize', onResize, { passive: true });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && trackRef.current) {
      resizeObserver = new ResizeObserver(() => {
        measureMetrics();
        snapFromLayout();
      });
      resizeObserver.observe(trackRef.current);
    }

    return () => {
      if (damperRafId) window.cancelAnimationFrame(damperRafId);
      unsubPhysics();
      window.removeEventListener('resize', onResize);
      resizeObserver?.disconnect();
    };
  }, [progressMv]);

  // Rotação contínua da moldura tribal exclusivamente anti-horária
  useEffect(() => {
    if (typeof window === 'undefined' || !portalRevealed) return;

    let rafId = 0;
    let lastTime = performance.now();
    lastScrollYRef.current = getEffectiveScrollY();

    const BASE_DEG_PER_SEC = 3.6;
    const PROGRESS_EXTRA_DEG_PER_SEC = 26.0;
    const MAX_VELOCITY_BOOST = 82.0;
    const MAX_TOTAL_DEG_PER_SEC = 112.0;

    const shouldRun = () =>
      (typeof document === 'undefined' || document.visibilityState !== 'hidden') &&
      progressRef.current < 0.78;

    const tick = (now: number) => {
      if (!shouldRun()) {
        rafId = 0;
        smoothedBoostRef.current = 0;
        return;
      }

      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

      const currentScrollY = getEffectiveScrollY();
      const deltaScrollPx = Math.abs(currentScrollY - lastScrollYRef.current);
      lastScrollYRef.current = currentScrollY;

      const p = progressRef.current;
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

      angleDegRef.current = (angleDegRef.current - effectiveSpeed * dt) % 360000;

      if (wreathRotateRef.current) {
        wreathRotateRef.current.style.transform = `rotate(${angleDegRef.current.toFixed(3)}deg)`;
      }

      rafId = window.requestAnimationFrame(tick);
    };

    const ensureLoop = () => {
      if (!rafId && shouldRun()) {
        lastTime = performance.now();
        lastScrollYRef.current = getEffectiveScrollY();
        rafId = window.requestAnimationFrame(tick);
      }
    };

    ensureWreathLoopRef.current = ensureLoop;
    ensureLoop();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        ensureLoop();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      ensureWreathLoopRef.current = null;
      document.removeEventListener('visibilitychange', onVisibility);
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [portalRevealed]);

  return (
    <section
      ref={trackRef}
      data-testid="hero-traversal-track-mobile"
      data-traversal-stage="repouso"
      data-traversal-progress="0.000"
      className="relative"
    >
      {/* Palco Sticky: fixa exclusivamente a travessia hero -> singularidade -> véu em 100dvh */}
      <div className="sticky top-0 z-10 h-[100dvh] w-full overflow-hidden flex flex-col pointer-events-none">
        {/* CAMADA DE TRAVESSIA: HERO MOBILE COM HORIZONTE DE EVENTOS (#030304) */}
        <div
          ref={heroOverlayGroupRef}
          className="relative z-10 w-full h-full flex items-center pointer-events-auto"
        >
          <div className="mx-auto max-w-[1360px] px-4 sm:px-8 pt-12 pb-6 w-full">
            <div className="grid grid-cols-1 items-center gap-4">
              {/* Coluna Texto & CTA */}
              <div
                ref={leftColRef}
                className="relative z-30 space-y-3"
              >
                <div
                  ref={eyebrowRef}
                  className="will-change-transform origin-right"
                >
                  <p
                    className="limiar-enter text-[11px] uppercase tracking-[0.24em] text-[var(--text-muted)]"
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
                    <h1 className="font-display font-light text-3xl leading-[1.03] tracking-[0.03em] text-[var(--text-primary)] uppercase text-balance max-w-xl">
                      {slide.title}
                    </h1>
                    <LimiarStar className="w-6 h-6 text-[var(--text-secondary)] shrink-0 mt-1.5 opacity-80" />
                  </div>
                </div>

                <div
                  ref={descRef}
                  className="will-change-transform origin-right"
                >
                  <p
                    className="limiar-enter text-sm text-[var(--text-secondary)] max-w-md leading-relaxed"
                    style={{ animationDelay: '90ms' }}
                  >
                    {slide.description}
                  </p>
                </div>

                <div
                  ref={ctaRef}
                  className="pt-0.5 will-change-transform origin-right"
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
                  className="pt-1 will-change-transform origin-right"
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

              {/* Composição visual mobile: Moldura tribal + Horizonte de eventos CSS (#030304) + Modelo */}
              <div className="relative flex items-end justify-center">
                <div
                  ref={compositionRef}
                  className="relative w-full max-w-[540px] min-h-[360px] flex items-end justify-center select-none"
                >
                  {/* CAMADAS 02 + 03 — MOLDURA WREATH & HORIZONTE DE EVENTOS CIRCULAR (#030304) */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute top-[41.5%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[148%] aspect-[1.32/1] max-w-none z-0 flex items-center justify-center"
                  >
                    <div className="relative w-full h-full flex items-center justify-center">
                      {/* CAMADA 02 — MOLDURA WREATH CYBERSIGILISM (ATRÁS DA MODELO E DO HORIZONTE) */}
                      <div
                        ref={wreathTransformRef}
                        data-hero-layer="cybersigilism"
                        className="relative w-[70.27%] aspect-square flex items-center justify-center will-change-transform origin-center z-0"
                      >
                        <div
                          ref={wreathRotateRef}
                          className="w-full h-full will-change-transform origin-center"
                        >
                          <motion.div
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={
                              portalRevealed
                                ? { opacity: 1, scale: 1 }
                                : { opacity: 0, scale: 0.96 }
                            }
                            transition={{ duration: 0.5, delay: 0.05, ease: THRESHOLD_EASE }}
                            className="w-full h-full"
                          >
                            <picture>
                              <source
                                srcSet="/assets/hero-wreath-640.webp 640w, /assets/hero-wreath-960.webp 960w"
                                sizes="(max-width: 640px) 104vw, 680px"
                                type="image/webp"
                              />
                              <img
                                src="/assets/aistudio/Moldura_Wreath_Cibern_tica_Prateada_78a3f5f9.png"
                                alt=""
                                width={1254}
                                height={1254}
                                decoding="async"
                                fetchPriority="high"
                                draggable={false}
                                className="w-full h-full block object-contain mix-blend-normal opacity-[0.84] dark:opacity-[0.88] dark:brightness-[1.02] dark:contrast-[1.06]"
                              />
                            </picture>
                          </motion.div>
                        </div>
                      </div>

                      {/* CAMADA 03 — HORIZONTE DE EVENTOS CIRCULAR PRETO (#030304) INDEPENDENTE */}
                      <div
                        ref={eventHorizonOuterRef}
                        data-hero-layer="event-horizon"
                        className="absolute inset-0 z-10 flex items-center justify-center will-change-transform origin-center pointer-events-none"
                      >
                        <motion.div
                          initial={{ opacity: 0, scale: 0.96 }}
                          animate={
                            portalRevealed
                              ? { opacity: 1, scale: 1 }
                              : { opacity: 0, scale: 0.96 }
                          }
                          transition={{ duration: 0.52, delay: 0, ease: THRESHOLD_EASE }}
                          className="w-full h-full flex items-center justify-center"
                        >
                          <div
                            className="w-[42%] aspect-square rounded-full bg-[#030304] will-change-transform"
                            style={{
                              boxShadow: '0 0 40px rgba(3, 3, 4, 0.85)',
                            }}
                          />
                        </motion.div>
                      </div>
                    </div>
                  </div>

                  {/* CAMADA 04 — MODELO OFICIAL LIMIAR (EM FRENTE AO HORIZONTE E À MOLDURA) */}
                  <div
                    ref={modelCollapseRef}
                    className="pointer-events-none absolute inset-x-0 mx-auto bottom-[21%] z-20 w-[94%] max-w-[540px] will-change-transform origin-center"
                  >
                    <motion.div
                      data-hero-layer="model"
                      className="w-full"
                    >
                      <motion.div
                        initial={{ opacity: 0, y: 14 }}
                        animate={
                          portalRevealed
                            ? { opacity: 1, y: 0 }
                            : { opacity: 0, y: 14 }
                        }
                        transition={{ duration: 0.5, delay: 0.09, ease: THRESHOLD_EASE }}
                      >
                        <picture>
                          <source
                            srcSet="/assets/hero-model-640.webp 640w, /assets/hero-model-1080.webp 1080w, /assets/hero-model.webp 1312w"
                            sizes="(max-width: 640px) 94vw, 540px"
                            type="image/webp"
                          />
                          <img
                            src="/assets/hero-model.png"
                            alt={slide.imageAlt}
                            width={1312}
                            height={1199}
                            decoding="async"
                            fetchPriority="high"
                            draggable={false}
                            className="w-full h-auto block object-contain object-bottom [mask-image:linear-gradient(to_bottom,black_0%,black_85%,transparent_100%)]"
                          />
                        </picture>
                      </motion.div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* VÉU DE ESCURIDÃO DO HORIZONTE DE EVENTOS (#030304) */}
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
      </div>

      {/* Espaço da travessia gravitacional antes da entrada sequencial das coleções */}
      <div aria-hidden="true" className="h-[80vh] pointer-events-none" />

      {/* REVELAÇÃO SEQUENCIAL DAS COLEÇÕES + CONTEÚDO UNIFICADO DA HOMEPAGE */}
      <CollectionsRevealSection
        collections={collections}
        progressMv={progressMv}
        onViewAllProducts={onViewAllProducts}
      >
        {postCollectionsContent}
      </CollectionsRevealSection>
    </section>
  );
}
