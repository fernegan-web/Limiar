import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useMotionValue } from 'motion/react';
import {
  computeElementCollapse,
  computeSingularityFrame,
  smootherstep,
  type BlackHoleQualityTier,
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
  postCollectionsContent?: React.ReactNode;
}

interface MeasuredBox {
  centerX: number;
  centerY: number;
}

function measureElementCenter(
  node: HTMLElement | null,
  parentRect: { left: number; top: number } | undefined
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

function applyCollapseStyle(
  node: HTMLElement | null,
  progress: number,
  config: CollapseVectorConfig,
  enableSvgWarpFilter = false,
  svgFilterUrl?: string,
  isMobile = false
) {
  if (!node) return;
  const st = computeElementCollapse(progress, config, isMobile);
  node.style.opacity = String(st.opacity);
  node.style.transform = `translate3d(${st.x}px, ${st.y}px, 0) scale(${st.scale * st.scaleX}, ${st.scale * st.scaleY}) skewX(${st.skewXDeg}deg) rotate(${st.rotateDeg}deg)`;
  if (!isMobile) {
    const blurFilter = st.blurPx > 0.1 ? `blur(${st.blurPx}px)` : '';
    const warpFilter =
      enableSvgWarpFilter && svgFilterUrl && progress > 0.24 && progress < 0.7
        ? ` url(${svgFilterUrl})`
        : '';
    node.style.filter = `${blurFilter}${warpFilter}`.trim() || 'none';
  }
  node.style.pointerEvents = st.pointerInteractive ? 'auto' : 'none';
}

export function HeroTraversalStage({
  slide,
  activeSlideIndex,
  totalSlides,
  collections,
  onViewAllProducts,
  postCollectionsContent,
}: HeroTraversalStageProps) {
  const { portalRevealed } = useThresholdPointer();
  const trackRef = useRef<HTMLElement | null>(null);
  const stickyStageRef = useRef<HTMLDivElement | null>(null);
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
  const wreathSharpLayerRef = useRef<HTMLDivElement | null>(null);
  const wreathBlurredLayerRef = useRef<HTMLImageElement | null>(null);
  const modelCollapseRef = useRef<HTMLDivElement | null>(null);
  const voidVeilRef = useRef<HTMLDivElement | null>(null);
  const heroOverlayGroupRef = useRef<HTMLDivElement | null>(null);

  // Estado contínuo da rotação anti-horária da moldura
  const progressRef = useRef(0);
  const angleDegRef = useRef(0);
  const lastScrollYRef = useRef(0);
  const smoothedBoostRef = useRef(0);
  const wasAtRestRef = useRef(false);
  const wasPastRevealRef = useRef(false);
  const lastStageRef = useRef<string>('repouso');
  const mobileHiddenHeroRef = useRef(false);
  const mobileHiddenWreathRef = useRef(false);
  const mobileWillChangeActiveRef = useRef(false);
  const ensureWreathLoopRef = useRef<(() => void) | null>(null);
  const metricsRef = useRef<{
    sectionTopDocY: number;
    maxReachableScroll: number;
    vw: number;
    vh: number;
    isMobile: boolean;
    isDesktop: boolean;
    bhCenterX: number;
    bhCenterY: number;
    eyebrowCenter: MeasuredBox | null;
    titleCenter: MeasuredBox | null;
    descCenter: MeasuredBox | null;
    ctaCenter: MeasuredBox | null;
    counterCenter: MeasuredBox | null;
    railCenter: MeasuredBox | null;
    modelCenter: MeasuredBox | null;
  }>({
    sectionTopDocY: 0,
    maxReachableScroll: 1,
    vw: 1440,
    vh: 900,
    isMobile: false,
    isDesktop: true,
    bhCenterX: 1036,
    bhCenterY: 432,
    eyebrowCenter: null,
    titleCenter: null,
    descCenter: null,
    ctaCenter: null,
    counterCenter: null,
    railCenter: null,
    modelCenter: null,
  });

  const displacementRef = useRef<SVGFEDisplacementMapElement | null>(null);
  const rawId = useId();
  const warpFilterId = `limiar-gravity-warp-${rawId.replace(/:/g, '')}`;

  const [qualityTier, setQualityTier] = useState<BlackHoleQualityTier>('high');

  const progressMv = useMotionValue(0);

  const handleQualityChange = useCallback((tier: BlackHoleQualityTier) => {
    setQualityTier(tier);
  }, []);

  useEffect(() => {
    const restConfig: CollapseVectorConfig = {
      pullX: 0,
      pullY: 0,
      stretchFactor: 0,
      skewDeg: 0,
      rotateDeg: 0,
      resistance: 1,
    };

    const setMobileWillChange = (active: boolean, p: number) => {
      if (!metricsRef.current.isMobile) return;
      if (mobileWillChangeActiveRef.current !== active) {
        mobileWillChangeActiveRef.current = active;
        const val = active ? 'transform, opacity' : 'auto';
        const nodes = [
          eyebrowRef.current,
          titleRef.current,
          descRef.current,
          ctaRef.current,
          counterRef.current,
          modelCollapseRef.current,
          blackholeOuterRef.current,
          blackholeFrontOuterRef.current,
          wreathTransformRef.current,
        ];
        for (const el of nodes) {
          if (el) el.style.willChange = val;
        }
      }
      if (wreathRotateRef.current) {
        const rotateActive = p < 0.58;
        const target = rotateActive ? 'transform' : 'auto';
        if (wreathRotateRef.current.style.willChange !== target) {
          wreathRotateRef.current.style.willChange = target;
        }
      }
    };

    const applyFrame = (p: number) => {
      progressMv.set(p);
      progressRef.current = p;

      const m = metricsRef.current;
      const isMobile = m.isMobile;
      const isDesktop = isMobile
        ? false
        : typeof window !== 'undefined'
        ? window.innerWidth >= 1024
        : m.isDesktop;

      const wreathCutoff = isMobile ? 0.58 : 0.78;
      if (p < wreathCutoff) {
        ensureWreathLoopRef.current?.();
      }

      const width = isMobile
        ? m.vw
        : typeof window !== 'undefined'
        ? window.innerWidth
        : 1440;
      const height = isMobile
        ? m.vh
        : typeof window !== 'undefined'
        ? window.innerHeight
        : 900;

      const frame = computeSingularityFrame(p, isMobile);

      if (trackRef.current) {
        if (frame.stage !== lastStageRef.current) {
          lastStageRef.current = frame.stage;
          trackRef.current.dataset.traversalStage = frame.stage;
        }
        if (!isMobile) {
          trackRef.current.dataset.traversalProgress = p.toFixed(3);
        }
      }

      if (scrollHintRef.current && (!isMobile || width >= 640)) {
        const hintOpacity = p < 0.08 ? Math.max(0, 1 - p / 0.08) : 0;
        scrollHintRef.current.style.opacity = String(hintOpacity.toFixed(3));
      }

      // Fast-path em repouso: evita leituras de layout e escritas redundantes no DOM
      if (p <= 0.1) {
        wasPastRevealRef.current = false;
        setMobileWillChange(false, p);
        if (!wasAtRestRef.current) {
          wasAtRestRef.current = true;
          if (displacementRef.current && !isMobile) {
            displacementRef.current.setAttribute('scale', '0');
          }
          if (mobileHiddenHeroRef.current) {
            mobileHiddenHeroRef.current = false;
            if (heroOverlayGroupRef.current) heroOverlayGroupRef.current.style.visibility = 'visible';
            if (blackholeOuterRef.current) blackholeOuterRef.current.style.visibility = 'visible';
            if (blackholeFrontOuterRef.current) blackholeFrontOuterRef.current.style.visibility = 'visible';
          }
          if (mobileHiddenWreathRef.current) {
            mobileHiddenWreathRef.current = false;
            if (wreathTransformRef.current) wreathTransformRef.current.style.visibility = 'visible';
          }

          applyCollapseStyle(eyebrowRef.current, p, restConfig, false, undefined, isMobile);
          applyCollapseStyle(titleRef.current, p, restConfig, false, undefined, isMobile);
          applyCollapseStyle(descRef.current, p, restConfig, false, undefined, isMobile);
          applyCollapseStyle(ctaRef.current, p, restConfig, false, undefined, isMobile);
          applyCollapseStyle(counterRef.current, p, restConfig, false, undefined, isMobile);
          if (!isMobile) {
            applyCollapseStyle(railRef.current, p, restConfig);
          }
          applyCollapseStyle(modelCollapseRef.current, p, restConfig, false, undefined, isMobile);

          if (wreathTransformRef.current) {
            wreathTransformRef.current.style.transform = `translate3d(0px, 0px, 0) scale(${frame.wreathScale})`;
            wreathTransformRef.current.style.opacity = '1';
          }
          if (isMobile) {
            if (wreathSharpLayerRef.current) wreathSharpLayerRef.current.style.opacity = '1';
            if (wreathBlurredLayerRef.current) wreathBlurredLayerRef.current.style.opacity = '0';
          } else if (wreathBlurRef.current) {
            wreathBlurRef.current.style.filter = 'none';
          }
          const restTransform = `translate3d(0px, 0px, 0) scale(${frame.scale})`;
          if (blackholeOuterRef.current) {
            blackholeOuterRef.current.style.transform = restTransform;
            blackholeOuterRef.current.style.opacity = '1';
          }
          if (blackholeFrontOuterRef.current) {
            blackholeFrontOuterRef.current.style.transform = restTransform;
            blackholeFrontOuterRef.current.style.opacity = '1';
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
        if (wasPastRevealRef.current) {
          return;
        }
        wasPastRevealRef.current = true;
      } else {
        wasPastRevealRef.current = false;
      }

      setMobileWillChange(p < 0.7, p);

      // No mobile, após p >= 0.70 todo o palco do Hero já tem opacidade zero: suspende mutações e oculta camadas
      if (isMobile && p >= 0.7) {
        if (!mobileHiddenHeroRef.current) {
          mobileHiddenHeroRef.current = true;
          if (heroOverlayGroupRef.current) {
            heroOverlayGroupRef.current.style.opacity = '0';
            heroOverlayGroupRef.current.style.pointerEvents = 'none';
            heroOverlayGroupRef.current.style.visibility = 'hidden';
          }
          if (blackholeOuterRef.current) {
            blackholeOuterRef.current.style.opacity = '0';
            blackholeOuterRef.current.style.visibility = 'hidden';
          }
          if (blackholeFrontOuterRef.current) {
            blackholeFrontOuterRef.current.style.opacity = '0';
            blackholeFrontOuterRef.current.style.visibility = 'hidden';
          }
        }
        if (!mobileHiddenWreathRef.current && wreathTransformRef.current) {
          mobileHiddenWreathRef.current = true;
          wreathTransformRef.current.style.opacity = '0';
          wreathTransformRef.current.style.visibility = 'hidden';
        }
        if (voidVeilRef.current) {
          voidVeilRef.current.style.opacity = String(frame.voidVeilOpacity);
        }
        return;
      }

      if (isMobile && mobileHiddenHeroRef.current) {
        mobileHiddenHeroRef.current = false;
        if (heroOverlayGroupRef.current) heroOverlayGroupRef.current.style.visibility = 'visible';
        if (blackholeOuterRef.current) blackholeOuterRef.current.style.visibility = 'visible';
        if (blackholeFrontOuterRef.current) blackholeFrontOuterRef.current.style.visibility = 'visible';
      }

      // PASSO 1: No mobile usa geometria cacheada (zero reflow por quadro); no desktop lê lote único
      let eyebrowCenter: MeasuredBox | null;
      let titleCenter: MeasuredBox | null;
      let descCenter: MeasuredBox | null;
      let ctaCenter: MeasuredBox | null;
      let counterCenter: MeasuredBox | null;
      let railCenter: MeasuredBox | null;
      let modelCenter: MeasuredBox | null;
      let bhCenterX: number;
      let bhCenterY: number;

      if (isMobile) {
        eyebrowCenter = m.eyebrowCenter;
        titleCenter = m.titleCenter;
        descCenter = m.descCenter;
        ctaCenter = m.ctaCenter;
        counterCenter = m.counterCenter;
        railCenter = null;
        modelCenter = m.modelCenter;
        bhCenterX = m.bhCenterX;
        bhCenterY = m.bhCenterY;
      } else {
        const compRect = compositionRef.current?.getBoundingClientRect();
        const leftRect = leftColRef.current?.getBoundingClientRect();
        const rightRect = rightColRef.current?.getBoundingClientRect();

        eyebrowCenter = measureElementCenter(eyebrowRef.current, leftRect);
        titleCenter = measureElementCenter(titleRef.current, leftRect);
        descCenter = measureElementCenter(descRef.current, leftRect);
        ctaCenter = measureElementCenter(ctaRef.current, leftRect);
        counterCenter = measureElementCenter(counterRef.current, leftRect);
        railCenter = measureElementCenter(railRef.current, rightRect);
        modelCenter = measureElementCenter(modelCollapseRef.current, compRect);

        bhCenterX = compRect
          ? compRect.left + compRect.width * 0.5
          : width * (isDesktop ? 0.72 : 0.5);
        bhCenterY = compRect
          ? compRect.top + compRect.height * 0.432
          : height * 0.48;
      }

      // PASSO 2 (APENAS CÁLCULOS & ESCRITAS): zero layout thrashing
      const vpCenterX = width * 0.5;
      const vpCenterY = height * 0.5;

      const shiftX = (vpCenterX - bhCenterX) * frame.centerBlend;
      const shiftY = (vpCenterY - bhCenterY) * frame.centerBlend;

      const targetSingularityX = bhCenterX + shiftX;
      const targetSingularityY = bhCenterY + shiftY;

      const useSvgWarp = !isMobile && qualityTier === 'high';
      if (useSvgWarp && displacementRef.current) {
        const warpAmount =
          p > 0.22 && p < 0.68 ? Number((frame.warpIntensity * 14).toFixed(2)) : 0;
        displacementRef.current.setAttribute('scale', String(warpAmount));
      }

      const filterRef = `#${warpFilterId}`;

      applyCollapseStyle(
        eyebrowRef.current,
        p,
        {
          ...pullFromMeasured(eyebrowCenter, targetSingularityX, targetSingularityY, 0.52),
          stretchFactor: isDesktop ? 0.24 : 0.16,
          skewDeg: isDesktop ? -7 : -3,
          rotateDeg: isDesktop ? 4 : 2,
          resistance: 0.74,
        },
        useSvgWarp,
        filterRef,
        isMobile
      );

      applyCollapseStyle(
        titleRef.current,
        p,
        {
          ...pullFromMeasured(titleCenter, targetSingularityX, targetSingularityY, 0.58),
          stretchFactor: isDesktop ? 0.28 : 0.18,
          skewDeg: isDesktop ? -8 : -4,
          rotateDeg: isDesktop ? 3 : 2,
          resistance: 0.88,
        },
        useSvgWarp,
        filterRef,
        isMobile
      );

      applyCollapseStyle(
        descRef.current,
        p,
        {
          ...pullFromMeasured(descCenter, targetSingularityX, targetSingularityY, 0.54),
          stretchFactor: isDesktop ? 0.22 : 0.15,
          skewDeg: isDesktop ? -6 : -3,
          rotateDeg: -2,
          resistance: 0.82,
        },
        useSvgWarp,
        filterRef,
        isMobile
      );

      applyCollapseStyle(
        ctaRef.current,
        p,
        {
          ...pullFromMeasured(ctaCenter, targetSingularityX, targetSingularityY, 0.5),
          stretchFactor: isDesktop ? 0.18 : 0.14,
          skewDeg: isDesktop ? -5 : -2,
          rotateDeg: isDesktop ? -3 : -2,
          resistance: 0.94,
        },
        false,
        undefined,
        isMobile
      );

      applyCollapseStyle(
        counterRef.current,
        p,
        {
          ...pullFromMeasured(counterCenter, targetSingularityX, targetSingularityY, 0.48),
          stretchFactor: isDesktop ? 0.16 : 0.12,
          skewDeg: isDesktop ? -4 : -2,
          rotateDeg: isDesktop ? -3 : -2,
          resistance: 0.7,
        },
        false,
        undefined,
        isMobile
      );

      if (!isMobile) {
        applyCollapseStyle(railRef.current, p, {
          ...pullFromMeasured(railCenter, targetSingularityX, targetSingularityY, 0.62),
          stretchFactor: 0.14,
          skewDeg: 4,
          rotateDeg: -6,
          resistance: 0.72,
        });
      }

      applyCollapseStyle(
        modelCollapseRef.current,
        p,
        {
          ...pullFromMeasured(modelCenter, targetSingularityX, targetSingularityY, 0.95),
          stretchFactor: 0.14,
          skewDeg: -2.5,
          rotateDeg: -7,
          resistance: 1.0,
        },
        useSvgWarp,
        filterRef,
        isMobile
      );

      if (isMobile) {
        if (wreathTransformRef.current) {
          if (p >= 0.58) {
            if (!mobileHiddenWreathRef.current) {
              mobileHiddenWreathRef.current = true;
              wreathTransformRef.current.style.opacity = '0';
              wreathTransformRef.current.style.visibility = 'hidden';
            }
          } else {
            if (mobileHiddenWreathRef.current) {
              mobileHiddenWreathRef.current = false;
              wreathTransformRef.current.style.visibility = 'visible';
            }
            wreathTransformRef.current.style.transform = `translate3d(${shiftX.toFixed(
              2
            )}px, ${shiftY.toFixed(2)}px, 0) scale(${frame.wreathScale})`;
            wreathTransformRef.current.style.opacity = '1';
          }
        }
        if (!mobileHiddenWreathRef.current) {
          if (wreathSharpLayerRef.current) {
            wreathSharpLayerRef.current.style.opacity = String(1 - frame.wreathBlurBlend);
          }
          if (wreathBlurredLayerRef.current) {
            wreathBlurredLayerRef.current.style.opacity = String(frame.wreathBlurBlend);
          }
        }
      } else {
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
      }

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
    };

    const damper = new CinematicProgressDamper(HERO_TRAVERSAL_DAMPER_CONFIG);
    let damperRafId = 0;
    let lastTickMs = 0;

    const measureMetrics = () => {
      if (typeof window === 'undefined' || !trackRef.current) return;
      const vw = window.innerWidth;
      const vh = Math.max(window.innerHeight, 320);
      const isMob = vw < 768;
      const isDesk = vw >= 1024;
      const rect = trackRef.current.getBoundingClientRect();
      const sectionTopDocY = rect.top + getEffectiveScrollY();
      const maxReachableScroll = Math.max(
        1,
        document.documentElement.scrollHeight - vh - sectionTopDocY
      );

      const stageTop = stickyStageRef.current?.getBoundingClientRect().top ?? 0;
      const compRect = compositionRef.current?.getBoundingClientRect();
      const leftRect = leftColRef.current?.getBoundingClientRect();
      const rightRect = rightColRef.current?.getBoundingClientRect();

      const normLeft = leftRect ? { left: leftRect.left, top: leftRect.top - stageTop } : undefined;
      const normRight = rightRect
        ? { left: rightRect.left, top: rightRect.top - stageTop }
        : undefined;
      const normComp = compRect ? { left: compRect.left, top: compRect.top - stageTop } : undefined;

      const bhCenterX = compRect
        ? compRect.left + compRect.width * 0.5
        : vw * (isDesk ? 0.72 : 0.5);
      const bhCenterY = compRect
        ? compRect.top - stageTop + compRect.height * (isMob ? 0.415 : 0.432)
        : vh * 0.48;

      metricsRef.current = {
        sectionTopDocY,
        maxReachableScroll,
        vw,
        vh,
        isMobile: isMob,
        isDesktop: isDesk,
        bhCenterX,
        bhCenterY,
        eyebrowCenter: measureElementCenter(eyebrowRef.current, normLeft),
        titleCenter: measureElementCenter(titleRef.current, normLeft),
        descCenter: measureElementCenter(descRef.current, normLeft),
        ctaCenter: measureElementCenter(ctaRef.current, normLeft),
        counterCenter: measureElementCenter(counterRef.current, normLeft),
        railCenter: measureElementCenter(railRef.current, normRight),
        modelCenter: measureElementCenter(modelCollapseRef.current, normComp),
      };

      const mobileTargets = [
        eyebrowRef.current,
        titleRef.current,
        descRef.current,
        ctaRef.current,
        counterRef.current,
      ];
      if (isMob) {
        for (const el of mobileTargets) {
          if (el) {
            el.style.transformOrigin = '50% 88%';
            el.style.filter = 'none';
          }
        }
        if (modelCollapseRef.current) {
          modelCollapseRef.current.style.transformOrigin = '50% 42%';
          modelCollapseRef.current.style.filter = 'none';
        }
        if (wreathBlurRef.current) {
          wreathBlurRef.current.style.filter = 'none';
        }
      } else {
        for (const el of mobileTargets) {
          if (el) el.style.transformOrigin = '';
        }
        if (modelCollapseRef.current) {
          modelCollapseRef.current.style.transformOrigin = '';
        }
      }
    };

    const computeScrollProgress = () => {
      if (typeof window === 'undefined') return 0;
      const { sectionTopDocY, maxReachableScroll, vh: cachedVh, isMobile } = metricsRef.current;
      const vh = isMobile ? cachedVh : Math.max(window.innerHeight, 320);
      const isMob = isMobile || window.innerWidth < 768;
      const scrolledPastTop = Math.max(0, getEffectiveScrollY() - sectionTopDocY);
      const baseSpanPx = vh * (isMob ? 2.12 : 2.4);
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
      const nextVw = window.innerWidth;
      const nextVh = Math.max(window.innerHeight, 320);
      const prev = metricsRef.current;
      if (
        prev.isMobile &&
        Math.abs(nextVw - prev.vw) < 2 &&
        Math.abs(nextVh - prev.vh) < 160
      ) {
        return;
      }
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
        const prev = metricsRef.current;
        if (prev.isMobile) {
          const vh = prev.vh;
          const rect = trackRef.current?.getBoundingClientRect();
          if (!rect) return;
          const prevTop = prev.sectionTopDocY;
          const newTop = rect.top + getEffectiveScrollY();
          const newMaxReachable = Math.max(
            1,
            document.documentElement.scrollHeight - vh - newTop
          );
          const baseSpanPx = vh * 2.12;
          const prevSpan = Math.min(baseSpanPx, prev.maxReachableScroll / 0.94);
          const nextSpan = Math.min(baseSpanPx, newMaxReachable / 0.94);
          prev.sectionTopDocY = newTop;
          prev.maxReachableScroll = newMaxReachable;
          if (Math.abs(nextSpan - prevSpan) > 2 || Math.abs(newTop - prevTop) > 2) {
            snapFromLayout();
          }
          return;
        }
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
  }, [progressMv, qualityTier, warpFilterId]);

  // Rotação contínua exclusivamente anti-horária (suspende durante intro, aba oculta ou após saída da moldura)
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
      progressRef.current < (metricsRef.current.isMobile ? 0.58 : 0.78);

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

      // Sempre subtrai para garantir sentido exclusivamente anti-horário (inclusive ao rolar para cima)
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
      data-testid="hero-traversal-track"
      data-traversal-stage="repouso"
      data-traversal-progress="0.000"
      className="relative"
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

      {/* Palco Sticky: fixa exclusivamente a travessia hero -> singularidade -> véu em 100svh no mobile e 100dvh no desktop */}
      <div
        ref={stickyStageRef}
        className="sticky top-0 z-10 h-[100svh] md:h-[100dvh] w-full overflow-hidden flex flex-col md:flex-row md:items-center pointer-events-none"
      >
        {/* CAMADA DE TRAVESSIA: HERO + SINGULARIDADE PROCEDURAL */}
        <div
          ref={heroOverlayGroupRef}
          className="relative z-10 w-full h-full md:h-auto flex items-center pointer-events-auto"
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
                  className="md:will-change-transform md:origin-right"
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
                  className="md:will-change-transform md:origin-right"
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
                  className="md:will-change-transform md:origin-right"
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
                  className="pt-0.5 sm:pt-1 md:will-change-transform md:origin-right"
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
                  className="pt-1 sm:pt-4 md:will-change-transform md:origin-right"
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
                    wreathSharpLayerRef,
                    wreathBlurredLayerRef,
                    modelCollapseRef,
                  }}
                />

                {/* Rail lateral discreto */}
                <div
                  ref={railRef}
                  aria-hidden="true"
                  className="hidden xl:flex flex-col items-center gap-3 absolute right-0 top-1/2 -translate-y-1/2 z-30 text-[var(--text-muted)] md:will-change-transform"
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
      </div>

      {/* Espaço da travessia gravitacional antes da entrada sequencial das coleções */}
      <div aria-hidden="true" className="h-[80svh] md:h-[104vh] pointer-events-none" />

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
