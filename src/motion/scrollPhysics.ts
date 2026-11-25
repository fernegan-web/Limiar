import type Lenis from 'lenis';
import { clamp } from './thresholdConfig';

/**
 * NÚCLEO DE FÍSICA DE ROLAGEM & AMORTECIMENTO DE TIMELINE — LIMIAR
 * ---------------------------------------------------------------------------
 * 1. Ponte global com o motor Lenis (inércia sutil e progressiva em wheel/trackpad,
 *    preservando integralmente a rolagem tátil nativa no mobile).
 * 2. Damper físico para progresso de timeline cinematográfica (aceleração,
 *    desaceleração, resistência a flicks bruscos, limite de velocidade máxima e
 *    convergência limpa sem loops infinitos em repouso).
 * 3. Remapeamento temporal monotônico C1 com platôs de contemplação (~35–45% por cena).
 */

type ScrollListener = () => void;

let activeLenis: Lenis | null = null;
const scrollListeners = new Set<ScrollListener>();

export function setLenisInstance(instance: Lenis | null): void {
  activeLenis = instance;
}

export function getLenisInstance(): Lenis | null {
  return activeLenis;
}

export function subscribePhysicsScroll(listener: ScrollListener): () => void {
  scrollListeners.add(listener);
  return () => {
    scrollListeners.delete(listener);
  };
}

export function notifyPhysicsScroll(): void {
  scrollListeners.forEach((listener) => {
    listener();
  });
}

export function getEffectiveScrollY(): number {
  if (typeof window === 'undefined') return 0;
  if (activeLenis) {
    return activeLenis.scroll;
  }
  return window.scrollY;
}

export interface PhysicsScrollToOptions {
  immediate?: boolean;
  duration?: number;
  offset?: number;
}

export function scrollToWithPhysics(
  target: number | string | HTMLElement,
  options: PhysicsScrollToOptions = {}
): void {
  if (typeof window === 'undefined') return;
  const { immediate = false, duration = 1.15, offset = 0 } = options;

  if (activeLenis) {
    if (immediate) {
      activeLenis.scrollTo(target, { immediate: true, force: true, offset });
      if (typeof target === 'number') {
        window.scrollTo({ top: target + offset, behavior: 'auto' });
      }
      notifyPhysicsScroll();
      return;
    }

    activeLenis.scrollTo(target, {
      duration,
      offset,
      easing: (t) => 1 - Math.pow(1 - t, 3.6),
    });
    return;
  }

  if (typeof target === 'number') {
    window.scrollTo({
      top: Math.max(0, target + offset),
      behavior: immediate ? 'auto' : 'smooth',
    });
    return;
  }

  const el =
    typeof target === 'string'
      ? (document.querySelector(target) as HTMLElement | null)
      : target;
  if (!el) return;

  const rect = el.getBoundingClientRect();
  const top = Math.max(0, rect.top + window.scrollY + offset);
  window.scrollTo({
    top,
    behavior: immediate ? 'auto' : 'smooth',
  });
}

/* ============================================================================
   AMORTECEDOR DE PROGRESSO CINEMATOGRÁFICO (PESO, RESISTÊNCIA & LIMITE DE VELOCIDADE)
   ============================================================================ */
export interface ProgressDamperConfig {
  /** Rigidez da mola crítica (maior = resposta mais ágil) */
  stiffness: number;
  /** Amortecimento viscoso (próximo a 2 * sqrt(stiffness) evita bounce artificial) */
  damping: number;
  /** Velocidade máxima normalizada por segundo (1.0 = cena inteira em 1s) */
  maxSpeedPerSec: number;
  /** Distância a partir da qual o catch-up progressivo impede descompasso ao arrastar a barra */
  softCatchupThreshold: number;
}

export const DEFAULT_UNIVERSO_DAMPER_CONFIG: ProgressDamperConfig = {
  stiffness: 15,
  damping: 8.1,
  maxSpeedPerSec: 0.46,
  softCatchupThreshold: 0.34,
};

export const HERO_TRAVERSAL_DAMPER_CONFIG: ProgressDamperConfig = {
  stiffness: 24,
  damping: 10.0,
  maxSpeedPerSec: 1.25,
  softCatchupThreshold: 0.32,
};

const EPSILON_POS = 0.00035;
const EPSILON_VEL = 0.00045;

export class CinematicProgressDamper {
  private visualP = 0;
  private targetP = 0;
  private velocityP = 0;
  private settled = true;
  private readonly cfg: ProgressDamperConfig;

  constructor(config: ProgressDamperConfig = DEFAULT_UNIVERSO_DAMPER_CONFIG) {
    this.cfg = config;
  }

  public setTarget(nextTarget: number): void {
    const clamped = clamp(nextTarget, 0, 1);
    if (Math.abs(clamped - this.targetP) > 1e-6) {
      this.targetP = clamped;
      this.settled = false;
    } else if (Math.abs(clamped - this.visualP) > EPSILON_POS) {
      this.settled = false;
    }
  }

  public snap(value: number): number {
    const clamped = clamp(value, 0, 1);
    this.visualP = clamped;
    this.targetP = clamped;
    this.velocityP = 0;
    this.settled = true;
    return clamped;
  }

  public getValue(): number {
    return this.visualP;
  }

  public isSettled(): boolean {
    return this.settled;
  }

