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
 */

export interface ScrollEnvironmentCaps {
  hasCoarsePointer: boolean;
  hasNoHover: boolean;
  hasFinePointer: boolean;
  maxTouchPoints: number;
  innerWidth: number;
}

export function readScrollEnvironmentCaps(): ScrollEnvironmentCaps {
  if (typeof window === 'undefined') {
    return {
      hasCoarsePointer: false,
      hasNoHover: false,
      hasFinePointer: true,
      maxTouchPoints: 0,
      innerWidth: 1440,
    };
  }

  const match = (query: string) =>
    typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false;

  return {
    hasCoarsePointer: match('(pointer: coarse)'),
    hasNoHover: match('(hover: none)'),
    hasFinePointer: match('(pointer: fine)'),
    maxTouchPoints: typeof navigator !== 'undefined' ? navigator.maxTouchPoints ?? 0 : 0,
    innerWidth: window.innerWidth,
  };
}

/**
 * Isolamento estrito Desktop vs. Mobile/Touch:
 * - Mobile (<768px) e dispositivos prioritariamente touch (sem pointer fine)
 *   usam exclusivamente rolagem nativa do navegador (zero Lenis, dampers ou magnetismo).
 * - Desktop com mouse/trackpad (`(pointer: fine)` em largura >= 768px) mantém
 *   100% da física atual, inclusive em notebooks híbridos com tela touch.
 */
export function isNativeScrollOnly(caps?: ScrollEnvironmentCaps): boolean {
  const resolved = caps ?? readScrollEnvironmentCaps();
  if (resolved.innerWidth < 768) return true;
  if ((resolved.hasCoarsePointer || resolved.hasNoHover) && !resolved.hasFinePointer) {
    return true;
  }
  if (resolved.maxTouchPoints > 0 && !resolved.hasFinePointer) {
    return true;
  }
  return false;
}

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
  if (isNativeScrollOnly() || !activeLenis) {
    return window.scrollY;
  }
  return activeLenis.scroll;
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

  if (activeLenis && !isNativeScrollOnly()) {
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

  constructor(config: ProgressDamperConfig = HERO_TRAVERSAL_DAMPER_CONFIG) {
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
