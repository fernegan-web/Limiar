import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeCollectionsReveal,
  computeElementCollapse,
  computeSingularityFrame,
  resolveOperationalState,
  resolveTraversalStage,
} from './gravitationalTimeline';

test('resolveTraversalStage maps all six choreography phases accurately', () => {
  assert.equal(resolveTraversalStage(0), 'repouso');
  assert.equal(resolveTraversalStage(0.09), 'repouso');
  assert.equal(resolveTraversalStage(0.15), 'despertar');
  assert.equal(resolveTraversalStage(0.42), 'colapso');
  assert.equal(resolveTraversalStage(0.62), 'horizonte');
  assert.equal(resolveTraversalStage(0.73), 'travessia');
  assert.equal(resolveTraversalStage(0.88), 'revelacao');
  assert.equal(resolveTraversalStage(1), 'revelacao');
});

test('resolveOperationalState transitions cleanly between rest, traversal, and inactive', () => {
  assert.equal(
    resolveOperationalState({
      progress: 0.04,
      inViewport: true,
      tabVisible: true,
    }),
    'rest'
  );
  assert.equal(
    resolveOperationalState({
      progress: 0.45,
      inViewport: true,
      tabVisible: true,
    }),
    'traversal'
  );
  assert.equal(
    resolveOperationalState({
      progress: 0.9,
      inViewport: true,
      tabVisible: true,
    }),
    'inactive'
  );
  assert.equal(
    resolveOperationalState({
      progress: 0.25,
      inViewport: false,
      tabVisible: true,
    }),
    'inactive'
  );
  assert.equal(
    resolveOperationalState({
      progress: 0.25,
      inViewport: true,
      tabVisible: false,
    }),
    'inactive'
  );
});

test('computeElementCollapse stays crisp in repouso and pulls toward singularity cleanly', () => {
  const rest = computeElementCollapse(0.05, {
    pullX: 240,
    pullY: 40,
    stretchFactor: 0.3,
    skewDeg: 8,
    rotateDeg: 6,
  });
  assert.equal(rest.opacity, 1);
  assert.equal(rest.blurPx, 0);
  assert.equal(rest.x, 0);
  assert.equal(rest.pointerInteractive, true);

  const mid = computeElementCollapse(0.45, {
    pullX: 240,
    pullY: 40,
    stretchFactor: 0.3,
    skewDeg: 8,
    rotateDeg: 6,
  });
  assert.ok(mid.x > 80);
  assert.ok(mid.scale < 0.9);
  assert.ok(mid.blurPx > 2);
  assert.equal(mid.pointerInteractive, false);

  const swallowed = computeElementCollapse(0.68, {
    pullX: 240,
    pullY: 40,
    stretchFactor: 0.3,
    skewDeg: 8,
    rotateDeg: 6,
  });
  assert.equal(swallowed.opacity, 0);
});

test('computeSingularityFrame reaches full darkness in travessia and opens smoothly for collections', () => {
  const travessia = computeSingularityFrame(0.71);
  assert.equal(travessia.stage, 'travessia');
  assert.ok(travessia.voidVeilOpacity > 0.9);
  assert.equal(travessia.heroVisibility, 0);

  const revelacao = computeSingularityFrame(0.98);
  assert.equal(revelacao.stage, 'revelacao');
  assert.equal(revelacao.voidVeilOpacity, 0);
  assert.equal(revelacao.postVoidReveal, 1);
});

test('computeCollectionsReveal reveals environment, header, cards sequentially, and final CTA', () => {
  const before = computeCollectionsReveal(0.65, 2);
  assert.equal(before.envOpacity, 0);
  assert.equal(before.cards[0].opacity, 0);
  assert.equal(before.interactive, false);

  const mid = computeCollectionsReveal(0.84, 2);
  assert.ok(mid.header.opacity > mid.cards[0].opacity);
  assert.ok(mid.cards[0].opacity > mid.cards[1].opacity);
  assert.equal(mid.interactive, true);

  const done = computeCollectionsReveal(1, 2);
  assert.equal(done.envOpacity, 1);
  assert.equal(done.header.opacity, 1);
  assert.equal(done.cards[0].opacity, 1);
  assert.equal(done.cards[1].opacity, 1);
  assert.equal(done.cta.opacity, 1);
  assert.equal(done.cta.blurPx, 0);
});

test('mobile mode disables CSS blur/3D perspective and bounds wreathScale while keeping desktop untouched', () => {
  const desktopMid = computeElementCollapse(
    0.45,
    { pullX: 0, pullY: 160, stretchFactor: 0.18, skewDeg: -4, rotateDeg: 2 },
    false
  );
  const mobileMid = computeElementCollapse(
    0.45,
    { pullX: 0, pullY: 160, stretchFactor: 0.18, skewDeg: -4, rotateDeg: 2 },
    true
  );
  assert.ok(desktopMid.blurPx > 2);
  assert.equal(mobileMid.blurPx, 0);
  assert.ok(mobileMid.scaleY > 1);
  assert.ok(mobileMid.scaleX < 1);

  const desktopFrame = computeSingularityFrame(0.65, false);
  const mobileFrame = computeSingularityFrame(0.65, true);
  assert.ok(desktopFrame.wreathScale > 10);
  assert.ok(desktopFrame.wreathBlurPx > 10);
  assert.ok(mobileFrame.wreathScale <= 5.4);
  assert.equal(mobileFrame.wreathBlurPx, 0);
  assert.equal(mobileFrame.wreathBlurBlend, 1);

  const mobileReveal = computeCollectionsReveal(0.82, 2, true);
  assert.equal(mobileReveal.header.blurPx, 0);
  assert.equal(mobileReveal.header.rotateXDeg, 0);
  assert.equal(mobileReveal.cards[0].blurPx, 0);
  assert.equal(mobileReveal.cards[0].rotateXDeg, 0);
  assert.equal(mobileReveal.cta.blurPx, 0);
});