  public step(dtSec: number, maxSpeedOverride?: number): number {
    const dt = Math.min(Math.max(dtSec, 0.001), 0.045);
    const diff = this.targetP - this.visualP;
    const absDiff = Math.abs(diff);

    if (absDiff < EPSILON_POS && Math.abs(this.velocityP) < EPSILON_VEL) {
      this.visualP = this.targetP;
      this.velocityP = 0;
      this.settled = true;
      return this.visualP;
    }

    this.settled = false;

    // Resistência não-linear suave + catch-up controlado apenas em saltos extremos (ex: arraste na scrollbar)
    const { stiffness, damping, softCatchupThreshold } = this.cfg;
    const baseMax = maxSpeedOverride ?? this.cfg.maxSpeedPerSec;

    const excess = Math.max(0, absDiff - softCatchupThreshold);
    const dynamicMaxSpeed = baseMax * (1 + excess * 2.1);

    // Mola crítica: aceleração proporcional ao erro menos amortecimento da velocidade
    const accel = diff * stiffness - this.velocityP * damping;
    this.velocityP += accel * dt;

    // Limita a velocidade angular/temporal da animação contra flicks bruscos
    if (this.velocityP > dynamicMaxSpeed) {
      this.velocityP = dynamicMaxSpeed;
    } else if (this.velocityP < -dynamicMaxSpeed) {
      this.velocityP = -dynamicMaxSpeed;
    }

    let nextP = this.visualP + this.velocityP * dt;

    // Evita ultrapassar o alvo após desaceleração em bordas [0, 1]
    if ((diff > 0 && nextP > this.targetP) || (diff < 0 && nextP < this.targetP)) {
      if (absDiff < 0.025) {
        nextP = this.targetP;
        this.velocityP = 0;
      }
    }

    this.visualP = clamp(nextP, 0, 1);

    // Se bateu no limite físico 0 ou 1 no mesmo sentido do alvo, assenta sem residual
    if (
      (this.visualP === 0 && this.targetP === 0 && Math.abs(this.velocityP) < 0.02) ||
      (this.visualP === 1 && this.targetP === 1 && Math.abs(this.velocityP) < 0.02)
    ) {
      this.velocityP = 0;
      this.settled = true;
    }

    return this.visualP;
  }
}

/* ============================================================================
   REMAPEAMENTO TEMPORAL MONOTÔNICO C1 COM PLATÔS DE CONTEMPLAÇÃO
   ============================================================================ */
export interface PlateauSegment {
  /** Início no progresso bruto de scroll [0..1] */
  inStart: number;
  /** Fim no progresso bruto de scroll [0..1] */
  inEnd: number;
  /** Início equivalente no tempo visual da cena [0..1] */
  outStart: number;
  /** Fim equivalente no tempo visual da cena [0..1] (outEnd - outStart pequeno = platô de leitura) */
  outEnd: number;
}

interface Knot {
  x: number;
  y: number;
  slope: number;
}

/**
 * Converte o progresso amortecido de scroll em tempo visual da cena com janelas
 * amplas de contemplação/leitura.
 *
 * Propriedades matemáticas garantidas:
 * - Contínuo e derivável (C1) nas transições entre movimento e platô.
 * - Estritamente monotônico crescente (reversível sem saltos ou travamentos).
 * - Preserva exatos 0 -> 0 e 1 -> 1 nas fronteiras de handoff entre cenas.
 */
export function remapTimelineWithPlateaus(
  pRaw: number,
  plateaus: readonly PlateauSegment[]
): number {
  const x = clamp(pRaw, 0, 1);
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  if (plateaus.length === 0) return x;

  const knots: Knot[] = [];
  if (plateaus[0].inStart > 0.0001) {
    knots.push({ x: 0, y: 0, slope: 1 });
  }

  for (let i = 0; i < plateaus.length; i++) {
    const seg = plateaus[i];
    const dx = Math.max(0.0001, seg.inEnd - seg.inStart);
    const holdSlope = Math.max(0.02, (seg.outEnd - seg.outStart) / dx);
    knots.push({ x: seg.inStart, y: seg.outStart, slope: holdSlope });
    knots.push({ x: seg.inEnd, y: seg.outEnd, slope: holdSlope });
  }

  const last = plateaus[plateaus.length - 1];
  if (last.inEnd < 0.9999) {
    knots.push({ x: 1, y: 1, slope: 1 });
  }

  // Ajusta tangentes nos extremos 0 e 1 para igualar secante e evitar overshoot cúbico
  for (let i = 0; i < knots.length - 1; i++) {
    const k0 = knots[i];
    const k1 = knots[i + 1];
    if (x >= k0.x && x <= k1.x) {
      const dx = k1.x - k0.x;
      if (dx <= 1e-6) return k1.y;
      const dy = k1.y - k0.y;
      const secant = dy / dx;
      if (secant <= 1e-6) return k0.y;

      // Limita tangentes a <= 2.3 * secante (condição suficiente de monotonicidade cúbica de Hermite)
      const maxSlope = 2.3 * secant;
      const m0 = clamp(k0.slope, 0.02 * secant, maxSlope);
      const m1 = clamp(k1.slope, 0.02 * secant, maxSlope);

      const u = (x - k0.x) / dx;
      const u2 = u * u;
      const u3 = u2 * u;

      const h00 = 2 * u3 - 3 * u2 + 1;
      const h10 = u3 - 2 * u2 + u;
      const h01 = -2 * u3 + 3 * u2;
      const h11 = u3 - u2;

      return clamp(h00 * k0.y + h10 * dx * m0 + h01 * k1.y + h11 * dx * m1, 0, 1);
    }
  }

  return x;
}
