/**
 * LIMIAR — O NASCIMENTO DA SINGULARIDADE
 * Coreografia determinística (~5000ms) integrada diretamente à composição oficial da homepage.
 *
 * Fases:
 * - 01 (0.0s – 0.8s): O Vazio — fundo sólido do tema ativo + surgimento sutil da logo centralizada.
 * - 02 (0.8s – 1.6s): O Nascimento — nascimento súbito do buraco negro procedural atrás da logo.
 * - 03 (1.6s – 2.6s): A Troca — sucção gravitacional da logo + emergência da moldura tribal de dentro do horizonte em alta rotação anti-horária (4x).
 * - 04 (2.6s – 4.1s): Posicionamento e Desaceleração — FLIP contínuo até a geometria real do Hero e desaceleração angular contínua até a velocidade de repouso (1x).
 * - 05 (4.1s – 5.0s): A Materialização — entrada discreta da modelo em tamanho constante (fade-in, leve desfoque e pequeno deslocamento vertical) + revelação suave do Hero, Navbar e background global.
 */

export const SINGULARITY_INTRO_DURATION_MS = 5000;
export const SINGULARITY_INTRO_ENGINE_WAKE_MS = 650;
export const SINGULARITY_INTRO_FAILSAFE_MS = 6200;
export const INTRO_SEEN_SESSION_KEY = 'limiar_singularity_intro_seen_v1';

export type SingularityIntroPhase =
  | 'void'
  | 'birth'
  | 'exchange'
  | 'positioning'
  | 'materialization'
  | 'complete';

export interface SingularityIntroFrame {
  elapsedMs: number;
  progress: number;
  phase: SingularityIntroPhase;
  engineActive: boolean;
  finished: boolean;
  logo: {
    opacity: number;
    scale: number;
    stretchY: number;
    blurPx: number;
    /** 0 = logo escura sobre fundo claro (Fase 01 light); 1 = logo branca dentro do horizonte negro */
    lightHorizonMix: number;
  };
  blackhole: {
    opacity: number;
    scale: number;
  };
  wreath: {
    opacity: number;
    scale: number;
    /** Multiplicador sobre a velocidade angular normal de repouso (4x -> 1x) */
    speedMultiplier: number;
  };
  flip: {
    /** 1 = centro exato da viewport; 0 = posição definitiva na geometria real do Hero */
    centerFactor: number;
    /** Escala do conjunto óptico durante a apresentação centralizada até 1.0 no Hero */
    scale: number;
  };
  model: {
    opacity: number;
    yPx: number;
    blurPx: number;
    scale: 1;
  };
  chrome: {
    atmosphereOpacity: number;
    heroContentOpacity: number;
    navbarOpacity: number;
  };
}

export interface IntroEligibilityInput {
  pathname: string;
  search?: string;
  hash?: string;
  reducedMotion?: boolean;
  sessionSeen?: boolean;
}

