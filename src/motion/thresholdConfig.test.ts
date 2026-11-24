import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HERO_PARALLAX_LAYERS,
  clamp,
  computeLayerTransform,
  computeMagneticPull,
  computeNormalizedPointer,
  computeParallaxOffset,
  computeScrollRatio,
} from './thresholdConfig';

test('clamp constrains values and guards NaN', () => {
  assert.equal(clamp(1.5, -1, 1), 1);
  assert.equal(clamp(-2, -1, 1), -1);
  assert.equal(clamp(0.4, -1, 1), 0.4);
  assert.equal(clamp(Number.NaN, -1, 1), -1);
});

test('computeNormalizedPointer maps viewport/container bounds accurately', () => {
  const rect = { left: 100, top: 50, width: 200, height: 100 };

  const center = computeNormalizedPointer(200, 100, rect);
  assert.deepEqual(center, { nx: 0, ny: 0, px: 100, py: 50 });

  const topLeft = computeNormalizedPointer(100, 50, rect);
  assert.deepEqual(topLeft, { nx: -1, ny: -1, px: 0, py: 0 });

  const clampedOutside = computeNormalizedPointer(500, 400, rect);
  assert.deepEqual(clampedOutside, { nx: 1, ny: 1, px: 200, py: 100 });
});

test('computeParallaxOffset and computeMagneticPull respect depth and bounds', () => {
  assert.deepEqual(computeParallaxOffset(0.5, -0.5, 12), { x: 6, y: -6 });
  assert.deepEqual(computeParallaxOffset(2, -2, -10), { x: -10, y: 10 });
  assert.deepEqual(computeMagneticPull(1, -1, 4), { x: 4, y: -4 });
  assert.deepEqual(computeMagneticPull(1, 1, -5), { x: 0, y: 0 });
});

test('computeLayerTransform produces distinct opposing and rotational vectors across the 3 hero layers', () => {
  const bh = computeLayerTransform(1, 1, HERO_PARALLAX_LAYERS.blackhole);
  const sigil = computeLayerTransform(1, 1, HERO_PARALLAX_LAYERS.cybersigilism);
  const model = computeLayerTransform(1, 1, HERO_PARALLAX_LAYERS.model);

  assert.equal(bh.x < 0 && bh.y < 0, true);
  assert.equal(model.x > sigil.x && sigil.x > 0, true);
  assert.equal(Math.abs(sigil.rotate) > 0 && Math.abs(sigil.rotate) <= 4, true);
  assert.equal(bh.rotate, 0);
  assert.equal(model.rotate, 0);
});

test('computeScrollRatio handles zero scrollable height and clamps progress', () => {
  assert.equal(computeScrollRatio(200, 0), 0);
  assert.equal(computeScrollRatio(500, 1000), 0.5);
  assert.equal(computeScrollRatio(1500, 1000), 1);
});
