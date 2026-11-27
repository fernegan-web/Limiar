import type { BlackHoleQualityTier } from '../motion/gravitationalTimeline';
import {
  ENGINE_QUALITY_ORDER,
  type ActiveRenderMode,
  type EngineQualityLevel,
  type HardwareCapabilitySnapshot,
  type PerformanceMetricsSnapshot,
  type QualityOverrideMode,
} from './performanceTypes';

const WEAK_MOBILE_GPU_REGEX =
  /PowerVR|GE8320|GE8300|GX6|SGX|Mali-4|Mali-T7|Mali-T8|Mali-G31|Mali-G52|Adreno\s*\(TM\)\s*[345]0\d|Adreno\s*\(TM\)\s*610|VideoCore/i;

const MID_MOBILE_GPU_REGEX =
  /Mali-G57|Mali-G68|Mali-G76|Adreno\s*\(TM\)\s*61[2-9]|Adreno\s*\(TM\)\s*62\d/i;

export interface PixelBudgetResult {
  dprCap: number;
  maxPixels: number;
  minDsrScale: number;
}

export function getQualityPixelBudget(
  level: EngineQualityLevel,
  isMobile: boolean
): PixelBudgetResult {
  switch (level) {
    case 'ultra':
      return {
        dprCap: isMobile ? 1.5 : 1.75,
        maxPixels: isMobile ? 640_000 : 2_100_000,
        minDsrScale: 0.72,
      };
    case 'high':
      return {
        dprCap: isMobile ? 1.25 : 1.5,
        maxPixels: isMobile ? 420_000 : 1_350_000,
        minDsrScale: 0.64,
      };
    case 'medium':
      return {
        dprCap: isMobile ? 1.0 : 1.25,
        maxPixels: isMobile ? 185_000 : 620_000,
        minDsrScale: 0.55,
      };
    case 'low':
    case 'emergency':
      return {
        dprCap: 1.0,
        maxPixels: 0,
        minDsrScale: 0.55,
      };
  }
}

export function computeScaledCanvasDimensions(params: {
  cssWidth: number;
  cssHeight: number;
  deviceDpr: number;
  level: EngineQualityLevel;
  isMobile: boolean;
  dsrScale: number;
}): { width: number; height: number; effectiveDpr: number; pixelCount: number } {
  const safeW = Math.max(2, Math.floor(params.cssWidth));
  const safeH = Math.max(2, Math.floor(params.cssHeight));
  const budget = getQualityPixelBudget(params.level, params.isMobile);

  if (budget.maxPixels <= 0) {
    return { width: 0, height: 0, effectiveDpr: 0, pixelCount: 0 };
  }

  const clampedDsr = Math.min(1, Math.max(budget.minDsrScale, params.dsrScale));
  let effectiveDpr = Math.min(Math.max(0.5, params.deviceDpr || 1), budget.dprCap) * clampedDsr;

  let width = Math.max(2, Math.round(safeW * effectiveDpr));
  let height = Math.max(2, Math.round(safeH * effectiveDpr));
  let pixelCount = width * height;

  if (pixelCount > budget.maxPixels) {
    const factor = Math.sqrt(budget.maxPixels / pixelCount);
    effectiveDpr *= factor;
    width = Math.max(2, Math.round(safeW * effectiveDpr));
    height = Math.max(2, Math.round(safeH * effectiveDpr));
    pixelCount = width * height;
  }

  return {
    width,
    height,
    effectiveDpr: Number(effectiveDpr.toFixed(3)),
    pixelCount,
  };
}

export function mapEngineLevelToBlackHoleTier(level: EngineQualityLevel): BlackHoleQualityTier {
  switch (level) {
    case 'ultra':
    case 'high':
      return 'high';
    case 'medium':
      return 'medium';
    case 'low':
      return 'low';
    case 'emergency':
      return 'static';
  }
}