export function shouldPlaySingularityIntro({
  pathname,
  search = '',
  hash = '',
  reducedMotion = false,
  sessionSeen = false,
}: IntroEligibilityInput): boolean {
  const isHome = pathname === '/' || pathname === '';
  if (!isHome) return false;
  if (reducedMotion || sessionSeen) return false;
  const cleanHash = hash.replace(/^#/, '');
  if (cleanHash === 'todos-os-produtos') return false;
  if (search) {
    try {
      const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
      if (params.get('autostart') === '1') return false;
    } catch {
      if (search.includes('autostart=1')) return false;
    }
  }
  return true;
}

export interface RectBoundsLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function computeFlipOffset(
  anchorRect: RectBoundsLike,
  viewport: { width: number; height: number }
): { tx: number; ty: number } {
  const anchorCenterX = anchorRect.left + anchorRect.width * 0.5;
  const anchorCenterY = anchorRect.top + anchorRect.height * 0.5;
  const vpCenterX = viewport.width * 0.5;
  const vpCenterY = viewport.height * 0.5;

  return {
    tx: Number((vpCenterX - anchorCenterX).toFixed(2)),
    ty: Number((vpCenterY - anchorCenterY).toFixed(2)),
  };
}

/**
 * Calcula `animation-delay` negativo (em segundos) para que a animação CSS
 * `limiarWreathSpinMobile` (0deg -> -360deg em `durationSec`) continue
 * exatamente no ângulo `angleDeg` sem saltos nem reinicializações.
 */
export function computeSyncedCssSpinDelaySec(
  angleDeg: number,
  durationSec = 32
): number {
  if (!Number.isFinite(angleDeg) || durationSec <= 0) return 0;
  const norm = ((angleDeg % 360) + 360) % 360;
  const ccwTurned = (360 - norm) % 360;
  return Number((-(ccwTurned / 360) * durationSec).toFixed(4));
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

function easeOutPow(t: number, power: number): number {
  const c = clamp01(t);
  return 1 - Math.pow(1 - c, power);
}

function easeInCubic(t: number): number {
  const c = clamp01(t);
  return c * c * c;
}

function easeOutExpo(t: number): number {
  const c = clamp01(t);
  return c === 1 ? 1 : 1 - Math.pow(2, -10 * c);
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge1 === edge0) return x >= edge1 ? 1 : 0;
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function smootherstep(edge0: number, edge1: number, x: number): number {
  if (edge1 === edge0) return x >= edge1 ? 1 : 0;
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export function resolveSingularityIntroPhase(ms: number): SingularityIntroPhase {
  if (ms < 800) return 'void';
  if (ms < 1600) return 'birth';
  if (ms < 2600) return 'exchange';
  if (ms < 4100) return 'positioning';
  if (ms < SINGULARITY_INTRO_DURATION_MS) return 'materialization';
  return 'complete';
}

export function computeSingularityIntroFrame(
  rawElapsedMs: number,
  isMobile = false
): SingularityIntroFrame {
  const ms = Math.max(
    0,
    Math.min(
      SINGULARITY_INTRO_DURATION_MS,
      Number.isFinite(rawElapsedMs) ? rawElapsedMs : 0
    )
  );
  const progress = clamp01(ms / SINGULARITY_INTRO_DURATION_MS);
  const phase = resolveSingularityIntroPhase(ms);

  // Fase 01 -> 03: Logo oficial (surge do vazio -> centralizada no horizonte -> sugada para singularidade)
  const logoIn = easeOutCubic(segment(ms, 80, 680));
  const logoScaleIn = lerp(0.92, 1.0, easeOutCubic(segment(ms, 80, 780)));
  const suctionT = segment(ms, 1580, 2520);
  const suctionEase = easeInCubic(suctionT);
  const suctionFade = smoothstep(0.32, 1.0, suctionT);
  const logoOpacity =
    ms >= 2520 ? 0 : Number(clamp01(logoIn * (1 - suctionFade)).toFixed(4));
  const logoScale =
    ms >= 2520
      ? 0.06
      : Number((logoScaleIn * (1 - 0.94 * suctionEase)).toFixed(4));
  const logoStretchY = Number((1 + 0.16 * Math.sin(suctionT * Math.PI)).toFixed(4));
  const logoBlurPx = Number((suctionEase * 3.5).toFixed(2));
  const lightHorizonMix = Number(smoothstep(820, 1060, ms).toFixed(4));

  // Fase 02+: Buraco negro procedural (acorda aos 650ms, nasce aos 800ms atrás da logo)
  const bhOpacity =
    ms < 800 ? 0 : Number(easeOutCubic(segment(ms, 800, 1020)).toFixed(4));
  const bhScale =
    ms < 800
      ? 0.14
      : Number(lerp(0.14, 1.0, easeOutExpo(segment(ms, 800, 1480))).toFixed(4));

  // Fase 03+: Moldura tribal (nasce dentro da área oculta pelo horizonte negro e emerge em ~4x CCW)
  const wreathOpacity =
    ms < 1700 ? 0 : Number(easeOutCubic(segment(ms, 1700, 1820)).toFixed(4));
  const wreathGrowT = segment(ms, 1720, 2600);
  const wreathScale =
    ms < 1720
      ? 0.36
      : Number(lerp(0.36, 1.0, easeOutPow(wreathGrowT, 2.4)).toFixed(4));

  let speedMultiplier = 0;
  if (ms >= 1720 && ms < 2600) {
    speedMultiplier = 4.0;
  } else if (ms >= 2600 && ms < 4100) {
    speedMultiplier = Number(
      lerp(4.0, 1.0, smootherstep(2600, 4100, ms)).toFixed(4)
    );
  } else if (ms >= 4100) {
    speedMultiplier = 1.0;
  }

  // Fase 04: FLIP do centro exato da viewport para a posição real no Hero
  const posT = smootherstep(2600, 4100, ms);
  const centerFactor = Number((1 - posT).toFixed(4));
  const presentationScale = isMobile ? 1.04 : 0.94;
  const flipScale = Number(lerp(presentationScale, 1.0, posT).toFixed(4));

  // Fase 05: Materialização discreta da modelo (tamanho final constante scale: 1)
  const modelMaxY = isMobile ? 18 : 22;
  const modelOpacity =
    ms <= 4100 ? 0 : Number(easeOutCubic(segment(ms, 4100, 4850)).toFixed(4));
  const modelY =
    ms <= 4100
      ? modelMaxY
      : Number(((1 - easeOutCubic(segment(ms, 4100, 4920))) * modelMaxY).toFixed(2));
  const modelBlur =
    ms <= 4100
      ? 3.5
      : Number(((1 - easeOutCubic(segment(ms, 4100, 4680))) * 3.5).toFixed(2));

  // Fase 05: Revelação suave do Hero, Navbar e atmosfera/background global
  const atmosphereOpacity = Number(
    easeOutCubic(segment(ms, 4120, 4920)).toFixed(4)
  );
  const heroContentOpacity = Number(
    easeOutCubic(segment(ms, 4200, 4950)).toFixed(4)
  );
  const navbarOpacity = Number(
    easeOutCubic(segment(ms, 4280, 4960)).toFixed(4)
  );

  return {
    elapsedMs: ms,
    progress,
    phase,
    engineActive: ms >= SINGULARITY_INTRO_ENGINE_WAKE_MS,
    finished: ms >= SINGULARITY_INTRO_DURATION_MS,
    logo: {
      opacity: logoOpacity,
      scale: logoScale,
      stretchY: logoStretchY,
      blurPx: logoBlurPx,
      lightHorizonMix,
    },
    blackhole: {
      opacity: bhOpacity,
      scale: bhScale,
    },
    wreath: {
      opacity: wreathOpacity,
      scale: wreathScale,
      speedMultiplier,
    },
    flip: {
      centerFactor,
      scale: flipScale,
    },
    model: {
      opacity: modelOpacity,
      yPx: modelY,
      blurPx: modelBlur,
      scale: 1,
    },
    chrome: {
      atmosphereOpacity,
      heroContentOpacity,
      navbarOpacity,
    },
  };
}
