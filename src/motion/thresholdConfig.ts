/**
 * LIMIAR — THE THRESHOLD MOTION SYSTEM
 * Configurações, curvas cinematográficas e matemática espacial pura (testável).
 */

export const THRESHOLD_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
export const THRESHOLD_EASE_PORTAL: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const THRESHOLD_DURATIONS = {
  micro: 0.18,
  portalExit: 0.2,
  portalEnter: 0.44,
  reveal: 0.68,
  drawer: 0.34,
} as const;

export const THRESHOLD_SPRING = {
  pointer: { stiffness: 120, damping: 24, mass: 0.8 },
  magnetic: { stiffness: 320, damping: 26, mass: 0.6 },
  navIndicator: { stiffness: 380, damping: 34, mass: 0.7 },
  drawer: { stiffness: 310, damping: 32, mass: 0.9 },
} as const;

export interface NormalizedPointer {
  /** Coordenada horizontal normalizada no intervalo [-1, 1] */
  nx: number;
  /** Coordenada vertical normalizada no intervalo [-1, 1] */
  ny: number;
  /** Posição horizontal em pixels relativa ao container */
  px: number;
  /** Posição vertical em pixels relativa ao container */
  py: number;
}

export interface RectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function computeNormalizedPointer(
  clientX: number,
  clientY: number,
  rect: RectLike
): NormalizedPointer {
  const safeWidth = rect.width > 0 ? rect.width : 1;
  const safeHeight = rect.height > 0 ? rect.height : 1;

  const px = clamp(clientX - rect.left, 0, safeWidth);
  const py = clamp(clientY - rect.top, 0, safeHeight);

  const nx = clamp((px / safeWidth) * 2 - 1, -1, 1);
  const ny = clamp((py / safeHeight) * 2 - 1, -1, 1);

  return { nx, ny, px, py };
}

/**
 * Calcula deslocamento de parallax sutil (em px) proporcional à profundidade.
 * Valores positivos acompanham o cursor; negativos criam contra-profundidade.
 */
export function computeParallaxOffset(
  nx: number,
  ny: number,
  depthPx: number
): { x: number; y: number } {
  const safeNx = clamp(nx, -1, 1);
  const safeNy = clamp(ny, -1, 1);
  return {
    x: Number((safeNx * depthPx).toFixed(2)),
    y: Number((safeNy * depthPx).toFixed(2)),
  };
}

export interface HeroLayerMotionConfig {
  depthX: number;
  depthY: number;
  maxRotateDeg: number;
  spring: {
    stiffness: number;
    damping: number;
    mass: number;
  };
}

export const HERO_PARALLAX_LAYERS = {
  blackhole: {
    depthX: -9,
    depthY: -7,
    maxRotateDeg: 0,
    spring: { stiffness: 52, damping: 22, mass: 1.35 },
  },
  cybersigilism: {
    depthX: 10,
    depthY: 8,
    maxRotateDeg: 3.2,
    spring: { stiffness: 82, damping: 23, mass: 1.1 },
  },
  model: {
    depthX: 15,
    depthY: 11,
    maxRotateDeg: 0,
    spring: { stiffness: 145, damping: 25, mass: 0.78 },
  },
} as const satisfies Record<string, HeroLayerMotionConfig>;

export const GLOBAL_NEOTRIBAL_BG_MOTION: HeroLayerMotionConfig = {
  depthX: -10,
  depthY: -8,
  maxRotateDeg: 0,
  spring: { stiffness: 46, damping: 24, mass: 1.45 },
};

/**
 * Calcula o deslocamento vertical associado à rolagem para que a arte
 * acompanhe toda a extensão da página (do hero ao rodapé) sem distorção.
 */
export function computeGlobalBgScrollTravel(
  pageHeight: number,
  viewportHeight: number,
  imageHeight: number
): number {
  if (pageHeight <= 0 || viewportHeight <= 0 || imageHeight <= 0) return 0;
  if (pageHeight <= viewportHeight) return 0;

  if (pageHeight >= imageHeight) {
    return Number((pageHeight - imageHeight).toFixed(2));
  }

  const maxScroll = pageHeight - viewportHeight;
  const deficit = pageHeight - imageHeight;
  return Number(clamp(deficit, -maxScroll * 0.45, 0).toFixed(2));
}

export function computeLayerTransform(
  nx: number,
  ny: number,
  config: Pick<HeroLayerMotionConfig, 'depthX' | 'depthY' | 'maxRotateDeg'>
): { x: number; y: number; rotate: number } {
  const safeNx = clamp(nx, -1, 1);
  const safeNy = clamp(ny, -1, 1);
  return {
    x: Number((safeNx * config.depthX).toFixed(2)),
    y: Number((safeNy * config.depthY).toFixed(2)),
    rotate: Number((safeNx * config.maxRotateDeg).toFixed(2)),
  };
}

/**
 * Calcula tração magnética contida (nunca excede maxPullPx).
 */
export function computeMagneticPull(
  nx: number,
  ny: number,
  maxPullPx: number
): { x: number; y: number } {
  const safeMax = Math.max(0, maxPullPx);
  return computeParallaxOffset(nx, ny, safeMax);
}

/**
 * Normaliza progresso de scroll em [0, 1].
 */
export function computeScrollRatio(scrollY: number, scrollableHeight: number): number {
  if (scrollableHeight <= 0) return 0;
  return clamp(scrollY / scrollableHeight, 0, 1);
}