export function inferInitialQualityLevel(caps: HardwareCapabilitySnapshot): {
  level: EngineQualityLevel;
  reason: string;
} {
  if (!caps.webglSupported) {
    return { level: 'low', reason: 'WebGL indisponível; modo híbrido pré-renderizado ativado.' };
  }
  if (caps.prefersReducedMotion) {
    return { level: 'low', reason: 'prefers-reduced-motion ativo; modo híbrido estável selecionado.' };
  }
  if (caps.isSoftwareGl) {
    return { level: 'low', reason: 'Renderizador WebGL por software detectado; modo híbrido ativado.' };
  }

  const renderer = caps.glRenderer ?? '';
  const cores = caps.hardwareConcurrency ?? 8;
  const mem = caps.deviceMemoryGb ?? 8;

  if (WEAK_MOBILE_GPU_REGEX.test(renderer)) {
    if (cores <= 2 || mem <= 2) {
      return {
        level: 'low',
        reason: `GPU mobile limitada (${renderer}) e hardware restrito; modo híbrido inicial.`,
      };
    }
    return {
      level: 'medium',
      reason: `GPU mobile tile-based de entrada detectada (${renderer}); iniciando em Médio com calibração adaptativa.`,
    };
  }

  if (cores <= 2 || mem <= 2) {
    return {
      level: 'low',
      reason: `Recursos restritos (${cores} núcleos / ${mem} GB RAM); iniciando em Baixo.`,
    };
  }

  if (caps.isMobile) {
    if (MID_MOBILE_GPU_REGEX.test(renderer) || cores <= 4 || mem <= 4) {
      return {
        level: 'medium',
        reason: `Dispositivo mobile (${cores} núcleos / ${mem} GB); iniciando em Médio.`,
      };
    }
    return {
      level: 'high',
      reason: 'Mobile intermediário/avançado detectado; iniciando em Alto (WebGL 1-pass + híbrido).',
    };
  }

  if (cores <= 3 || mem <= 3) {
    return {
      level: 'medium',
      reason: `Desktop de entrada (${cores} núcleos / ${mem} GB); iniciando em Médio.`,
    };
  }

  return {
    level: 'ultra',
    reason: 'Desktop capaz detectado; fidelidade Ultra habilitada.',
  };
}

export interface GovernorThresholds {
  windowSize: number;
  minSamplesForDowngrade: number;
  minSamplesForUpgrade: number;
  downgradeCooldownMs: number;
  dsrCooldownMs: number;
  upgradeCooldownMs: number;
  targetBudgetMs: number;
  severeP95Ms: number;
  upgradeMedianMs: number;
  upgradeP95Ms: number;
  stallThresholdMs: number;
}

export const DEFAULT_GOVERNOR_THRESHOLDS: GovernorThresholds = {
  windowSize: 90,
  minSamplesForDowngrade: 24,
  minSamplesForUpgrade: 75,
  downgradeCooldownMs: 2200,
  dsrCooldownMs: 1600,
  upgradeCooldownMs: 5500,
  targetBudgetMs: 20.5,
  severeP95Ms: 32.0,
  upgradeMedianMs: 14.8,
  upgradeP95Ms: 18.8,
  stallThresholdMs: 95,
};

function computeSortedStats(samples: readonly number[]): {
  avg: number | null;
  median: number | null;
  p95: number | null;
} {
  if (samples.length === 0) {
    return { avg: null, median: null, p95: null };
  }
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i];
  }
  const avg = sum / samples.length;
  const sorted = [...samples].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) * 0.5 : sorted[mid];
  const p95Idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
  const p95 = sorted[p95Idx];
  return {
    avg: Number(avg.toFixed(2)),
    median: Number(median.toFixed(2)),
    p95: Number(p95.toFixed(2)),
  };
}

export interface GovernorChangeEvent {
  activeQuality: EngineQualityLevel;
  dsrScale: number;
  reason: string;
}

export class AdaptivePerformanceGovernor {
  private readonly cfg: GovernorThresholds;
  private activeQuality: EngineQualityLevel;
  private initialCeiling: EngineQualityLevel;
  private overrideMode: QualityOverrideMode = 'auto';
  private dsrScale = 1.0;

