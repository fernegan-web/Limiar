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
  if (resolved.hasNoHover) return true;
  if (resolved.hasCoarsePointer && !resolved.hasFinePointer) {
    return true;
  }
  if (resolved.maxTouchPoints > 0 && !resolved.hasFinePointer) {
    return true;
  }
  return false;
}

export function supportsCssScrollTimeline(): boolean {
  if (typeof window === 'undefined' || typeof CSS === 'undefined' || typeof CSS.supports !== 'function') {
    return false;
  }
  try {
    return (
      CSS.supports('animation-timeline', 'view()') &&
      CSS.supports('timeline-scope', '--test')
    );
  } catch {
    return false;
  }
}

export function supportsCssScrollDrivenAnimations(): boolean {
  return supportsCssScrollTimeline();
}

export interface MobileTraversalSpanInput {
  stableViewportHeight: number;
  collectionsOffsetPx: number;
  maxReachableScrollPx: number;
}

export function shouldAcceptMobileViewportHeightUpdate(
  prevWidth: number,
  prevHeight: number,
  nextWidth: number,
  nextHeight: number
): boolean {
  if (Math.abs(nextWidth - prevWidth) > 2) return true;
  // Ignora oscilações verticais causadas pela barra de endereço mobile (ex: Chrome Android ~56–130px)
  return Math.abs(nextHeight - prevHeight) > 160;
}

export type TraversalPhase =
  | 'hero-fixed'
  | 'traversal-active'
  | 'collections-reveal'
  | 'free-navigation';

export type TraversalPhaseListener = (phase: TraversalPhase) => void;

let currentTraversalPhase: TraversalPhase = 'hero-fixed';
let currentTraversalSpanPx = 0;
let currentTraversalReleaseScrollY = 0;
const traversalPhaseListeners = new Set<TraversalPhaseListener>();

export function setGlobalTraversalPhase(phase: TraversalPhase): void {
  if (currentTraversalPhase !== phase) {
    currentTraversalPhase = phase;
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.traversalPhase = phase;
    }
    traversalPhaseListeners.forEach((listener) => {
      listener(phase);
    });
  }
}

export function getGlobalTraversalPhase(): TraversalPhase {
  return currentTraversalPhase;
}

export function subscribeTraversalPhase(listener: TraversalPhaseListener): () => void {
  traversalPhaseListeners.add(listener);
  return () => {
    traversalPhaseListeners.delete(listener);
  };
}

export function setGlobalTraversalSpanPx(spanPx: number): void {
  currentTraversalSpanPx = spanPx;
}

export function getGlobalTraversalSpanPx(): number {
  if (currentTraversalSpanPx > 0) return currentTraversalSpanPx;
  if (typeof window !== 'undefined') {
    return computeTraversalSpanPx({
      stableViewportHeight: window.innerHeight,
      isNative: isNativeScrollOnly(),
    });
  }
  return 840;
}

export function setGlobalTraversalReleaseScrollY(targetScrollY: number): void {
  currentTraversalReleaseScrollY = targetScrollY;
}

export function getGlobalTraversalReleaseScrollY(): number {
  if (currentTraversalReleaseScrollY > 0) return currentTraversalReleaseScrollY;
  return getGlobalTraversalSpanPx();
}

export const TRAVERSAL_HANDOFF_PROGRESS = 0.72;
export const TRAVERSAL_ACTIVE_START_PROGRESS = 0.1;

export function computeTraversalSpanPx(params: {
  stableViewportHeight: number;
  isNative: boolean;
}): number {
  const safeVh = Math.max(params.stableViewportHeight, 320);
  if (params.isNative) {
    return Math.round(clamp(safeVh * 1.15, 580, 960));
  }
  return Math.round(clamp(safeVh * 1.25, 720, 1140));
}

export function mapUnitProgressToTimeline(unitProgress: number): number {
  const u = clamp(unitProgress, 0, 1);
  if (u <= 0) return 0;
  return Number(
    (
      TRAVERSAL_ACTIVE_START_PROGRESS +
      u * (TRAVERSAL_HANDOFF_PROGRESS - TRAVERSAL_ACTIVE_START_PROGRESS)
    ).toFixed(5)
  );
}

export function mapTraversalSpanToTimelineProgress(
  scrolledPastTopPx: number,
  effectiveSpanPx: number
): number {
  const u = computeDeterministicTraversalProgress(scrolledPastTopPx, effectiveSpanPx);
  return mapUnitProgressToTimeline(u);
}

export interface FreeNavigationUnlockInput {
  revealCompleted: boolean;
  touchActive: boolean;
  lastDownwardIntentTs: number;
  lastScrollTs: number;
  nowMs: number;
  settleMs?: number;
  isLenisMoving?: boolean;
}

export function canUnlockFreeNavigation({
  revealCompleted,
  touchActive,
  lastDownwardIntentTs,
  lastScrollTs,
  nowMs,
  settleMs = 150,
  isLenisMoving = false,
}: FreeNavigationUnlockInput): boolean {
  if (!revealCompleted || touchActive) return false;
  if (isLenisMoving) return false;
  if (nowMs - lastDownwardIntentTs < settleMs) return false;
  if (nowMs - lastScrollTs < settleMs) return false;
  return true;
}

export function computeMobileTraversalSpanPx({
  stableViewportHeight,
  collectionsOffsetPx,
  maxReachableScrollPx,
}: MobileTraversalSpanInput): number {
  const safeVh = Math.max(stableViewportHeight, 320);
  const baseSpanPx = safeVh * 1.76;
  const spatialLimitPx =
    collectionsOffsetPx > 0 ? collectionsOffsetPx : baseSpanPx;
  const reachableLimitPx =
    maxReachableScrollPx > 0 ? maxReachableScrollPx / 0.94 : baseSpanPx;
  const minFloorPx = Math.min(Math.max(320, safeVh * 1.2), spatialLimitPx);
  return Math.max(minFloorPx, Math.min(baseSpanPx, spatialLimitPx, reachableLimitPx));
}

export function computeDeterministicTraversalProgress(
  scrolledPastTopPx: number,
  effectiveSpanPx: number
): number {
  if (effectiveSpanPx <= 0) return 1;
  if (scrolledPastTopPx <= 0) return 0;
  if (scrolledPastTopPx >= effectiveSpanPx) return 1;
  return clamp(scrolledPastTopPx / effectiveSpanPx, 0, 1);
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
  stiffness: 42,
  damping: 13.5,
  maxSpeedPerSec: 1.55,
  softCatchupThreshold: 0.3,
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
    const dirToTarget = clamped - this.visualP;
    // Ao inverter a direção da rolagem, descarta imediatamente o momento residual no sentido oposto
    if (dirToTarget * this.velocityP < 0) {
      this.velocityP = 0;
    }
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
