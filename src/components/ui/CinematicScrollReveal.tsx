import React, { useEffect, useRef } from 'react';
import { useScroll } from 'motion/react';
import { computeRevealCurve } from '../../motion/gravitationalTimeline';
import { useThresholdPointer } from '../../motion/ThresholdMotionProvider';
import { clamp } from '../../motion/thresholdConfig';
import { shouldEnableDynamicBlur } from '../../performance/performanceRuntime';

type ScrollOffsetEdge =
  | 'start end'
  | 'start center'
  | 'start start'
  | 'end end'
  | 'end center'
  | 'end start'
  | `${'start' | 'end'} ${number}%`;

interface CinematicScrollRevealProps {
  children: React.ReactNode;
  staggerIndex?: number;
  staggerStep?: number;
  startY?: number;
  startScale?: number;
  startBlur?: number;
  scrollOffset?: [ScrollOffsetEdge, ScrollOffsetEdge];
  className?: string;
}

const DEFAULT_OFFSET: [ScrollOffsetEdge, ScrollOffsetEdge] = ['start 96%', 'start 66%'];

/**
 * Revelação cinematográfica sequencial e reversível vinculada ao scroll.
 * Opera via mutação direta no DOM (zero re-renders durante scroll) seguindo a mesma
 * curva de opacidade, profundidade (scale + rotateX) e nitidez da seção de coleções.
 */
export function CinematicScrollReveal({
  children,
  staggerIndex = 0,
  staggerStep = 0.1,
  startY = 36,
  startScale = 0.95,
  startBlur = 9,
  scrollOffset = DEFAULT_OFFSET,
  className = '',
}: CinematicScrollRevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { reducedMotion } = useThresholdPointer();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: scrollOffset,
  });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (reducedMotion) {
      node.style.opacity = '1';
      node.style.transform = 'none';
      node.style.filter = 'none';
      node.style.willChange = 'auto';
      return;
    }

    const apply = (rawT: number) => {
      const start = clamp(staggerIndex * staggerStep, 0, 0.45);
      const localT = clamp((rawT - start) / Math.max(0.001, 1 - start), 0, 1);

      if (localT >= 0.999) {
        node.style.opacity = '1';
        node.style.transform = 'none';
        node.style.filter = 'none';
        node.style.willChange = 'auto';
        return;
      }

      const state = computeRevealCurve(localT, startY, startScale, startBlur);
      const allowBlur = shouldEnableDynamicBlur();
      node.style.willChange = state.opacity > 0.002 ? 'transform, opacity' : 'auto';
      node.style.opacity = String(state.opacity);
      node.style.transform = `perspective(1100px) translate3d(0, ${state.y}px, 0) scale(${state.scale}) rotateX(${state.rotateXDeg}deg)`;
      node.style.filter =
        allowBlur && state.blurPx > 0.1 ? `blur(${state.blurPx}px)` : 'none';
    };

    apply(scrollYProgress.get());
    const unsub = scrollYProgress.on('change', apply);
    return () => unsub();
  }, [scrollYProgress, reducedMotion, staggerIndex, staggerStep, startY, startScale, startBlur]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