  private readonly frameWindow: number[] = [];
  private framesOver16ms = 0;
  private framesOver33ms = 0;
  private slowStallCount = 0;
  private longTaskCount: number | null = null;
  private gpuFrameTimeMs: number | null = null;

  private activeRafCount = 0;
  private activeWebglContextCount = 0;
  private activeRenderMode: ActiveRenderMode = 'suspended';
  private canvasWidthPx = 0;
  private canvasHeightPx = 0;
  private canvasPixelCount = 0;

  private lastTransitionReason: string;
  private lastDowngradeMs = -Infinity;
  private lastDsrAdjustMs = -Infinity;
  private lastUpgradeMs = -Infinity;
  private wasTabHidden = false;
  private resumeGraceFrames = 0;
  private isMobile = false;

  private readonly listeners = new Set<(event: GovernorChangeEvent) => void>();

  constructor(
    initialLevel: EngineQualityLevel = 'high',
    initialReason = 'Calibração inicial',
    options?: {
      isMobile?: boolean;
      supportsLongTaskObserver?: boolean;
      thresholds?: Partial<GovernorThresholds>;
    }
  ) {
    this.activeQuality = initialLevel;
    this.initialCeiling = initialLevel;
    this.lastTransitionReason = initialReason;
    this.isMobile = options?.isMobile ?? false;
    this.longTaskCount = options?.supportsLongTaskObserver ? 0 : null;
    this.cfg = { ...DEFAULT_GOVERNOR_THRESHOLDS, ...(options?.thresholds ?? {}) };
  }

