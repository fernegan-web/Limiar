import { clamp } from './thresholdConfig';
import { rangeProgress, smootherstep, smoothstep } from './gravitationalTimeline';
import { remapTimelineWithPlateaus, type PlateauSegment } from './scrollPhysics';

/**
 * MOTOR MATEMÁTICO DA TIMELINE — UNIVERSO LIMIAR (CENAS 01–06)
 * ---------------------------------------------------------------------------
 * Todas as funções são puras e determinísticas sobre p ∈ [0, 1], garantindo:
 * - Reversibilidade exata ao rolar para cima/baixo ou saltar rapidamente.
 * - Continuidade espacial entre estado final da cena k e estado inicial da cena k+1.
 * - Adaptação calibrada entre desktop e mobile sem colapsar a narrativa.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Avalia spline cúbica de Catmull-Rom sobre pontos de controle para trajetórias de câmera suaves */
export function evalCameraSpline(points: readonly Vec3[], tRaw: number): Vec3 {
  const n = points.length;
  if (n === 0) return { x: 0, y: 0, z: 0 };
  if (n === 1) return points[0];

  const t = clamp(tRaw, 0, 1) * (n - 1);
  const idx = Math.min(n - 2, Math.floor(t));
  const localT = t - idx;

  const p0 = points[Math.max(0, idx - 1)];
  const p1 = points[idx];
  const p2 = points[Math.min(n - 1, idx + 1)];
  const p3 = points[Math.min(n - 1, idx + 2)];

  const tt = localT * localT;
  const ttt = tt * localT;

  const interp = (v0: number, v1: number, v2: number, v3: number) =>
    0.5 *
    (2 * v1 +
      (-v0 + v2) * localT +
      (2 * v0 - 5 * v1 + 4 * v2 - v3) * tt +
      (-v0 + 3 * v1 - 3 * v2 + v3) * ttt);

  return {
    x: interp(p0.x, p1.x, p2.x, p3.x),
    y: interp(p0.y, p1.y, p2.y, p3.y),
    z: interp(p0.z, p1.z, p2.z, p3.z),
  };
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

/* ============================================================================
   CENA 01 — FRATURA DIMENSIONAL
   Entrada monumental -> fratura em 5/7 lâminas assimétricas -> rotação Y/Z ->
   reconstrução na fotografia editorial que inicia a Cena 02.
   ============================================================================ */
export interface FractureShardState {
  leftPct: number;
  widthPct: number;
  translateZ: number;
  translateX: number;
  translateY: number;
  rotateYDeg: number;
  rotateXDeg: number;
  scale: number;
}

export interface Scene01FractureState {
  stageTiltDeg: number;
  stageTiltXDeg: number;
  stageZoom: number;
  shards: FractureShardState[];
  seamLineOpacity: number;
  introCaptionOpacity: number;
  secondaryCaptionOpacity: number;
  reconstructedSeamlessBlend: number;
}

const DESKTOP_SHARD_WEIGHTS = [0.11, 0.16, 0.12, 0.22, 0.13, 0.15, 0.11];
const MOBILE_SHARD_WEIGHTS = [0.16, 0.21, 0.26, 0.21, 0.16];

// ~42% da Cena 01 reservada à contemplação (abertura monumental + retrato reconstruído)
const SCENE_01_PLATEAUS: readonly PlateauSegment[] = [
  { inStart: 0.0, inEnd: 0.22, outStart: 0.0, outEnd: 0.08 },
  { inStart: 0.56, inEnd: 0.76, outStart: 0.74, outEnd: 0.85 },
];

export function computeScene01Fracture(pRaw: number, isMobile: boolean): Scene01FractureState {
  const p = remapTimelineWithPlateaus(pRaw, SCENE_01_PLATEAUS);
  const weights = isMobile ? MOBILE_SHARD_WEIGHTS : DESKTOP_SHARD_WEIGHTS;
  const count = weights.length;

  // Fases:
  // 0.00..0.16: estabilidade monumental inicial
  // 0.16..0.52: fratura + deslocamento em Z + inclinação de perspectiva
  // 0.36..0.76: rotação Y de 0 -> 180deg revelando os versos fotográficos
  // 0.72..0.94: recomposição das lâminas na fotografia contínua
  // 0.92..1.00: fusão exata com o quadro inicial da Cena 02
  const fractureSpread =
    smootherstep(0.14, 0.48, p) * (1 - smootherstep(0.7, 0.94, p));
  const flipProgress = smootherstep(0.32, 0.76, p);
  const settleBlend = smootherstep(0.86, 0.98, p);

  // Inclinação cinematográfica breve durante o pico da fratura
  const tiltEnv = Math.sin(clamp((p - 0.14) / 0.76, 0, 1) * Math.PI);
  const stageTiltDeg = Number(((isMobile ? 2.4 : 4.2) * tiltEnv).toFixed(2));
  const stageTiltXDeg = Number(((isMobile ? -3.2 : -5.4) * tiltEnv).toFixed(2));
  const stageZoom = Number((1 - tiltEnv * 0.06 + settleBlend * 0.02).toFixed(4));

  const shards: FractureShardState[] = [];
  let cursorPct = 0;

  for (let i = 0; i < count; i++) {
    const widthPct = Number((weights[i] * 100).toFixed(3));
    const leftPct = Number(cursorPct.toFixed(3));
    cursorPct += widthPct;

    const norm = (i / (count - 1)) * 2 - 1; // [-1..1]
    const alt = i % 2 === 0 ? 1 : -1;

    // Stagger sutil por lâmina mantendo unidade geométrica
    const shardDelay = Math.abs(norm) * 0.08;
    const localFlip = clamp((flipProgress - shardDelay) / (1 - shardDelay), 0, 1);
    const localSpread = fractureSpread * (0.65 + Math.abs(norm) * 0.55);

    const maxZ = isMobile ? 130 : 240;
    const translateZ = Number((alt * localSpread * maxZ * (0.55 + Math.abs(norm) * 0.45)).toFixed(1));
    const translateX = Number((norm * localSpread * (isMobile ? 24 : 58)).toFixed(1));
    const translateY = Number((alt * localSpread * (isMobile ? 16 : 36)).toFixed(1));
    const rotateYDeg = Number((localFlip * 180).toFixed(2));
    const rotateXDeg = Number((norm * localSpread * (isMobile ? 4.5 : 8.5)).toFixed(2));
    const scale = Number((1 - localSpread * 0.045 + settleBlend * 0.0).toFixed(4));

    shards.push({
      leftPct,
      widthPct,
      translateZ,
      translateX,
      translateY,
      rotateYDeg,
      rotateXDeg,
      scale,
    });
  }

  return {
    stageTiltDeg,
    stageTiltXDeg,
    stageZoom,
    shards,
    seamLineOpacity: Number((fractureSpread * 0.72).toFixed(3)),
    introCaptionOpacity: Number((1 - rangeProgress(p, 0.24, 0.42)).toFixed(3)),
    secondaryCaptionOpacity: Number(
      (rangeProgress(p, 0.72, 0.84) * (1 - rangeProgress(p, 0.93, 1.0))).toFixed(3)
    ),
    reconstructedSeamlessBlend: Number(settleBlend.toFixed(3)),
  };
}

/* ============================================================================
   CENA 02 — GALERIA DE IDENTIDADES
   Câmera virtual em curva Bézier/Catmull-Rom atravessando múltiplos planos
   (foreground, midground, background) com paradas de leitura e mergulho em "SER."
   ============================================================================ */
export interface Scene02CameraState {
  camX: number;
  camY: number;
  camZ: number;
  yawDeg: number;
  pitchDeg: number;
  stabilityWeight: number;
  anchorOpacity: number[];
  serPortalScale: number;
  serPortalOpacity: number;
}

const DESKTOP_CAM_SPLINE: readonly Vec3[] = [
  { x: 0, y: 0, z: 0 }, // p=0: alinhado ao retrato reconstruído da Cena 01
  { x: -160, y: -24, z: -260 }, // p=0.20: desliza à esquerda contornando plano 1
  { x: -340, y: 36, z: -560 }, // p=0.40: estabilidade de leitura 1 + oclusão modelo
  { x: 240, y: -42, z: -920 }, // p=0.60: travessia curva para o lado direito
  { x: 320, y: 18, z: -1280 }, // p=0.80: estabilidade de leitura 2
  { x: 0, y: 0, z: -1820 }, // p=1.00: mergulho direto na palavra monumental SER.
];

const MOBILE_CAM_SPLINE: readonly Vec3[] = [
  { x: 0, y: 0, z: 0 },
  { x: -85, y: -18, z: -220 },
  { x: -155, y: 24, z: -480 },
  { x: 120, y: -26, z: -780 },
  { x: 145, y: 12, z: -1080 },
  { x: 0, y: 0, z: -1540 },
];

// ~42% da Cena 02 distribuídos em 3 janelas de leitura diante dos planos identitários
const SCENE_02_PLATEAUS: readonly PlateauSegment[] = [
  { inStart: 0.14, inEnd: 0.28, outStart: 0.22, outEnd: 0.28 },
  { inStart: 0.42, inEnd: 0.56, outStart: 0.50, outEnd: 0.56 },
  { inStart: 0.70, inEnd: 0.84, outStart: 0.77, outEnd: 0.83 },
];

export function computeScene02IdentityGallery(pRaw: number, isMobile: boolean): Scene02CameraState {
  const p = remapTimelineWithPlateaus(pRaw, SCENE_02_PLATEAUS);

  // Micro-parallax de ponteiro permanece responsivo durante os 3 platôs de leitura
  const plateau1 = Math.exp(-Math.pow((p - 0.25) / 0.085, 2));
  const plateau2 = Math.exp(-Math.pow((p - 0.53) / 0.085, 2));
  const plateau3 = Math.exp(-Math.pow((p - 0.80) / 0.085, 2));
  const stabilityWeight = Number(clamp(Math.max(plateau1, plateau2, plateau3), 0, 1).toFixed(3));

  const spline = isMobile ? MOBILE_CAM_SPLINE : DESKTOP_CAM_SPLINE;
  const pos = evalCameraSpline(spline, p);

  const yawDeg = Number(
    (
      Math.sin(p * Math.PI * 2.1) * (isMobile ? 4.5 : 7.5) *
      (1 - rangeProgress(p, 0.86, 0.98))
    ).toFixed(2)
  );
  const pitchDeg = Number(
    (
      Math.cos(p * Math.PI * 1.7) * (isMobile ? 2.2 : 3.8) *
      (1 - rangeProgress(p, 0.86, 0.98))
    ).toFixed(2)
  );

  const anchor1 = rangeProgress(p, 0.08, 0.22) * (1 - rangeProgress(p, 0.44, 0.56));
  const anchor2 = rangeProgress(p, 0.36, 0.48) * (1 - rangeProgress(p, 0.68, 0.8));
  const anchor3 = rangeProgress(p, 0.62, 0.74) * (1 - rangeProgress(p, 0.88, 0.97));

  const serIn = smootherstep(0.84, 1.0, p);
  const serPortalScale = Number(lerp(0.68, 1.0, serIn).toFixed(3));
  const serPortalOpacity = Number(rangeProgress(p, 0.82, 0.96).toFixed(3));

  return {
    camX: Number(pos.x.toFixed(1)),
    camY: Number(pos.y.toFixed(1)),
    camZ: Number(pos.z.toFixed(1)),
    yawDeg,
    pitchDeg,
    stabilityWeight,
    anchorOpacity: [
      Number(anchor1.toFixed(3)),
      Number(anchor2.toFixed(3)),
      Number(anchor3.toFixed(3)),
    ],
    serPortalScale,
    serPortalOpacity,
  };
}

/* ============================================================================
   CENA 03 — METAMORFOSE TIPOGRÁFICA ("SER.")
   Tipografia como arquitetura espacial: separação em Z das letras S, E, R,
   máscaras fotográficas com movimento interno independente e travessia através
   da abertura interna de "E/R" até preencher a tela para a Cena 04.
   ============================================================================ */
export interface LetterSpaceState {
  tx: number;
  ty: number;
  tz: number;
  rotateYDeg: number;
  scale: number;
  photoDriftX: number;
  photoDriftY: number;
  photoScale: number;
}

export interface Scene03TypoMorphState {
  leadPhraseOpacity: number;
  endPhraseOpacity: number;
  letters: [LetterSpaceState, LetterSpaceState, LetterSpaceState]; // S, E, R.
  crossingCutoutX: number;
  crossingCutoutY: number;
  crossingCutoutScale: number;
  crossingCutoutOpacity: number;
  portalExpandScale: number;
  portalExpandRadiusPct: number;
  portalSurfaceOpacity: number;
}

// ~38% da Cena 03 para respiração da escultura tipográfica ("SER." + leitura editorial)
const SCENE_03_PLATEAUS: readonly PlateauSegment[] = [
  { inStart: 0.0, inEnd: 0.16, outStart: 0.0, outEnd: 0.06 },
  { inStart: 0.42, inEnd: 0.64, outStart: 0.47, outEnd: 0.59 },
];

export function computeScene03TypoMorph(pRaw: number, isMobile: boolean): Scene03TypoMorphState {
  const p = remapTimelineWithPlateaus(pRaw, SCENE_03_PLATEAUS);

  const separate = smootherstep(0.08, 0.44, p);
  const compress = smootherstep(0.42, 0.7, p);
  const dive = smootherstep(0.66, 1.0, p);

  const zS = lerp(0, isMobile ? -110 : -220, separate) - dive * 280;
  const zE = lerp(0, isMobile ? 40 : 90, separate) + dive * (isMobile ? 340 : 480);
  const zR = lerp(0, isMobile ? -160 : -320, separate) - dive * 340;

  const spreadX = isMobile ? 22 : 68;
  const txS = -spreadX * separate + spreadX * 0.45 * compress - dive * (isMobile ? 160 : 320);
  const txE = dive * 0; // E ancora o portal central da travessia
  const txR = spreadX * separate - spreadX * 0.45 * compress + dive * (isMobile ? 160 : 320);

  const letters: [LetterSpaceState, LetterSpaceState, LetterSpaceState] = [
    {
      tx: Number(txS.toFixed(1)),
      ty: Number((-separate * (isMobile ? 18 : 34)).toFixed(1)),
      tz: Number(zS.toFixed(1)),
      rotateYDeg: Number((separate * 18 - compress * 8).toFixed(2)),
      scale: Number((1 + separate * 0.08 - dive * 0.14).toFixed(3)),
      photoDriftX: Number((Math.sin(p * Math.PI) * -28).toFixed(1)),
      photoDriftY: Number((p * -32).toFixed(1)),
      photoScale: Number((1.18 - p * 0.12).toFixed(3)),
    },
    {
      tx: Number(txE.toFixed(1)),
      ty: Number((separate * (isMobile ? 8 : 14) * (1 - dive)).toFixed(1)),
      tz: Number(zE.toFixed(1)),
      rotateYDeg: Number(((separate * -10) * (1 - dive)).toFixed(2)),
      scale: Number((1 + separate * 0.12 + dive * (isMobile ? 7.5 : 10.5)).toFixed(3)),
      photoDriftX: Number((Math.cos(p * Math.PI * 1.2) * 24 * (1 - dive)).toFixed(1)),
      photoDriftY: Number(((0.5 - p) * 34 * (1 - dive)).toFixed(1)),
      photoScale: Number((1.24 - dive * 0.24).toFixed(3)),
    },
    {
      tx: Number(txR.toFixed(1)),
      ty: Number((separate * (isMobile ? 20 : 38)).toFixed(1)),
      tz: Number(zR.toFixed(1)),
      rotateYDeg: Number((-separate * 20 + compress * 9).toFixed(2)),
      scale: Number((1 + separate * 0.06 - dive * 0.16).toFixed(3)),
      photoDriftX: Number((Math.sin(p * Math.PI) * 30).toFixed(1)),
      photoDriftY: Number((p * 26).toFixed(1)),
      photoScale: Number((1.16 - p * 0.1).toFixed(3)),
    },
  ];

  // Recorte fotográfico atravessando entre planos das letras
  const crossT = smoothstep(0.18, 0.72, p);
  const crossingCutoutX = Number(lerp(isMobile ? 90 : 210, isMobile ? -110 : -260, crossT).toFixed(1));
  const crossingCutoutY = Number((Math.sin(crossT * Math.PI) * -28).toFixed(1));
  const crossingCutoutScale = Number((0.92 + Math.sin(crossT * Math.PI) * 0.18).toFixed(3));
  const crossingCutoutOpacity = Number(
    (rangeProgress(p, 0.18, 0.34) * (1 - rangeProgress(p, 0.62, 0.76))).toFixed(3)
  );

  // Expansão da abertura interna de E até ocupar 100% da viewport (handoff Cena 04)
  const portalExpandScale = Number(lerp(0.18, 1.0, dive).toFixed(4));
  const portalExpandRadiusPct = Number(lerp(24, 0, smoothstep(0.75, 0.98, p)).toFixed(2));
  const portalSurfaceOpacity = Number(rangeProgress(p, 0.64, 0.86).toFixed(3));

  return {
    leadPhraseOpacity: Number((1 - rangeProgress(p, 0.28, 0.44)).toFixed(3)),
    endPhraseOpacity: Number(
      (rangeProgress(p, 0.46, 0.62) * (1 - rangeProgress(p, 0.76, 0.88))).toFixed(3)
    ),
    letters,
    crossingCutoutX,
    crossingCutoutY,
    crossingCutoutScale,
    crossingCutoutOpacity,
    portalExpandScale,
    portalExpandRadiusPct,
    portalSurfaceOpacity,
  };
}

/* ============================================================================
   CENA 04 — RUPTURA CULTURAL
   Montagem geométrica rítmica: fatiamento da superfície recebida da Cena 03,
   deslizamentos em eixos opostos, encaixes multi-escala e alinhamento final
   em linhas horizontais que preparam o campo de interferência da Cena 05.
   ============================================================================ */
export interface CulturalSliceState {
  txPct: number;
  tyPct: number;
  scale: number;
  opacity: number;
}

export interface Scene04CulturalRuptureState {
  initialSlices: [CulturalSliceState, CulturalSliceState, CulturalSliceState, CulturalSliceState];
  skatePanelX: number;
  skatePanelY: number;
  skatePanelScale: number;
  skatePanelOpacity: number;
  apparelPanelX: number;
  apparelPanelY: number;
  apparelPanelScale: number;
  apparelPanelOpacity: number;
  bannerInsertScale: number;
  bannerInsertOpacity: number;
  headlineShiftX: number;
  phase1CopyOpacity: number;
  phase2CopyOpacity: number;
  handoffLinesProgress: number;
}

// ~38% da Cena 04 para assentamento da montagem geométrica + manifesto cultural
const SCENE_04_PLATEAUS: readonly PlateauSegment[] = [
  { inStart: 0.28, inEnd: 0.46, outStart: 0.34, outEnd: 0.45 },
  { inStart: 0.60, inEnd: 0.80, outStart: 0.65, outEnd: 0.77 },
];

export function computeScene04CulturalRupture(
  pRaw: number,
  isMobile: boolean
): Scene04CulturalRuptureState {
  const p = remapTimelineWithPlateaus(pRaw, SCENE_04_PLATEAUS);

  // 0.00..0.28: ruptura geométrica em 4 faixas assimétricas da cena Darkpsy
  const split1 = smoothstep(0.06, 0.34, p);
  const split2 = smoothstep(0.24, 0.56, p);
  const alignOut = smootherstep(0.76, 1.0, p);

  const initialSlices: [
    CulturalSliceState,
    CulturalSliceState,
    CulturalSliceState,
    CulturalSliceState,
  ] = [
    {
      txPct: Number((-split1 * (isMobile ? 28 : 42) - alignOut * 40).toFixed(2)),
      tyPct: Number((-split2 * 16).toFixed(2)),
      scale: Number((1 + split1 * 0.04).toFixed(3)),
      opacity: Number((1 - rangeProgress(p, 0.68, 0.88)).toFixed(3)),
    },
    {
      txPct: Number((split1 * (isMobile ? 10 : 18) + split2 * 22).toFixed(2)),
      tyPct: Number((-split1 * (isMobile ? 14 : 26) - alignOut * 20).toFixed(2)),
      scale: Number((1 - split2 * 0.05).toFixed(3)),
      opacity: Number((1 - rangeProgress(p, 0.72, 0.9)).toFixed(3)),
    },
    {
      // Região âncora com menor deslocamento inicial para ritmo contrastante
      txPct: Number((-split2 * (isMobile ? 18 : 30)).toFixed(2)),
      tyPct: Number((split2 * 14).toFixed(2)),
      scale: Number((1 + split2 * 0.05).toFixed(3)),
      opacity: Number((1 - rangeProgress(p, 0.74, 0.92)).toFixed(3)),
    },
    {
      txPct: Number((split1 * (isMobile ? 26 : 38) + alignOut * 35).toFixed(2)),
      tyPct: Number((split1 * 18).toFixed(2)),
      scale: Number((1 + split1 * 0.03).toFixed(3)),
      opacity: Number((1 - rangeProgress(p, 0.68, 0.88)).toFixed(3)),
    },
  ];

  // Skate entra em eixo diagonal oposto ocupando o recorte esquerdo/central
  const skateIn = smootherstep(0.16, 0.44, p);
  const skateOut = smootherstep(0.72, 0.95, p);
  const skatePanelX = Number(lerp(isMobile ? 110 : 280, 0, skateIn) + skateOut * (isMobile ? -90 : -220));
  const skatePanelY = Number(lerp(60, 0, skateIn) - skateOut * 40);
  const skatePanelScale = Number(lerp(1.12, 1.0, skateIn) - skateOut * 0.08);
  const skatePanelOpacity = Number((rangeProgress(p, 0.14, 0.3) * (1 - rangeProgress(p, 0.76, 0.94))).toFixed(3));

  // Peça streetwear / estampa ocupa contraste lateral em escala menor
  const appIn = smootherstep(0.32, 0.58, p);
  const appOut = smootherstep(0.78, 0.98, p);
  const apparelPanelX = Number(lerp(isMobile ? -95 : -240, 0, appIn) + appOut * (isMobile ? 110 : 260));
  const apparelPanelY = Number(lerp(-50, 0, appIn) + appOut * 35);
  const apparelPanelScale = Number(lerp(0.88, 1.0, appIn) - appOut * 0.06);
  const apparelPanelOpacity = Number((rangeProgress(p, 0.3, 0.46) * (1 - rangeProgress(p, 0.8, 0.96))).toFixed(3));

  // Momento minimalista + encaixe em linhas preparando Cena 05
  const bannerIn = smootherstep(0.54, 0.76, p);
  const bannerInsertScale = Number(lerp(0.9, 1.0, bannerIn).toFixed(3));
  const bannerInsertOpacity = Number(
    (rangeProgress(p, 0.52, 0.68) * (1 - rangeProgress(p, 0.84, 0.98))).toFixed(3)
  );

  return {
    initialSlices,
    skatePanelX: Number(skatePanelX.toFixed(1)),
    skatePanelY: Number(skatePanelY.toFixed(1)),
    skatePanelScale: Number(skatePanelScale.toFixed(3)),
    skatePanelOpacity,
    apparelPanelX: Number(apparelPanelX.toFixed(1)),
    apparelPanelY: Number(apparelPanelY.toFixed(1)),
    apparelPanelScale: Number(apparelPanelScale.toFixed(3)),
    apparelPanelOpacity,
    bannerInsertScale,
    bannerInsertOpacity,
    headlineShiftX: Number(((0.5 - p) * (isMobile ? 36 : 90)).toFixed(1)),
    phase1CopyOpacity: Number((rangeProgress(p, 0.04, 0.18) * (1 - rangeProgress(p, 0.48, 0.62))).toFixed(3)),
    phase2CopyOpacity: Number((rangeProgress(p, 0.46, 0.62) * (1 - rangeProgress(p, 0.86, 0.98))).toFixed(3)),
    handoffLinesProgress: Number(smootherstep(0.74, 1.0, p).toFixed(3)),
  };
}

/* ============================================================================
   CENA 05 — FREQUÊNCIA E MATÉRIA
   Campo procedural de interferência onda-partícula + fotografias macro têxteis
   alinhadas geometricamente às linhas do campo.
   ============================================================================ */
export interface Scene05FrequencyState {
  waveAmplitude: number;
  interferenceBlend: number;
  spatialCompression: number;
  centralConvergence: number;
  suspensionCalm: number;
  scatterOut: number;
  macroLeftOpacity: number;
  macroLeftX: number;
  macroRightOpacity: number;
  macroRightX: number;
  macroCenterOpacity: number;
  phraseWeights: [number, number, number, number];
}

// ~42% da Cena 05 distribuídos nas 4 afirmações e pausa de suspensão do campo
const SCENE_05_PLATEAUS: readonly PlateauSegment[] = [
  { inStart: 0.06, inEnd: 0.16, outStart: 0.08, outEnd: 0.14 },
  { inStart: 0.30, inEnd: 0.40, outStart: 0.31, outEnd: 0.37 },
  { inStart: 0.52, inEnd: 0.62, outStart: 0.54, outEnd: 0.60 },
  { inStart: 0.72, inEnd: 0.84, outStart: 0.73, outEnd: 0.79 },
];

export function computeScene05FrequencyMatter(pRaw: number, isMobile: boolean): Scene05FrequencyState {
  const p = remapTimelineWithPlateaus(pRaw, SCENE_05_PLATEAUS);

  const waveAmplitude = Number(
    (smoothstep(0.06, 0.42, p) * (1 - smoothstep(0.78, 0.96, p))).toFixed(3)
  );
  const interferenceBlend = Number(smoothstep(0.18, 0.62, p).toFixed(3));
  const spatialCompression = Number(
    (Math.sin(clamp((p - 0.25) / 0.55, 0, 1) * Math.PI) * 0.85).toFixed(3)
  );
  const centralConvergence = Number(
    (smootherstep(0.45, 0.78, p) * (1 - smootherstep(0.84, 1.0, p))).toFixed(3)
  );
  const suspensionCalm = Number(
    Math.exp(-Math.pow((p - 0.74) / 0.09, 2)).toFixed(3)
  );
  const scatterOut = Number(smootherstep(0.84, 1.0, p).toFixed(3));

  const macroShift = isMobile ? 38 : 96;
  const macroLeftIn = smootherstep(0.14, 0.36, p);
  const macroLeftOut = smootherstep(0.62, 0.82, p);
  const macroLeftOpacity = Number((macroLeftIn * (1 - macroLeftOut)).toFixed(3));
  const macroLeftX = Number((lerp(-macroShift, 0, macroLeftIn) - macroLeftOut * macroShift).toFixed(1));

  const macroRightIn = smootherstep(0.3, 0.52, p);
  const macroRightOut = smootherstep(0.72, 0.9, p);
  const macroRightOpacity = Number((macroRightIn * (1 - macroRightOut)).toFixed(3));
  const macroRightX = Number((lerp(macroShift, 0, macroRightIn) + macroRightOut * macroShift).toFixed(1));

  const macroCenterIn = smootherstep(0.56, 0.74, p);
  const macroCenterOut = smootherstep(0.84, 0.98, p);
  const macroCenterOpacity = Number((macroCenterIn * (1 - macroCenterOut)).toFixed(3));

  const w0 = rangeProgress(p, 0.02, 0.16) * (1 - rangeProgress(p, 0.3, 0.42));
  const w1 = rangeProgress(p, 0.26, 0.4) * (1 - rangeProgress(p, 0.52, 0.64));
  const w2 = rangeProgress(p, 0.48, 0.62) * (1 - rangeProgress(p, 0.74, 0.86));
  const w3 = rangeProgress(p, 0.7, 0.84) * (1 - rangeProgress(p, 0.92, 1.0));

  return {
    waveAmplitude,
    interferenceBlend,
    spatialCompression,
    centralConvergence,
    suspensionCalm,
    scatterOut,
    macroLeftOpacity,
    macroLeftX,
    macroRightOpacity,
    macroRightX,
    macroCenterOpacity,
    phraseWeights: [
      Number(w0.toFixed(3)),
      Number(w1.toFixed(3)),
      Number(w2.toFixed(3)),
      Number(w3.toFixed(3)),
    ],
  };
}

/* ============================================================================
   CENA 06 — SÍNTESE E ENCERRAMENTO
   Fragmentos de todas as cenas retornam de trajetórias curvas -> convergem
   em composição editorial única (platô de contemplação) -> deslocam-se para
   as extremidades -> espaço negativo + logo oficial + manifesto + CTA final.
   ============================================================================ */
export interface SynthesisFragmentState {
  tx: number;
  ty: number;
  tz: number;
  rotDeg: number;
  scale: number;
  opacity: number;
}

export interface Scene06SynthesisState {
  fragments: SynthesisFragmentState[];
  collageStability: number;
  signatureOpacity: number;
  signatureScale: number;
  signatureY: number;
  ctaInteractive: boolean;
}

interface FragmentVector {
  startX: number;
  startY: number;
  startZ: number;
  startRot: number;
  exitX: number;
  exitY: number;
  exitRot: number;
}

const FRAGMENT_VECTORS: readonly FragmentVector[] = [
  { startX: -320, startY: -220, startZ: 240, startRot: -14, exitX: -540, exitY: -280, exitRot: -10 },
  { startX: 340, startY: -180, startZ: -180, startRot: 12, exitX: 560, exitY: -240, exitRot: 11 },
  { startX: -280, startY: 220, startZ: -220, startRot: 9, exitX: -520, exitY: 320, exitRot: 8 },
  { startX: 300, startY: 240, startZ: 200, startRot: -11, exitX: 520, exitY: 300, exitRot: -9 },
  { startX: 0, startY: -310, startZ: 150, startRot: 5, exitX: 0, exitY: -440, exitRot: -4 },
  { startX: 0, startY: 320, startZ: -140, startRot: -6, exitX: 0, exitY: 440, exitRot: 6 },
];

// ~44% da Cena 06 para contemplação da colagem unificada + assinatura final Limiar
const SCENE_06_PLATEAUS: readonly PlateauSegment[] = [
  { inStart: 0.36, inEnd: 0.58, outStart: 0.44, outEnd: 0.56 },
  { inStart: 0.78, inEnd: 1.0, outStart: 0.90, outEnd: 1.0 },
];

export function computeScene06Synthesis(pRaw: number, isMobile: boolean): Scene06SynthesisState {
  const p = remapTimelineWithPlateaus(pRaw, SCENE_06_PLATEAUS);

  // 0.00..0.44: convergência das partes em uma montagem coesa
  // 0.44..0.64: estabilidade de contemplação
  // 0.64..0.86: desconstrução direcionada para as extremidades
  // 0.78..0.96: assinatura oficial Limiar + frase final + CTA
  const converge = smootherstep(0.0, 0.44, p);
  const disperse = smootherstep(0.62, 0.88, p);
  const scaleCoord = isMobile ? 0.42 : 1;

  const collageStability = Number(
    (smootherstep(0.36, 0.5, p) * (1 - smootherstep(0.6, 0.76, p))).toFixed(3)
  );

  const fragments: SynthesisFragmentState[] = FRAGMENT_VECTORS.map((v, idx) => {
    const arcLift = Math.sin(converge * Math.PI) * (idx % 2 === 0 ? -42 : 42) * scaleCoord;
    const tx =
      lerp(v.startX * scaleCoord, 0, converge) +
      disperse * v.exitX * scaleCoord;
    const ty =
      lerp(v.startY * scaleCoord, 0, converge) +
      arcLift * (1 - disperse) +
      disperse * v.exitY * scaleCoord;
    const tz = lerp(v.startZ * scaleCoord, 0, converge) + disperse * 180;
    const rotDeg = lerp(v.startRot, 0, converge) + disperse * v.exitRot;
    const scale = lerp(0.78, 1, converge) - disperse * 0.14;
    const opacity =
      rangeProgress(p, 0.02 + idx * 0.02, 0.22 + idx * 0.02) *
      (1 - rangeProgress(p, 0.74, 0.9));

    return {
      tx: Number(tx.toFixed(1)),
      ty: Number(ty.toFixed(1)),
      tz: Number(tz.toFixed(1)),
      rotDeg: Number(rotDeg.toFixed(2)),
      scale: Number(clamp(scale, 0.5, 1.2).toFixed(3)),
      opacity: Number(opacity.toFixed(3)),
    };
  });

  const sigIn = smootherstep(0.74, 0.94, p);

  return {
    fragments,
    collageStability,
    signatureOpacity: Number(sigIn.toFixed(3)),
    signatureScale: Number(lerp(0.92, 1.0, sigIn).toFixed(3)),
    signatureY: Number(lerp(28, 0, sigIn).toFixed(1)),
    ctaInteractive: p >= 0.8,
  };
}
