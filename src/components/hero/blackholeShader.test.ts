import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BLACKHOLE_FRAGMENT_SHADER,
  BLACKHOLE_VERTEX_SHADER,
} from './blackholeShader.ts';

test('BLACKHOLE_VERTEX_SHADER and BLACKHOLE_FRAGMENT_SHADER expose original 2-pass procedural pipeline', () => {
  assert.ok(BLACKHOLE_VERTEX_SHADER.includes('vUv = uv;'));
  assert.ok(BLACKHOLE_FRAGMENT_SHADER.includes('precision highp float;'));
  assert.ok(BLACKHOLE_FRAGMENT_SHADER.includes('uniform float uLayerPass;'));
  assert.ok(BLACKHOLE_FRAGMENT_SHADER.includes('if (uLayerPass > 0.5)'));
  assert.ok(BLACKHOLE_FRAGMENT_SHADER.includes('if (uLayerPass >= 0.0)'));
  assert.ok(BLACKHOLE_FRAGMENT_SHADER.includes('sampleFilaments'));
  assert.ok(BLACKHOLE_FRAGMENT_SHADER.includes('orbitalMicroParticles'));
  assert.ok(!BLACKHOLE_FRAGMENT_SHADER.includes('uNoiseLut'));
});