  public subscribe(listener: (event: GovernorChangeEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emitChange(): void {
    const evt: GovernorChangeEvent = {
      activeQuality: this.activeQuality,
      dsrScale: this.dsrScale,
      reason: this.lastTransitionReason,
    };
    this.listeners.forEach((fn) => fn(evt));
  }

  public configureCapabilities(caps: HardwareCapabilitySnapshot): void {
    this.isMobile = caps.isMobile;
    if (caps.supportsLongTaskObserver && this.longTaskCount === null) {
      this.longTaskCount = 0;
    }
    const inferred = inferInitialQualityLevel(caps);
    this.initialCeiling = inferred.level;
    if (this.overrideMode === 'auto') {
      this.activeQuality = inferred.level;
      this.dsrScale = 1.0;
      this.lastTransitionReason = inferred.reason;
      this.emitChange();
    }
  }

  public setManualOverride(mode: QualityOverrideMode): void {
    if (mode === this.overrideMode) return;
    this.overrideMode = mode;
    if (mode === 'auto') {
      this.activeQuality = this.initialCeiling;
      this.dsrScale = 1.0;
      this.lastTransitionReason = `Modo Automático reativado (teto ${this.initialCeiling}).`;
    } else {
      this.activeQuality = mode;
      this.dsrScale = 1.0;
      this.lastTransitionReason = `Override manual aplicado via HUD: ${mode}.`;
    }
    this.frameWindow.length = 0;
    this.emitChange();
  }

  public getActiveQuality(): EngineQualityLevel {
    return this.activeQuality;
  }

  public getOverrideMode(): QualityOverrideMode {
    return this.overrideMode;
  }

  public getDsrScale(): number {
    return this.dsrScale;
  }

  public incrementLongTaskCount(delta = 1): void {
    if (this.longTaskCount === null) this.longTaskCount = 0;
    this.longTaskCount += delta;
  }

  public setGpuFrameTimeMs(ms: number | null): void {
    this.gpuFrameTimeMs = ms !== null && Number.isFinite(ms) ? Number(ms.toFixed(2)) : null;
  }

  public setTelemetryContext(patch: {
    activeRafCount?: number;
    activeWebglContextCount?: number;
    activeRenderMode?: ActiveRenderMode;
    canvasWidthPx?: number;
    canvasHeightPx?: number;
    canvasPixelCount?: number;
  }): void {
    if (typeof patch.activeRafCount === 'number') this.activeRafCount = patch.activeRafCount;
    if (typeof patch.activeWebglContextCount === 'number') {
      this.activeWebglContextCount = patch.activeWebglContextCount;
    }
    if (patch.activeRenderMode) this.activeRenderMode = patch.activeRenderMode;
    if (typeof patch.canvasWidthPx === 'number') this.canvasWidthPx = patch.canvasWidthPx;
    if (typeof patch.canvasHeightPx === 'number') this.canvasHeightPx = patch.canvasHeightPx;
    if (typeof patch.canvasPixelCount === 'number') this.canvasPixelCount = patch.canvasPixelCount;
  }

  public markTabVisibility(visible: boolean): void {
    if (!visible) {
      this.wasTabHidden = true;
    } else if (this.wasTabHidden) {
      this.wasTabHidden = false;
      this.resumeGraceFrames = 2;
    }
  }

  public recordFrame(frameDurationMs: number, nowMs: number, tabVisible = true): void {
    if (!tabVisible) {
      this.markTabVisibility(false);
      return;
    }
    if (this.wasTabHidden) {
      this.markTabVisibility(true);
    }
    if (!Number.isFinite(frameDurationMs) || frameDurationMs <= 0) return;

    // Ignora exclusivamente os 2 primeiros quadros imediatamente após retorno de aba oculta
    if (this.resumeGraceFrames > 0) {
      this.resumeGraceFrames -= 1;
      return;
    }

    if (frameDurationMs > this.cfg.stallThresholdMs) {
      this.slowStallCount += 1;
      // Registra sem deixar um único pico isolado de hidratação disparar downgrade imediato
      return;
    }

    if (frameDurationMs > 16.67) this.framesOver16ms += 1;
    if (frameDurationMs > 33.33) this.framesOver33ms += 1;

    this.frameWindow.push(frameDurationMs);
    if (this.frameWindow.length > this.cfg.windowSize) {
      this.frameWindow.shift();
    }

    if (this.overrideMode !== 'auto') return;
    this.evaluateAdaptation(nowMs);
  }

  private evaluateAdaptation(nowMs: number): void {
    const n = this.frameWindow.length;
    if (n < this.cfg.minSamplesForDowngrade) return;

    const { median, p95 } = computeSortedStats(this.frameWindow);
    if (median === null || p95 === null) return;

    const isWebglLevel =
      this.activeQuality === 'ultra' ||
      this.activeQuality === 'high' ||
      this.activeQuality === 'medium';

    const breached = median > this.cfg.targetBudgetMs || p95 > this.cfg.severeP95Ms;

    if (breached) {
      const budget = getQualityPixelBudget(this.activeQuality, this.isMobile);

      // Passo 1: reduzir DSR antes de rebaixar um nível inteiro de shader/pipeline
      if (isWebglLevel && this.dsrScale > budget.minDsrScale + 0.02) {
        if (nowMs - this.lastDsrAdjustMs >= this.cfg.dsrCooldownMs) {
          const nextDsr = Math.max(budget.minDsrScale, Number((this.dsrScale - 0.14).toFixed(2)));
          if (nextDsr < this.dsrScale) {
            this.dsrScale = nextDsr;
            this.lastDsrAdjustMs = nowMs;
            this.lastTransitionReason = `DSR reduzido para ${Math.round(nextDsr * 100)}% (mediana ${median}ms, P95 ${p95}ms).`;
            this.frameWindow.length = 0;
            this.emitChange();
            return;
          }
        }
        return;
      }

      // Passo 2: downgrade gradual de nível com cooldown e histerese
      if (nowMs - this.lastDowngradeMs >= this.cfg.downgradeCooldownMs) {
        const idx = ENGINE_QUALITY_ORDER.indexOf(this.activeQuality);
        if (idx >= 0 && idx < ENGINE_QUALITY_ORDER.length - 1) {
          const nextLevel = ENGINE_QUALITY_ORDER[idx + 1];
          this.activeQuality = nextLevel;
          this.dsrScale = nextLevel === 'low' || nextLevel === 'emergency' ? 1.0 : 0.86;
          this.lastDowngradeMs = nowMs;
          this.lastDsrAdjustMs = nowMs;
          this.lastTransitionReason = `Downgrade ${ENGINE_QUALITY_ORDER[idx]} -> ${nextLevel} (mediana ${median}ms, P95 ${p95}ms).`;
          this.frameWindow.length = 0;
          this.emitChange();
          return;
        }
      }
      return;
    }

    // Passo 3: upgrade conservador quando houver folga sustentada
    if (
      n >= this.cfg.minSamplesForUpgrade &&
      median <= this.cfg.upgradeMedianMs &&
      p95 <= this.cfg.upgradeP95Ms
    ) {
      if (isWebglLevel && this.dsrScale < 0.99 && nowMs - this.lastDsrAdjustMs >= this.cfg.upgradeCooldownMs) {
        this.dsrScale = Math.min(1.0, Number((this.dsrScale + 0.12).toFixed(2)));
        this.lastDsrAdjustMs = nowMs;
        this.lastTransitionReason = `DSR elevado para ${Math.round(this.dsrScale * 100)}% por folga sustentada (${median}ms).`;
        this.frameWindow.length = 0;
        this.emitChange();
        return;
      }

      const currentIdx = ENGINE_QUALITY_ORDER.indexOf(this.activeQuality);
      const ceilingIdx = ENGINE_QUALITY_ORDER.indexOf(this.initialCeiling);
      // Permite promoção no máximo até o teto seguro do hardware (ou até 'high' no mobile se iniciou em 'medium' por cautela e sobrou GPU!)
      const maxAutoIdx = this.isMobile ? Math.max(1, ceilingIdx - 1) : ceilingIdx;
      if (
        currentIdx > maxAutoIdx &&
        nowMs - this.lastDowngradeMs >= this.cfg.upgradeCooldownMs &&
        nowMs - this.lastUpgradeMs >= this.cfg.upgradeCooldownMs
      ) {
        const nextLevel = ENGINE_QUALITY_ORDER[currentIdx - 1];
        this.activeQuality = nextLevel;
        this.dsrScale = 0.85;
        this.lastUpgradeMs = nowMs;
        this.lastDsrAdjustMs = nowMs;
        this.lastTransitionReason = `Upgrade ${ENGINE_QUALITY_ORDER[currentIdx]} -> ${nextLevel} (mediana ${median}ms, P95 ${p95}ms).`;
        this.frameWindow.length = 0;
        this.emitChange();
      }
    }
  }

  public getSnapshot(): PerformanceMetricsSnapshot {
    const stats = computeSortedStats(this.frameWindow);
    const currentFps =
      stats.median && stats.median > 0
        ? Number(Math.min(144, 1000 / stats.median).toFixed(1))
        : null;

    return {
      currentFps,
      avgFrameTimeMs: stats.avg,
      medianFrameTimeMs: stats.median,
      p95FrameTimeMs: stats.p95,
      framesOver16ms: this.framesOver16ms,
      framesOver33ms: this.framesOver33ms,
      slowStallCount: this.slowStallCount,
      longTaskCount: this.longTaskCount,
      gpuFrameTimeMs: this.gpuFrameTimeMs,
      activeQuality: this.activeQuality,
      overrideMode: this.overrideMode,
      dsrScale: Number(this.dsrScale.toFixed(2)),
      canvasWidthPx: this.canvasWidthPx,
      canvasHeightPx: this.canvasHeightPx,
      canvasPixelCount: this.canvasPixelCount,
      activeRafCount: this.activeRafCount,
      activeWebglContextCount: this.activeWebglContextCount,
      activeRenderMode: this.activeRenderMode,
      lastTransitionReason: this.lastTransitionReason,
      sampleCount: this.frameWindow.length,
    };
  }
}
