import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CinematicProgressDamper,
  HERO_TRAVERSAL_DAMPER_CONFIG,
  TRAVERSAL_ACTIVE_START_PROGRESS,
  TRAVERSAL_HANDOFF_PROGRESS,
  canUnlockFreeNavigation,
  computeDeterministicTraversalProgress,
  computeMobileTraversalSpanPx,
  computeTraversalSpanPx,
  getEffectiveScrollY,
  getGlobalTraversalPhase,
  getGlobalTraversalSpanPx,
  isNativeScrollOnly,
  mapTraversalSpanToTimelineProgress,
  mapUnitProgressToTimeline,
  setGlobalTraversalPhase,
  setGlobalTraversalSpanPx,
  setLenisInstance,
  shouldAcceptMobileViewportHeightUpdate,
  subscribeTraversalPhase,
  supportsCssScrollTimeline,
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

test('supportsCssScrollTimeline detects browser capability accurately', () => {
  const originalWindow = (globalThis as { window?: unknown }).window;
  const originalCSS = (globalThis as { CSS?: unknown }).CSS;

  try {
    // Ambientes sem CSS ou sem window retornam false com segurança
    (globalThis as { window?: unknown }).window = undefined;
    (globalThis as { CSS?: unknown }).CSS = undefined;
    assert.equal(supportsCssScrollTimeline(), false);

    // Navegador antigo sem suporte a scroll-driven animations
    (globalThis as { window?: unknown }).window = {};
    (globalThis as { CSS?: unknown }).CSS = {
      supports: (prop: string, val: string) => false,
    };
    assert.equal(supportsCssScrollTimeline(), false);

    // Navegador moderno compatível com view() e timeline-scope (Chrome 115+)
    (globalThis as { CSS?: unknown }).CSS = {
      supports: (prop: string, val: string) => {
        if (prop === 'animation-timeline' && val === 'view()') return true;
        if (prop === 'timeline-scope' && val === '--test') return true;
        return false;
      },
    };
    assert.equal(supportsCssScrollTimeline(), true);
  } finally {
    (globalThis as { window?: unknown }).window = originalWindow;
    (globalThis as { CSS?: unknown }).CSS = originalCSS;
  }
});

test('sequential traversal mapping has zero initial dead zone and stops cleanly at handoff 0.72', () => {
  const mobileSpan = computeTraversalSpanPx({ stableViewportHeight: 780, isNative: true });
  const desktopSpan = computeTraversalSpanPx({ stableViewportHeight: 900, isNative: false });

  assert.ok(mobileSpan >= 580 && mobileSpan <= 960);
  assert.ok(desktopSpan >= 720 && desktopSpan <= 1140);

  // Rest at 0, immediate traversal active (> 0.10) on the very first pixel scrolled
  assert.equal(mapUnitProgressToTimeline(0), 0);
  assert.equal(mapTraversalSpanToTimelineProgress(0, mobileSpan), 0);

  const firstPixelP = mapTraversalSpanToTimelineProgress(1, mobileSpan);
  assert.ok(
    firstPixelP > TRAVERSAL_ACTIVE_START_PROGRESS,
    `Expected immediate progression above 0.10 on 1px scroll, got ${firstPixelP}`
  );

  const midP = mapUnitProgressToTimeline(0.5);
  assert.ok(Math.abs(midP - 0.41) < 1e-4);

  assert.equal(mapUnitProgressToTimeline(1), TRAVERSAL_HANDOFF_PROGRESS);
  assert.equal(mapTraversalSpanToTimelineProgress(mobileSpan + 400, mobileSpan), TRAVERSAL_HANDOFF_PROGRESS);
});

test('canUnlockFreeNavigation blocks residual touch or fling inertia until settled', () => {
  // Reveal incomplete
  assert.equal(
    canUnlockFreeNavigation({
      revealCompleted: false,
      touchActive: false,
      lastDownwardIntentTs: 0,
      lastScrollTs: 0,
      nowMs: 1000,
    }),
    false
  );

  // Touch still pressed
  assert.equal(
    canUnlockFreeNavigation({
      revealCompleted: true,
      touchActive: true,
      lastDownwardIntentTs: 0,
      lastScrollTs: 0,
      nowMs: 1000,
    }),
    false
  );

  // Recent wheel/fling tail (< 150ms)
  assert.equal(
    canUnlockFreeNavigation({
      revealCompleted: true,
      touchActive: false,
      lastDownwardIntentTs: 920,
      lastScrollTs: 920,
      nowMs: 1000,
    }),
    false
  );

  // Reveal complete + inertia settled (>= 150ms)
  assert.equal(
    canUnlockFreeNavigation({
      revealCompleted: true,
      touchActive: false,
      lastDownwardIntentTs: 800,
      lastScrollTs: 820,
      nowMs: 1000,
    }),
    true
  );
});

test('CinematicProgressDamper reverses immediately from current frame without forward overshoot', () => {
  const damper = new CinematicProgressDamper(HERO_TRAVERSAL_DAMPER_CONFIG);
  damper.setTarget(0.8);
  let prev = 0;
  for (let i = 0; i < 8; i++) {
    prev = damper.step(1 / 60);
  }
  assert.ok(prev > 0.1);

  // User reverses direction toward 0 mid-traversal
  damper.setTarget(0.05);
  const afterReverse = damper.step(1 / 60);
  assert.ok(afterReverse <= prev, `Expected immediate reversal (${afterReverse} <= ${prev})`);
});

test('global traversal phase and span listeners notify synchronously on state change', () => {
  const received: string[] = [];
  const unsub = subscribeTraversalPhase((p) => received.push(p));

  setGlobalTraversalPhase('traversal-active');
  assert.equal(getGlobalTraversalPhase(), 'traversal-active');

  setGlobalTraversalPhase('collections-reveal');
  assert.equal(getGlobalTraversalPhase(), 'collections-reveal');

  setGlobalTraversalPhase('free-navigation');
  assert.equal(getGlobalTraversalPhase(), 'free-navigation');

  assert.deepEqual(received, ['traversal-active', 'collections-reveal', 'free-navigation']);

  unsub();
  setGlobalTraversalPhase('hero-fixed');
  assert.equal(getGlobalTraversalPhase(), 'hero-fixed');
  assert.equal(received.length, 3); // no new events after unsub

  setGlobalTraversalSpanPx(920);
  assert.equal(getGlobalTraversalSpanPx(), 920);
});


