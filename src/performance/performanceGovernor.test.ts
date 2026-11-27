import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AdaptivePerformanceGovernor,
  computeScaledCanvasDimensions,
  inferInitialQualityLevel,
  mapEngineLevelToBlackHoleTier,
} from './performanceGovernor.ts';
import type { HardwareCapabilitySnapshot } from './performanceTypes.ts';

function makeCaps(overrides: Partial<HardwareCapabilitySnapshot> = {}): HardwareCapabilitySnapshot {
  return {
    webglSupported: true,
    webglVersion: 2,
    isSoftwareGl: false,
    glVendor: 'ARM',
    glRenderer: 'PowerVR Rogue GE8320',
    isMobile: true,
    hardwareConcurrency: 8,
    deviceMemoryGb: 4,
    viewportWidth: 360,
    viewportHeight: 800,
    dpr: 2,
    prefersReducedMotion: false,
    supportsLongTaskObserver: true,
    supportsGpuTimer: false,
    supportsBitmapRenderer: true,
    ...overrides,
  };
}

test('inferInitialQualityLevel detects Redmi 9 PowerVR GE8320 + 4GB RAM and starts in medium', () => {
  const result = inferInitialQualityLevel(makeCaps());
  assert.equal(result.level, 'medium');
});

test('inferInitialQualityLevel falls back to low on software WebGL or reduced motion', () => {
  assert.equal(inferInitialQualityLevel(makeCaps({ isSoftwareGl: true })).level, 'low');
  assert.equal(inferInitialQualityLevel(makeCaps({ prefersReducedMotion: true })).level, 'low');
  assert.equal(inferInitialQualityLevel(makeCaps({ webglSupported: false })).level, 'low');
});

test('inferInitialQualityLevel selects ultra on capable desktop', () => {
  const res = inferInitialQualityLevel(
    makeCaps({
      isMobile: false,
      glRenderer: 'ANGLE (NVIDIA GeForce RTX 3060)',
      hardwareConcurrency: 12,
      deviceMemoryGb: 16,
      viewportWidth: 1440,
      viewportHeight: 900,
    })
  );
  assert.equal(res.level, 'ultra');
});

test('computeScaledCanvasDimensions enforces mobile pixel budget and DSR bounds', () => {
  const med = computeScaledCanvasDimensions({
    cssWidth: 360,
    cssHeight: 273,
    deviceDpr: 3,
    level: 'medium',
    isMobile: true,
    dsrScale: 1.0,
  });
  assert.ok(med.pixelCount <= 185_000);
  assert.ok(med.width > 0 && med.height > 0);

  const dsrDown = computeScaledCanvasDimensions({
    cssWidth: 360,
    cssHeight: 273,
    deviceDpr: 2,
    level: 'medium',
    isMobile: true,
    dsrScale: 0.65,
  });
  assert.ok(dsrDown.pixelCount < med.pixelCount);

  const low = computeScaledCanvasDimensions({
    cssWidth: 360,
    cssHeight: 273,
    deviceDpr: 2,
    level: 'low',
    isMobile: true,
    dsrScale: 1,
  });
  assert.equal(low.pixelCount, 0);
});

test('AdaptivePerformanceGovernor computes real frame stats, drops DSR before level, and recovers conservatively', () => {
  const gov = new AdaptivePerformanceGovernor('high', 'test init', {
    isMobile: true,
    supportsLongTaskObserver: false,
    thresholds: {
      minSamplesForDowngrade: 6,
      minSamplesForUpgrade: 8,
      downgradeCooldownMs: 100,
      dsrCooldownMs: 100,
      upgradeCooldownMs: 100,
    },
  });

  // Preserve null for unsupported browser APIs (no fake/synthetic numbers)
  const initial = gov.getSnapshot();
  assert.equal(initial.longTaskCount, null);
  assert.equal(initial.gpuFrameTimeMs, null);
  assert.equal(initial.currentFps, null);

  // Feed slow frames (~28ms) while visible -> should reduce DSR first before dropping to medium
  let t = 1000;
  for (let i = 0; i < 6; i++) {
    t += 28;
    gov.recordFrame(28, t, true);
  }
  assert.equal(gov.getActiveQuality(), 'high');
  assert.ok(gov.getDsrScale() < 1.0);

  // Continue slow frames until DSR hits floor and downgrades to medium
  for (let i = 0; i < 30; i++) {
    t += 120;
    gov.recordFrame(34, t, true);
    if (gov.getActiveQuality() === 'medium') break;
  }
  assert.equal(gov.getActiveQuality(), 'medium');

  // Sustained smooth frames (12ms) should recover DSR first, then upgrade conservatively
  for (let i = 0; i < 24; i++) {
    t += 120;
    gov.recordFrame(12, t, true);
  }
  assert.equal(gov.getActiveQuality(), 'high');
});

test('AdaptivePerformanceGovernor ignores hidden tab resume grace frames and counts visible stalls >95ms', () => {
  const gov = new AdaptivePerformanceGovernor('medium', 'init', {
    isMobile: true,
    supportsLongTaskObserver: true,
  });

  gov.markTabVisibility(false);
  gov.recordFrame(400, 1000, false);
  // First 2 frames back from hidden tab are ignored (grace period)
  gov.recordFrame(220, 1250, true);
  gov.recordFrame(180, 1450, true);
  assert.equal(gov.getSnapshot().slowStallCount, 0);

  // Visible stall >95ms is counted as slowStallCount without adding fake FPS or instant downgrade
  gov.recordFrame(130, 1600, true);
  assert.equal(gov.getSnapshot().slowStallCount, 1);
  assert.equal(gov.getActiveQuality(), 'medium');
});

test('AdaptivePerformanceGovernor supports manual override and restoring auto mode', () => {
  const gov = new AdaptivePerformanceGovernor('medium', 'init', { isMobile: true });
  gov.configureCapabilities(makeCaps());

  gov.setManualOverride('emergency');
  assert.equal(gov.getActiveQuality(), 'emergency');
  assert.equal(mapEngineLevelToBlackHoleTier('emergency'), 'static');

  gov.setManualOverride('auto');
  assert.equal(gov.getActiveQuality(), 'medium');
  assert.equal(gov.getOverrideMode(), 'auto');
});
