import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CinematicProgressDamper,
  HERO_TRAVERSAL_DAMPER_CONFIG,
  computeDeterministicTraversalProgress,
  computeMobileTraversalSpanPx,
  getEffectiveScrollY,
  isNativeScrollOnly,
  setLenisInstance,
  shouldAcceptMobileViewportHeightUpdate,
} from './scrollPhysics';

test('isNativeScrollOnly isolates mobile and touch devices while preserving Desktop', () => {
  // Smartphone portrait
  assert.equal(
    isNativeScrollOnly({
      hasCoarsePointer: true,
      hasNoHover: true,
      hasFinePointer: false,
      maxTouchPoints: 5,
      innerWidth: 390,
    }),
    true
  );

  // Smartphone landscape (width >= 768, hover: none)
  assert.equal(
    isNativeScrollOnly({
      hasCoarsePointer: true,
      hasNoHover: true,
      hasFinePointer: false,
      maxTouchPoints: 5,
      innerWidth: 844,
    }),
    true
  );

  // Touch device in landscape reporting hover: none even with fine pointer quirk
  assert.equal(
    isNativeScrollOnly({
      hasCoarsePointer: true,
      hasNoHover: true,
      hasFinePointer: true,
      maxTouchPoints: 5,
      innerWidth: 844,
    }),
    true
  );

  // Tablet touch (iPad / Android tablet)
  assert.equal(
    isNativeScrollOnly({
      hasCoarsePointer: true,
      hasNoHover: true,
      hasFinePointer: false,
      maxTouchPoints: 5,
      innerWidth: 1024,
    }),
    true
  );

  // Narrow viewport (< 768) even in DevTools responsive resize with mouse
  assert.equal(
    isNativeScrollOnly({
      hasCoarsePointer: false,
      hasNoHover: false,
      hasFinePointer: true,
      maxTouchPoints: 0,
      innerWidth: 640,
    }),
    true
  );

  // Desktop standard (mouse/trackpad)
  assert.equal(
    isNativeScrollOnly({
      hasCoarsePointer: false,
      hasNoHover: false,
      hasFinePointer: true,
      maxTouchPoints: 0,
      innerWidth: 1440,
    }),
    false
  );

  // Hybrid desktop/notebook with touchscreen + trackpad/mouse (`pointer: fine` + hover)
  assert.equal(
    isNativeScrollOnly({
      hasCoarsePointer: false,
      hasNoHover: false,
      hasFinePointer: true,
      maxTouchPoints: 10,
      innerWidth: 1280,
    }),
    false
  );
});

test('CinematicProgressDamper.snap applies immediate 1:1 scrub and reverses cleanly with zero residual lag', () => {
  const damper = new CinematicProgressDamper(HERO_TRAVERSAL_DAMPER_CONFIG);

  assert.equal(damper.snap(0.42), 0.42);
  assert.equal(damper.getValue(), 0.42);
  assert.equal(damper.isSettled(), true);

  // Instant reversal to lower progress leaves no forward momentum
  assert.equal(damper.snap(0.18), 0.18);
  assert.equal(damper.getValue(), 0.18);
  assert.equal(damper.isSettled(), true);

  // Clamping out-of-range values
  assert.equal(damper.snap(-0.5), 0);
  assert.equal(damper.snap(1.4), 1);
});

test('CinematicProgressDamper.step continues to provide smooth inertial damping for Desktop', () => {
  const damper = new CinematicProgressDamper(HERO_TRAVERSAL_DAMPER_CONFIG);
  damper.setTarget(0.8);
  assert.equal(damper.isSettled(), false);

  const afterOneFrame = damper.step(1 / 60);
  assert.ok(afterOneFrame > 0 && afterOneFrame < 0.8);
  assert.equal(damper.isSettled(), false);
});

test('getEffectiveScrollY uses native window.scrollY on mobile even if a Lenis instance was registered', () => {
  const originalWindow = (globalThis as { window?: unknown }).window;

  try {
    (globalThis as { window?: unknown }).window = {
      scrollY: 312,
      innerWidth: 390,
      matchMedia: (q: string) => ({ matches: q === '(pointer: coarse)' || q === '(hover: none)' }),
    };

    setLenisInstance({ scroll: 120 } as unknown as Parameters<typeof setLenisInstance>[0]);
    assert.equal(getEffectiveScrollY(), 312);

    // Desktop with active Lenis uses Lenis scroll
    (globalThis as { window?: unknown }).window = {
      scrollY: 312,
      innerWidth: 1440,
      matchMedia: (q: string) => ({ matches: q === '(pointer: fine)' }),
    };
    assert.equal(getEffectiveScrollY(), 120);
  } finally {
    setLenisInstance(null);
    (globalThis as { window?: unknown }).window = originalWindow;
  }
});

test('mobile traversal progress maps 1:1 to real scrollY, clamps at spatial limit, and ignores Chrome Android URL bar jitter', () => {
  // Chrome Android address bar collapse/expand (same width, +84px height) is ignored
  assert.equal(shouldAcceptMobileViewportHeightUpdate(390, 760, 390, 844), false);
  // Real orientation change (width changes) is accepted
  assert.equal(shouldAcceptMobileViewportHeightUpdate(390, 760, 844, 390), true);

  // Portrait 390x780: sticky(780) + spacer(624) = 1404px collectionsOffsetPx
  const spanPx = computeMobileTraversalSpanPx({
    stableViewportHeight: 780,
    collectionsOffsetPx: 1404,
    maxReachableScrollPx: 3200,
  });
  assert.ok(spanPx > 0 && spanPx <= 1404);

  // Exact 1:1 deterministic mapping
  assert.equal(computeDeterministicTraversalProgress(0, spanPx), 0);
  assert.ok(
    Math.abs(computeDeterministicTraversalProgress(spanPx * 0.2, spanPx) - 0.2) < 1e-6
  );
  assert.ok(
    Math.abs(computeDeterministicTraversalProgress(spanPx * 0.9, spanPx) - 0.9) < 1e-6
  );
  // Spatial boundary clamp & past-boundary completion
  assert.equal(computeDeterministicTraversalProgress(spanPx, spanPx), 1);
  assert.equal(computeDeterministicTraversalProgress(spanPx + 950, spanPx), 1);
  // Instant reversal
  assert.ok(
    Math.abs(computeDeterministicTraversalProgress(spanPx * 0.45, spanPx) - 0.45) < 1e-6
  );
});
