import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INTRO_PORTAL_OPEN_MS,
  INTRO_TOTAL_DURATION_MS,
  computeIntroFrame,
} from './portalIntroTimeline';

test('computeIntroFrame sequences all 5 stages smoothly without discontinuities', () => {
  // 0ms — Despertar: logo starting blurred, portal still closed
  const t0 = computeIntroFrame(0);
  assert.equal(t0.portalOpened, false);
  assert.equal(t0.portalMaskActive, false);
  assert.equal(t0.logo.opacity, 0);
  assert.equal(t0.ring.opacity, 0);

  // 280ms — Logo emerging with decreasing blur
  const t280 = computeIntroFrame(280);
  assert.equal(t280.logo.opacity > 0.7, true);
  assert.equal(t280.logo.blurPx > 0, true);
  assert.equal(t280.ring.opacity > 0, true);

  // 800ms — Movimento: ring & filaments rotate in opposite directions, tribals visible
  const t800 = computeIntroFrame(800);
  const t1100 = computeIntroFrame(1100);
  assert.equal(t1100.ring.rotateDeg > t800.ring.rotateDeg, true);
  assert.equal(t1100.filaments.rotateDeg < t800.filaments.rotateDeg, true);
  assert.equal(t1100.tribals.opacity > 0.85, true);

  // 1360ms — Concentração: energy pulse peaks
  const t1360 = computeIntroFrame(1360);
  assert.equal(t1360.particles.pulseBoost > 0.85, true);
  assert.equal(t1360.energyGlowOpacity > 0.75, true);
  assert.equal(t1360.portalOpened, false);

  // 1650ms — Travessia: portal opening circularly while ring expands & logo fades out
  const t1650 = computeIntroFrame(1650);
  assert.equal(t1650.portalOpened, true);
  assert.equal(t1650.portalMaskActive, true);
  assert.equal(t1650.portalInnerVmax > 0 && t1650.portalInnerVmax < 86, true);
  assert.equal(t1650.ring.scale > 1.05, true);
  assert.equal(t1650.logo.opacity < 0.6, true);

  // 2050ms — Complete: portal fully clears viewport corners & elements fade out
  const tEnd = computeIntroFrame(INTRO_TOTAL_DURATION_MS);
  assert.equal(tEnd.finished, true);
  assert.equal(tEnd.portalInnerVmax >= 84, true);
  assert.equal(tEnd.logo.opacity, 0);
  assert.equal(tEnd.ring.opacity, 0);
  assert.equal(tEnd.filaments.opacity, 0);
  assert.equal(tEnd.tribals.opacity, 0);
  assert.equal(INTRO_PORTAL_OPEN_MS, 1480);
});
