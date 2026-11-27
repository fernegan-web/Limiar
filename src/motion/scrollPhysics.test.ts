import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CinematicProgressDamper,
  HERO_TRAVERSAL_DAMPER_CONFIG,
  getEffectiveScrollY,
  isNativeScrollOnly,
  setLenisInstance,
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

  // Smartphone landscape (width >= 768, coarse pointer, no fine pointer)
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

  // Hybrid desktop/notebook with touchscreen + trackpad/mouse (`pointer: fine`)
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
