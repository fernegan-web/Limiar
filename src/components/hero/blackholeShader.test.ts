import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BLACKHOLE_FRAGMENT_SHADER,
  BLACKHOLE_FRAGMENT_SHADER_ORIGINAL,
  createBlackHoleFragmentShader,
  createNoiseLutBuffer,
} from './blackholeShader.ts';

test('BLACKHOLE_FRAGMENT_SHADER_ORIGINAL remains preserved intact for rollback', () => {
  assert.equal(BLACKHOLE_FRAGMENT_SHADER, BLACKHOLE_FRAGMENT_SHADER_ORIGINAL);
  assert.ok(BLACKHOLE_FRAGMENT_SHADER_ORIGINAL.includes('sampleFilaments'));
  assert.ok(BLACKHOLE_FRAGMENT_SHADER_ORIGINAL.includes('orbitalMicroParticles'));
});

test('createNoiseLutBuffer produces deterministic 256x256 RGBA non-empty tileable LUT', () => {
  const size = 256;
  const buf = createNoiseLutBuffer(size);
  assert.equal(buf.length, size * size * 4);
  let nonZero = 0;
  for (let i = 0; i < buf.length; i += 64) {
    if (buf[i] > 0) nonZero += 1;
  }
  assert.ok(nonZero > 100);
});

test('compiled shader variants implement expected tier optimizations and early-outs', () => {
  const ultra = createBlackHoleFragmentShader('ultra');
  const high = createBlackHoleFragmentShader('high');
  const medium = createBlackHoleFragmentShader('medium');

  for (const shader of [ultra, high, medium]) {
    assert.ok(shader.includes('if (radialBoundary <= 0.0001)'));
    assert.ok(shader.includes('if (r < horizon * 0.955 && undersideAlpha <= 0.001)'));
    assert.ok(shader.includes('if (normRGlobal > 3.6 && frontNormR > 4.1)'));
  }

  // Ultra keeps procedural 2-pass capability and full particle fields
  assert.ok(ultra.includes('precision highp float;'));
  assert.ok(ultra.includes('if (uLayerPass > 0.5)'));
  assert.ok(ultra.includes('orbitalMicroParticles'));

  // High uses uNoiseLut and single-pass rear rendering
  assert.ok(high.includes('texture2D(uNoiseLut'));
  assert.ok(!high.includes('if (uLayerPass > 0.5)'));

  // Medium uses mediump with highp spatial precision, uNoiseLut, and zero procedural particles
  assert.ok(medium.includes('precision mediump float;'));
  assert.ok(medium.includes('highp vec2 vUv;'));
  assert.ok(medium.includes('texture2D(uNoiseLut'));
  assert.ok(!medium.includes('orbitalMicroParticles'));
});
