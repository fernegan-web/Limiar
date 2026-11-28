import { clamp } from './thresholdConfig';

export type TraversalStage =
  | 'repouso'
  | 'despertar'
  | 'colapso'
  | 'horizonte'
  | 'travessia'
  | 'revelacao';

export type BlackHoleOperationalState = 'rest' | 'traversal' | 'inactive';

export const TRAVERSAL_STAGE_BOUNDS = {
  repouso: { start: 0, end: 0.1 },
  despertar: { start: 0.1, end: 0.3 },
  colapso: { start: 0.3, end: 0.55 },
  horizonte: { start: 0.55, end: 0.69 },
  travessia: { start: 0.69, end: 0.78 },
  revelacao: { start: 0.78, end: 1 },
} as const;

export function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge1 === edge0) return x >= edge1 ? 1 : 0;
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function smootherstep(edge0: number, edge1: number, x: number): number {
  if (edge1 === edge0) return x >= edge1 ? 1 : 0;
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export function rangeProgress(progress: number, start: number, end: number): number {
  return smoothstep(start, end, clamp(progress, 0, 1));
}

export function resolveTraversalStage(progress: number): TraversalStage {
  const p = clamp(progress, 0, 1);
  if (p < 0.1) return 'repouso';
  if (p < 0.3) return 'despertar';
  if (p < 0.55) return 'colapso';
  if (p < 0.69) return 'horizonte';
  if (p < 0.78) return 'travessia';
  return 'revelacao';
}

export function resolveOperationalState(params: {
  progress: number;
  inViewport: boolean;
  tabVisible: boolean;
}): BlackHoleOperationalState {
  if (!params.inViewport || !params.tabVisible) {
    return 'inactive';
  }
  const p = clamp(params.progress, 0, 1);
  // Após 0.72 o buraco negro já tem opacidade zero e a tela transiciona para as coleções
  if (p >= 0.72) return 'inactive';
  if (p <= 0.1) return 'rest';
  return 'traversal';
}

export interface GravitationalElementState {
  x: number;
  y: number;
  scale: number;
  scaleX: number;
  scaleY: number;
  skewXDeg: number;
  rotateDeg: number;
  blurPx: number;
  opacity: number;
  pointerInteractive: boolean;
}

export interface CollapseVectorConfig {
  /** Deslocamento aproximado até o centro gravitacional em px */
  pullX: number;
  pullY: number;
  /** Deformação direcional na direção da singularidade */
  stretchFactor: number;
  skewDeg: number;
  rotateDeg: number;
  /** Fator de resistência: elementos mais leves cedem antes */
  resistance?: number;
}

export function computeElementCollapse(
  progress: number,
  config: CollapseVectorConfig,
  isMobile = false
): GravitationalElementState {
  const p = clamp(progress, 0, 1);
  if (p <= 0.1) {
    return {
      x: 0,
      y: 0,
      scale: 1,
      scaleX: 1,
      scaleY: 1,
      skewXDeg: 0,
      rotateDeg: 0,
      blurPx: 0,
      opacity: 1,
      pointerInteractive: true,
    };
  }

  const res = clamp(config.resistance ?? 1, 0.5, 1.4);
  const wake = rangeProgress(p, 0.1, 0.32);
  const collapse = smootherstep(0.28, 0.62 * res > 0.67 ? 0.67 : Math.max(0.54, 0.6 * res), p);
  const swallow = rangeProgress(p, 0.52, 0.67);

  const combined = clamp(wake * 0.18 + collapse * 0.82, 0, 1);
  const x = Number((config.pullX * combined).toFixed(2));
  const y = Number((config.pullY * combined).toFixed(2));
  const scale = Number((1 - wake * 0.035 - collapse * 0.58 - swallow * 0.24).toFixed(3));
  const stretch = combined * config.stretchFactor;

  if (isMobile) {
    const scaleX = Number(clamp(1 - stretch * 0.45, 0.55, 1.05).toFixed(3));
    const scaleY = Number((1 + stretch * 1.15).toFixed(3));
    const skewXDeg = Number((config.skewDeg * collapse).toFixed(2));
    const rotateDeg = Number((config.rotateDeg * collapse).toFixed(2));
    const opacity = Number(clamp(1 - collapse * 0.48 - swallow * 0.52, 0, 1).toFixed(3));

    return {
      x,
      y,
      scale: Math.max(0.12, scale),
      scaleX,
      scaleY,
      skewXDeg,
      rotateDeg,
      blurPx: 0,
      opacity,
      pointerInteractive: p < 0.26 && opacity > 0.72,
    };
  }

  const scaleX = Number((1 + stretch).toFixed(3));
  const scaleY = Number(clamp(1 - stretch * 0.42, 0.45, 1.1).toFixed(3));
  const skewXDeg = Number((config.skewDeg * collapse).toFixed(2));
  const rotateDeg = Number((config.rotateDeg * collapse).toFixed(2));
  const blurPx = Number((wake * 0.5 + collapse * 7.5 + swallow * 6).toFixed(2));
  const opacity = Number(clamp(1 - collapse * 0.56 - swallow * 0.44, 0, 1).toFixed(3));

  return {
    x,
    y,
    scale: Math.max(0.12, scale),
    scaleX,
    scaleY,
    skewXDeg,
    rotateDeg,
    blurPx,
    opacity,
    pointerInteractive: p < 0.26 && opacity > 0.72,
  };
}

export interface SingularityFrameState {
  stage: TraversalStage;
  /** Fator de amortecimento do parallax de mouse durante colapso [0..1] */
  heroPointerStrength: number;
  /** Progresso de centralização do buraco negro na viewport [0..1] */
  centerBlend: number;
  /** Escala global do container do buraco negro */
  scale: number;
  /** Escala acelerada da moldura tribal (camada mais próxima da câmera) */
  wreathScale: number;
  /** Desfoque progressivo de profundidade da moldura tribal em px (desktop) */
  wreathBlurPx: number;
  /** Fator de cross-fade [0..1] para asset pré-desfocado da moldura no mobile */
  wreathBlurBlend: number;
  /** Raio normalizado do horizonte de eventos passado ao shader */
  horizonRadius: number;
  /** Intensidade de turbulência/acreção do shader */
  warpIntensity: number;
  /** Opacidade do filtro/lente atmosférica ao redor */
  heroVisibility: number;
  /** Opacidade do véu escuro resultante da expansão do horizonte (55-78%) */
  voidVeilOpacity: number;
  /** Progresso de revelação do tema de destino após a travessia [0..1] */
  postVoidReveal: number;
}

export function computeSingularityFrame(progress: number, isMobile = false): SingularityFrameState {
  const p = clamp(progress, 0, 1);
  const stage = resolveTraversalStage(p);

  const rawWake = clamp((p - 0.1) / 0.2, 0, 1);
  const wake = rawWake * (2 - rawWake);
  const collapse = smootherstep(0.3, 0.55, p);
  const horizon = smootherstep(0.55, 0.69, p);
  const exitDark = smootherstep(0.73, 0.85, p);

  const heroPointerStrength = Number(clamp(1 - rangeProgress(p, 0.12, 0.34), 0, 1).toFixed(3));
  const centerBlend = Number(smootherstep(0.18, 0.6, p).toFixed(3));

  // Escala fluida do buraco negro até cobrir 100% da viewport
  const maxScale = isMobile ? 4.4 : 4.8;
  const scale = Number(
    (1 + wake * 0.28 + collapse * 1.18 + horizon * (maxScale - 2.46)).toFixed(3)
  );

  // Moldura tribal é a camada mais externa/próxima: acelera mais rápido e sai da viewport antes do buraco negro.
  // No mobile, a escala é limitada a ~5.4x pois a abertura central (~50% diâmetro) já ultrapassa os cantos da tela em p ≈ 0.58.
  const rawWreathWake = clamp((p - 0.1) / 0.24, 0, 1);
  const wreathWake = rawWreathWake * (2 - rawWreathWake);
  const wreathSurge = smootherstep(0.28, 0.58, p);
  const wreathExit = smootherstep(0.5, 0.72, p);
  const wreathScale = isMobile
    ? Number((1 + wreathWake * 1.35 + wreathSurge * 2.95 + wreathExit * 0.1).toFixed(3))
    : Number((1 + wreathWake * 1.45 + wreathSurge * 5.4 + wreathExit * 5.2).toFixed(3));

  // Mantém nitidez nos primeiros estágios; desfoque intensifica apenas na aproximação à câmera antes da saída
  const wreathBlurT = p <= 0.14 ? 0 : smootherstep(0.14, 0.62, p);
  const wreathBlurPx =
    isMobile || wreathBlurT <= 0.005 ? 0 : Number((Math.pow(wreathBlurT, 2.15) * 18).toFixed(2));
  const wreathBlurBlend =
    wreathBlurT <= 0.005 ? 0 : Number(Math.pow(wreathBlurT, 1.85).toFixed(3));

  const horizonRadius = Number((0.48 + wake * 0.08 + collapse * 0.26 + horizon * 0.83).toFixed(3));
  const warpIntensity = Number((0.28 + wake * 0.45 + collapse * 0.85 + horizon * 0.55).toFixed(3));

  const heroVisibility = Number(clamp(1 - smootherstep(0.58, 0.69, p), 0, 1).toFixed(3));

  // Escuridão nasce da expansão do horizonte (0.55-0.69), permanece na travessia (0.69-0.78) e cede para as coleções
  const voidBuild = smootherstep(0.55, 0.67, p);
  const voidVeilOpacity = Number(clamp(voidBuild * (1 - exitDark), 0, 1).toFixed(3));
  const postVoidReveal = Number(exitDark.toFixed(3));

  return {
    stage,
    heroPointerStrength,
    centerBlend,
    scale,
    wreathScale,
    wreathBlurPx,
    wreathBlurBlend,
    horizonRadius,
    warpIntensity,
    heroVisibility,
    voidVeilOpacity,
    postVoidReveal,
  };
}

export interface RevealItemState {
  opacity: number;
  y: number;
  scale: number;
  blurPx: number;
  rotateXDeg: number;
}

export interface CollectionsRevealState {
  envOpacity: number;
  header: RevealItemState;
  cards: RevealItemState[];
  cta: RevealItemState;
  interactive: boolean;
}

export function computeRevealCurve(
  t: number,
  startY = 34,
  startScale = 0.94,
  startBlur = 10,
  disableBlurAnd3d = false
): RevealItemState {
  const eased = smootherstep(0, 1, t);
  return {
    opacity: Number(eased.toFixed(3)),
    y: Number(((1 - eased) * startY).toFixed(2)),
    scale: Number((startScale + eased * (1 - startScale)).toFixed(3)),
    blurPx: disableBlurAnd3d ? 0 : Number(((1 - eased) * startBlur).toFixed(2)),
    rotateXDeg: disableBlurAnd3d ? 0 : Number(((1 - eased) * 5).toFixed(2)),
  };
}

export function computeCollectionsReveal(
  progress: number,
  cardCount = 2,
  isMobile = false
): CollectionsRevealState {
  const p = clamp(progress, 0, 1);
  const envOpacity = Number(rangeProgress(p, 0.72, 0.83).toFixed(3));
  const header = computeRevealCurve(rangeProgress(p, 0.75, 0.84), 28, 0.97, 8, isMobile);

  const safeCount = Math.max(0, cardCount);
  const cards: RevealItemState[] = [];
  for (let i = 0; i < safeCount; i++) {
    const start = Math.min(0.86, 0.78 + i * 0.04);
    const end = Math.min(0.91, start + 0.08);
    cards.push(computeRevealCurve(rangeProgress(p, start, end), 42, 0.93, 12, isMobile));
  }

  const cta = computeRevealCurve(rangeProgress(p, 0.845, 0.91), 24, 0.96, 6, isMobile);

  return {
    envOpacity,
    header,
    cards,
    cta,
    interactive: p >= 0.81,
  };
}
