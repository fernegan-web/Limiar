/**
 * LIMIAR — CINEMATIC PORTAL INTRO TIMELINE
 * Matemática pura e determinística para sincronizar todas as 7 camadas
 * ao longo de ~2050ms, com sobreposição contínua e zero pausas abruptas.
 */

export const INTRO_TOTAL_DURATION_MS = 2050;
export const INTRO_PORTAL_OPEN_MS = 1480;
export const INTRO_FAILSAFE_MS = 2650;

export type PortalIntroStage = 'holding' | 'revealing' | 'complete';

export interface IntroLayerTransform {
  opacity: number;
  scale: number;
  rotateDeg: number;
  blurPx: number;
}

export interface IntroFrameState {
  elapsedMs: number;
  progress: number;
  portalOpened: boolean;
  finished: boolean;
  portalMaskActive: boolean;
  portalInnerVmax: number;
  portalOuterVmax: number;
  logo: IntroLayerTransform;
  ring: IntroLayerTransform;
  filaments: IntroLayerTransform;
  mist: IntroLayerTransform;
  tribals: IntroLayerTransform;
  orbitals: IntroLayerTransform;
  particles: {
    opacity: number;
    scale: number;
    orbitAngleDeg: number;
    pulseBoost: number;
  };
  energyGlowOpacity: number;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function segment(ms: number, startMs: number, endMs: number): number {
  if (endMs <= startMs) return ms >= endMs ? 1 : 0;
  return clamp01((ms - startMs) / (endMs - startMs));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp01(t);
}

function easeOutCubic(t: number): number {
  const c = clamp01(t);
  return 1 - Math.pow(1 - c, 3);
}

function easeInCubic(t: number): number {
  const c = clamp01(t);
  return c * c * c;
}

function easeInOutCubic(t: number): number {
  const c = clamp01(t);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

function easeOutExpo(t: number): number {
  const c = clamp01(t);
  return c === 1 ? 1 : 1 - Math.pow(2, -10 * c);
}

/**
 * Pulso suave em forma de sino (0 -> 1 -> 0) dentro de um intervalo.
 */
function bellPulse(ms: number, startMs: number, peakMs: number, endMs: number): number {
  if (ms <= startMs || ms >= endMs) return 0;
  if (ms <= peakMs) {
    return easeInOutCubic(segment(ms, startMs, peakMs));
  }
  return 1 - easeInOutCubic(segment(ms, peakMs, endMs));
}

export function computeIntroFrame(rawElapsedMs: number): IntroFrameState {
  const ms = Math.max(0, Math.min(INTRO_TOTAL_DURATION_MS, Number.isFinite(rawElapsedMs) ? rawElapsedMs : 0));
  const progress = clamp01(ms / INTRO_TOTAL_DURATION_MS);

  // Etapa 4: Concentração (1200–1500ms) -> pulso energético antes da ruptura do portal
  const concentrationPulse = bellPulse(ms, 1180, 1360, 1520);

  // Etapa 5: Travessia (1480–2050ms) -> abertura circular do centro para fora
  const travessiaT = segment(ms, INTRO_PORTAL_OPEN_MS, INTRO_TOTAL_DURATION_MS);
  const portalEase =
    travessiaT < 0.28
      ? 2.6 * travessiaT * travessiaT
      : easeOutExpo((travessiaT - 0.08) / 0.92);

  const portalMaskActive = travessiaT > 0;
  const portalInnerVmax = portalMaskActive ? Number((portalEase * 86).toFixed(3)) : 0;
  const portalOuterVmax = portalMaskActive
    ? Number((portalEase * 96 + 5.5).toFixed(3))
    : 0;

  // Camada 07: Logo oficial
  const logoIn = easeOutCubic(segment(ms, 0, 420));
  const logoSharp = easeOutCubic(segment(ms, 180, 680));
  const logoOut = easeInOutCubic(segment(ms, 1460, 1820));
  const logoOpacity = clamp01(logoIn * (1 - logoOut));
  const logoScale =
    lerp(0.91, 1.0, logoIn) +
    concentrationPulse * 0.032 +
    logoOut * 0.13;
  const logoBlur = (1 - logoSharp) * 9.5 + logoOut * 6.5;

  // Camada 04: Anel energético circular
  const ringIn = easeOutCubic(segment(ms, 220, 740));
  const ringMotion = segment(ms, 480, 1520);
  const ringExpand = easeInCubic(segment(ms, 1470, 1980));
  const ringFadeOut = easeInOutCubic(segment(ms, 1690, 2000));
  const ringOpacity = clamp01(ringIn * (1 - ringFadeOut));
  const ringScale =
    lerp(0.66, 1.0, ringIn) -
    concentrationPulse * 0.035 +
    ringExpand * 2.75;
  const ringRotate = lerp(-10, 26, easeInOutCubic(ringMotion)) + ringExpand * 30;

  // Camada 03: Filamentos energéticos externos (rotação em sentido oposto ao anel)
  const filIn = easeOutCubic(segment(ms, 340, 860));
  const filMotion = segment(ms, 480, 1540);
  const filExpand = easeInCubic(segment(ms, 1480, 2010));
  const filFadeOut = easeInOutCubic(segment(ms, 1680, 2020));
  const filOpacity = clamp01(filIn * (1 - filFadeOut));
  const filScale =
    lerp(0.84, 1.0, filIn) -
    concentrationPulse * 0.025 +
    filExpand * 2.25;
  const filRotate = lerp(12, -22, easeInOutCubic(filMotion)) - filExpand * 18;

  // Camada auxiliar de névoa cósmica (exclusiva de profundidade no dark mode)
  const mistIn = easeOutCubic(segment(ms, 400, 960));
  const mistFadeOut = easeInOutCubic(segment(ms, 1640, 1980));
  const mistOpacity = clamp01(mistIn * (1 - mistFadeOut));
  const mistScale = lerp(0.88, 1.0, mistIn) + concentrationPulse * 0.05 + filExpand * 1.9;

  // Camada 02: Dark neotribais periféricos
  const tribalsIn = easeOutCubic(segment(ms, 520, 1140));
  const tribalsOut = easeInOutCubic(segment(ms, 1490, 1970));
  const tribalsOpacity = clamp01(tribalsIn * (1 - tribalsOut));
  const tribalsScale = lerp(1.04, 1.0, tribalsIn) + tribalsOut * 0.24;

  // Camada 05: Círculos orbitais finos (CSS/SVG)
  const orbIn = easeOutCubic(segment(ms, 280, 740));
  const orbOut = easeInOutCubic(segment(ms, 1620, 1960));
  const orbitalsOpacity = clamp01(orbIn * (1 - orbOut));
  const orbitalsScale = lerp(0.82, 1.0, orbIn) - concentrationPulse * 0.02 + ringExpand * 2.2;
  const orbitalsRotate = lerp(0, 18, easeInOutCubic(segment(ms, 460, 1960)));

  // Camada 06: Pontos luminosos em verde pastel (#A4C75A) e ultravioleta (#A18AC8)
  const partIn = easeOutCubic(segment(ms, 460, 880));
  const partOut = easeInOutCubic(segment(ms, 1640, 1960));
  const partOpacity = clamp01(partIn * (1 - partOut));
  const partScale = lerp(0.78, 1.0, partIn) + concentrationPulse * 0.04 + ringExpand * 2.35;
  const orbitAngleDeg = lerp(0, 138, easeInOutCubic(segment(ms, 460, 1960)));

  const glowIn = easeOutCubic(segment(ms, 340, 1100));
  const glowOut = easeInOutCubic(segment(ms, 1520, 1940));
  const energyGlowOpacity = clamp01(
    (glowIn * 0.58 + concentrationPulse * 0.42) * (1 - glowOut)
  );

  return {
    elapsedMs: ms,
    progress,
    portalOpened: ms >= INTRO_PORTAL_OPEN_MS,
    finished: ms >= INTRO_TOTAL_DURATION_MS,
    portalMaskActive,
    portalInnerVmax,
    portalOuterVmax,
    logo: {
      opacity: logoOpacity,
      scale: Number(logoScale.toFixed(4)),
      rotateDeg: 0,
      blurPx: Number(logoBlur.toFixed(2)),
    },
    ring: {
      opacity: ringOpacity,
      scale: Number(ringScale.toFixed(4)),
      rotateDeg: Number(ringRotate.toFixed(2)),
      blurPx: 0,
    },
    filaments: {
      opacity: filOpacity,
      scale: Number(filScale.toFixed(4)),
      rotateDeg: Number(filRotate.toFixed(2)),
      blurPx: 0,
    },
    mist: {
      opacity: mistOpacity,
      scale: Number(mistScale.toFixed(4)),
      rotateDeg: Number((ringRotate * 0.35).toFixed(2)),
      blurPx: 0,
    },
    tribals: {
      opacity: tribalsOpacity,
      scale: Number(tribalsScale.toFixed(4)),
      rotateDeg: 0,
      blurPx: 0,
    },
    orbitals: {
      opacity: orbitalsOpacity,
      scale: Number(orbitalsScale.toFixed(4)),
      rotateDeg: Number(orbitalsRotate.toFixed(2)),
      blurPx: 0,
    },
    particles: {
      opacity: partOpacity,
      scale: Number(partScale.toFixed(4)),
      orbitAngleDeg: Number(orbitAngleDeg.toFixed(2)),
      pulseBoost: Number(concentrationPulse.toFixed(3)),
    },
    energyGlowOpacity: Number(energyGlowOpacity.toFixed(3)),
  };
}
