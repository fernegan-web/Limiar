import React, { useRef } from 'react';
import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import { useThresholdPointer } from './ThresholdMotionProvider';
import {
  THRESHOLD_SPRING,
  computeMagneticPull,
  computeNormalizedPointer,
} from './thresholdConfig';

interface ParallaxLayerProps {
  children: React.ReactNode;
  depthX?: number;
  depthY?: number;
  rotateDeg?: number;
  className?: string;
}

/**
 * Camada de profundidade espacial reativa ao cursor.
 * Opera exclusivamente via MotionValues + transform (zero re-render no pointermove).
 */
export function ThresholdParallaxLayer({
  children,
  depthX = 10,
  depthY = 8,
  rotateDeg = 0,
  className = '',
}: ParallaxLayerProps) {
  const { nx, ny, reducedMotion } = useThresholdPointer();
  const x = useTransform(nx, [-1, 1], reducedMotion ? [0, 0] : [-depthX, depthX]);
  const y = useTransform(ny, [-1, 1], reducedMotion ? [0, 0] : [-depthY, depthY]);
  const rotate = useTransform(nx, [-1, 1], reducedMotion ? [0, 0] : [-rotateDeg, rotateDeg]);

  return (
    <motion.div
      style={reducedMotion ? undefined : { x, y, rotate }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface ScrollParallaxProps {
  children: React.ReactNode;
  offsetY?: number;
  scaleRange?: [number, number];
  className?: string;
}

/**
 * Parallax de profundidade vinculado ao scroll para fotografias e singularidades.
 */
export function ThresholdScrollParallax({
  children,
  offsetY = 24,
  scaleRange = [1.04, 1],
  className = '',
}: ScrollParallaxProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { reducedMotion } = useThresholdPointer();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const y = useTransform(
    scrollYProgress,
    [0, 1],
    reducedMotion ? [0, 0] : [-offsetY, offsetY]
  );
  const scale = useTransform(
    scrollYProgress,
    [0, 1],
    reducedMotion ? [1, 1] : scaleRange
  );

  const hasPositionClass = /\b(absolute|fixed|sticky|relative)\b/.test(className);

  return (
    <div ref={ref} className={`${hasPositionClass ? '' : 'relative '}overflow-hidden ${className}`}>
      <motion.div
        style={reducedMotion ? undefined : { y, scale }}
        className="w-full h-full"
      >
        {children}
      </motion.div>
    </div>
  );
}

interface MagneticProps {
  children: React.ReactNode;
  maxPull?: number;
  className?: string;
}

/**
 * Tração magnética sutil e orgânica para elementos-chave interativos.
 */
export function ThresholdMagnetic({
  children,
  maxPull = 4,
  className = '',
}: MagneticProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { reducedMotion } = useThresholdPointer();

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, THRESHOLD_SPRING.magnetic);
  const y = useSpring(rawY, THRESHOLD_SPRING.magnetic);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reducedMotion || e.pointerType === 'touch' || !ref.current) return;
    const { nx, ny } = computeNormalizedPointer(
      e.clientX,
      e.clientY,
      ref.current.getBoundingClientRect()
    );
    const pull = computeMagneticPull(nx, ny, maxPull);
    rawX.set(pull.x);
    rawY.set(pull.y);
  };

  const handlePointerLeave = () => {
    rawX.set(0);
    rawY.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={reducedMotion ? undefined : { x, y }}
      className={`inline-block ${className}`}
    >
      {children}
    </motion.div>
  );
}
