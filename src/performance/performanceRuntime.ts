import { frameScheduler } from './frameScheduler';
import {
  AdaptivePerformanceGovernor,
  mapEngineLevelToBlackHoleTier,
} from './performanceGovernor';
import type {
  ActiveRenderMode,
  EngineQualityLevel,
  HardwareCapabilitySnapshot,
  PerformanceMetricsSnapshot,
  QualityOverrideMode,
} from './performanceTypes';

function getInitialSafeQuality(): { level: EngineQualityLevel; isMobile: boolean } {
  if (typeof window === 'undefined') {
    return { level: 'high', isMobile: false };
  }
  const isMobile = window.innerWidth < 768;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  if (reduced) return { level: 'low', isMobile };

  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : 8;
  const mem = typeof nav.deviceMemory === 'number' ? nav.deviceMemory : 8;
  if (cores <= 2 || mem <= 2) return { level: 'low', isMobile };
  if (isMobile && (cores <= 4 || mem <= 4)) return { level: 'medium', isMobile };
  return { level: isMobile ? 'high' : 'ultra', isMobile };
}

function supportsLongTaskObserver(): boolean {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') {
    return false;
  }
  const supported = (PerformanceObserver as typeof PerformanceObserver & {
    supportedEntryTypes?: string[];
  }).supportedEntryTypes;
  return Array.isArray(supported) ? supported.includes('longtask') : false;
}

const initialSeed = getInitialSafeQuality();

export const performanceGovernor = new AdaptivePerformanceGovernor(
  initialSeed.level,
  'Heurística inicial de viewport/hardware',
  {
    isMobile: initialSeed.isMobile,
    supportsLongTaskObserver: supportsLongTaskObserver(),
  }
);

let hardwareSnapshot: HardwareCapabilitySnapshot | null = null;
let runtimeInitialized = false;
let longTaskObserver: PerformanceObserver | null = null;
let activeWebglCount = 0;

function syncDocumentQualityAttribute(level: EngineQualityLevel): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.limiarQuality = level;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  document.documentElement.dataset.limiarMobile = isMobile ? 'true' : 'false';
}

export function initPerformanceRuntime(): void {
  if (runtimeInitialized || typeof window === 'undefined') return;
  runtimeInitialized = true;

  syncDocumentQualityAttribute(performanceGovernor.getActiveQuality());
  performanceGovernor.subscribe((evt) => {
    syncDocumentQualityAttribute(evt.activeQuality);
  });

  frameScheduler.setFrameSampleHook((dtMs, nowMs, tabVisible) => {
    performanceGovernor.setTelemetryContext({
      activeRafCount: frameScheduler.getActiveRafCount(),
    });
    performanceGovernor.recordFrame(dtMs, nowMs, tabVisible);
  });

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      performanceGovernor.markTabVisibility(document.visibilityState !== 'hidden');
    });
  }

  if (supportsLongTaskObserver()) {
    try {
      longTaskObserver = new PerformanceObserver((list) => {
        const count = list.getEntries().length;
        if (count > 0) {
          performanceGovernor.incrementLongTaskCount(count);
        }
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
    } catch {
      longTaskObserver = null;
    }
  }
}

export function isPerformanceDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('debug') === 'performance';
  } catch {
    return false;
  }
}

export function registerHardwareCapabilities(caps: HardwareCapabilitySnapshot): void {
  initPerformanceRuntime();
  hardwareSnapshot = caps;
  performanceGovernor.configureCapabilities(caps);
  syncDocumentQualityAttribute(performanceGovernor.getActiveQuality());
}

export function getHardwareCapabilities(): HardwareCapabilitySnapshot | null {
  return hardwareSnapshot;
}

export function trackWebglContextChange(delta: 1 | -1): void {
  activeWebglCount = Math.max(0, activeWebglCount + delta);
  performanceGovernor.setTelemetryContext({
    activeWebglContextCount: activeWebglCount,
  });
}

export function reportEngineTelemetry(patch: {
  activeRenderMode?: ActiveRenderMode;
  canvasWidthPx?: number;
  canvasHeightPx?: number;
  canvasPixelCount?: number;
  gpuFrameTimeMs?: number | null;
}): void {
  performanceGovernor.setTelemetryContext({
    activeRafCount: frameScheduler.getActiveRafCount(),
    activeWebglContextCount: activeWebglCount,
    activeRenderMode: patch.activeRenderMode,
    canvasWidthPx: patch.canvasWidthPx,
    canvasHeightPx: patch.canvasHeightPx,
    canvasPixelCount: patch.canvasPixelCount,
  });
  if (patch.gpuFrameTimeMs !== undefined) {
    performanceGovernor.setGpuFrameTimeMs(patch.gpuFrameTimeMs);
  }
}

export function getActiveEngineQuality(): EngineQualityLevel {
  return performanceGovernor.getActiveQuality();
}

export function getActiveBlackHoleTier() {
  return mapEngineLevelToBlackHoleTier(performanceGovernor.getActiveQuality());
}

export function shouldEnableDynamicBlur(): boolean {
  const level = performanceGovernor.getActiveQuality();
  if (level === 'ultra') return true;
  if (level === 'high') {
    return typeof window !== 'undefined' ? window.innerWidth >= 768 : true;
  }
  return false;
}

export function shouldEnableSvgWarp(): boolean {
  const level = performanceGovernor.getActiveQuality();
  if (level !== 'ultra') return false;
  return typeof window !== 'undefined' ? window.innerWidth >= 1024 : true;
}

export function setManualQualityOverride(mode: QualityOverrideMode): void {
  initPerformanceRuntime();
  performanceGovernor.setManualOverride(mode);
}

export function getPerformanceMetricsSnapshot(): PerformanceMetricsSnapshot {
  performanceGovernor.setTelemetryContext({
    activeRafCount: frameScheduler.getActiveRafCount(),
    activeWebglContextCount: activeWebglCount,
  });
  return performanceGovernor.getSnapshot();
}

export function formatQualityReportText(): string {
  const snap = getPerformanceMetricsSnapshot();
  const caps = getHardwareCapabilities();
  return JSON.stringify(
    {
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : null,
      metrics: snap,
      hardware: caps,
    },
    null,
    2
  );
}
