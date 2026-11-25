import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeBlock01State,
  computeBlock02State,
  computeBlock03State,
  computeBlock04State,
  computeBlock05State,
  computeBlock06State,
} from './sobreTimeline';

test('Block 01 maintains full opacity and zero structural shift throughout contemplation [0.20..0.63]', () => {
  const sStart = computeBlock01State(0.22);
  const sMid = computeBlock01State(0.42);
  const sEnd = computeBlock01State(0.62);

  assert.equal(sStart.title.opacity, 1);
  assert.equal(sMid.title.opacity, 1);
  assert.equal(sEnd.title.opacity, 1);
  assert.equal(sMid.title.y, 0);
  assert.equal(sMid.photo.opacity, 1);
  assert.equal(sMid.photo.clipRightPercent, 0);
  assert.equal(sMid.panel.blurPx, 0);
  assert.equal(sMid.grafismo.blurPx, 0);
  assert.equal(sMid.grafismoSecondary.blurPx, 0);
  assert.equal(sMid.grafismo.opacity, 1);
  assert.equal(sMid.grafismoSecondary.opacity, 1);

  // Text exits earlier than photo in Block 01
  const sExit = computeBlock01State(0.78);
  assert.ok(sExit.photo.opacity > sExit.title.opacity);
});

test('Blocks 02–05 settle completely by 0.20, remain rock-solid across 0.20..0.65, and dissolve by 0.88', () => {
  const b2 = computeBlock02State(0.45);
  assert.equal(b2.textPanel.opacity, 1);
  assert.equal(b2.textPanel.x, 0);
  assert.equal(b2.grafismo.opacity, 1);
  assert.equal(b2.grafismoSecondary.opacity, 1);
  assert.equal(b2.grafismoSecondary.blurPx, 0);
  b2.photos.forEach((ph) => {
    assert.equal(ph.opacity, 1);
    assert.equal(ph.x, 0);
    assert.equal(ph.y, 0);
  });
  assert.equal(computeBlock02State(0.9).textPanel.opacity, 0);

  const b3 = computeBlock03State(0.45);
  assert.equal(b3.textPanel.opacity, 1);
  assert.equal(b3.grafismo.opacity, 1);
  assert.equal(b3.grafismoSecondary.opacity, 1);
  b3.photos.forEach((ph) => {
    assert.equal(ph.opacity, 1);
    assert.equal(ph.clipBottomPercent, 0);
  });
  assert.equal(computeBlock03State(0.92).textPanel.opacity, 0);

  const b4 = computeBlock04State(0.45);
  assert.equal(b4.textPanel.opacity, 1);
  assert.equal(b4.grafismo.opacity, 1);
  assert.equal(b4.grafismoSecondary.opacity, 1);
  b4.photos.forEach((ph) => {
    assert.equal(ph.opacity, 1);
    assert.equal(ph.clipInsetPercent, 0);
  });
  assert.equal(computeBlock04State(0.92).textPanel.opacity, 0);

  const b5 = computeBlock05State(0.45);
  assert.equal(b5.headerPanel.opacity, 1);
  assert.equal(b5.grafismo.opacity, 1);
  assert.equal(b5.grafismoSecondary.opacity, 1);
  b5.tees.forEach((t) => {
    assert.equal(t.opacity, 1);
    assert.equal(t.scale, 1);
  });
  b5.captions.forEach((c) => {
    assert.equal(c.opacity, 1);
  });
  assert.equal(computeBlock05State(0.92).headerPanel.opacity, 0);
});

test('Block 06 keeps collective composition stable in [0.20..0.55] and preserves interactive CTA at end [0.78..1.0]', () => {
  const collective = computeBlock06State(0.38);
  assert.equal(collective.collectivePanel.opacity, 1);
  collective.photos.forEach((ph) => assert.equal(ph.opacity, 1));
  assert.equal(collective.closingSignature.opacity, 0);
  assert.equal(collective.ctaInteractive, false);
  assert.ok(collective.grafismoLeft.opacity > 0.9);
  assert.ok(collective.grafismoRight.opacity > 0.7);
  assert.equal(collective.grafismoRight.blurPx, 0);

  const ending = computeBlock06State(0.85);
  assert.equal(ending.collectivePanel.opacity, 0);
  assert.equal(ending.closingSignature.opacity, 1);
  assert.equal(ending.closingSignature.y, 0);
  assert.equal(ending.ctaInteractive, true);
  assert.equal(ending.grafismoRight.opacity, 1);

  const atEnd = computeBlock06State(1.0);
  assert.equal(atEnd.closingSignature.opacity, 1);
  assert.equal(atEnd.ctaInteractive, true);
});
