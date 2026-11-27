export type BlackHoleShaderVariant = 'ultra' | 'high' | 'medium';

export const BLACKHOLE_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

function periodicHash(ix: number, iy: number, period: number, seed: number): number {
  const px = ((ix % period) + period) % period;
  const py = ((iy % period) + period) % period;
  let h = (px * 374761393 + py * 668265263 + seed * 1442695041) | 0;
  h = ((h ^ (h >> 13)) * 1274126177) | 0;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

function periodicValueNoise(
  u: number,
  v: number,
  freq: number,
  seed: number
): number {
  const x = u * freq;
  const y = v * freq;
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);

  const a = periodicHash(ix, iy, freq, seed);
  const b = periodicHash(ix + 1, iy, freq, seed);
  const c = periodicHash(ix, iy + 1, freq, seed);
  const d = periodicHash(ix + 1, iy + 1, freq, seed);

  const ab = a + (b - a) * ux;
  const cd = c + (d - c) * ux;
  return ab + (cd - ab) * uy;
}

/**
 * Gera uma textura RGBA tileable (256x256) com ruído e FBM multi-oitava
 * para substituir laços pesados de fbm() procedural no fragment shader.
 * Canal R: 1 oitava suave
 * Canal G: FBM 2 oitavas
 * Canal B: FBM 4 oitavas
 * Canal A: Turbulência decorrelacionada 3 oitavas
 */
export function createNoiseLutBuffer(size = 256): Uint8Array {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const n1 = periodicValueNoise(u, v, 8, 17);
      const n2 = periodicValueNoise(u, v, 16, 43);
      const n3 = periodicValueNoise(u, v, 32, 89);
      const n4 = periodicValueNoise(u, v, 64, 151);

      const oct1 = n1;
      const oct2 = (n1 * 0.6667 + n2 * 0.3333);
      const oct4 = (n1 * 0.5333 + n2 * 0.2667 + n3 * 0.1333 + n4 * 0.0667);

      const t1 = periodicValueNoise(u + 0.37, v + 0.61, 12, 211);
      const t2 = periodicValueNoise(u + 0.19, v + 0.83, 24, 307);
      const t3 = periodicValueNoise(u + 0.71, v + 0.29, 48, 401);
      const turb = t1 * 0.5714 + t2 * 0.2857 + t3 * 0.1429;

      const idx = (y * size + x) * 4;
      data[idx] = Math.min(255, Math.max(0, Math.round(oct1 * 255)));
      data[idx + 1] = Math.min(255, Math.max(0, Math.round(oct2 * 255)));
      data[idx + 2] = Math.min(255, Math.max(0, Math.round(oct4 * 255)));
      data[idx + 3] = Math.min(255, Math.max(0, Math.round(turb * 255)));
    }
  }
  return data;
}

/**
 * Shader original preservado integralmente para referência, comparação visual e rollback seguro.
 */
export const BLACKHOLE_FRAGMENT_SHADER_ORIGINAL = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uProgress;
  uniform float uHorizonRadius;
  uniform float uWarp;
  uniform vec2 uPointer;
  uniform float uLightMode;
  uniform float uComplexity;
  uniform float uLayerPass;

  #define PI 3.14159265359
  #define TAU 6.28318530718

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p, float detail) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.82, -0.57, 0.57, 0.82);
    for (int i = 0; i < 4; i++) {
      if (float(i) >= detail) break;
      v += a * valueNoise(p);
      p = rot * p * 2.08 + vec2(1.7, 9.2);
      a *= 0.5;
    }
    return v;
  }

  mat2 rot2(float a) {
    float c = cos(a);
    float s = sin(a);
    return mat2(c, -s, s, c);
  }

  void sampleFilaments(
    float rOrb,
    float angleOrb,
    float horizon,
    float spin,
    float warp,
    float octaves,
    out float energy,
    out float chromaMix
  ) {
    float normR = rOrb / max(horizon, 0.14);
    float logR = log(max(normR, 0.18));

    float a1 = angleOrb + logR * (3.4 + warp * 1.1) - spin * 0.72;
    float a2 = angleOrb * 2.0 + logR * (5.2 + warp * 1.5) - spin * 1.18;

    float turbLow = fbm(vec2(cos(a1) * 1.9 + normR * 1.6, sin(a1) * 1.9 - spin * 0.25), max(2.0, octaves - 1.0));
    float turbHigh = fbm(vec2(cos(a2) * 2.6 + normR * 3.4, sin(a2) * 2.6 - spin * 0.45), octaves);

    float rWarp = normR + (turbLow - 0.5) * (0.11 + warp * 0.04) + (turbHigh - 0.5) * 0.042;

    float sFine = pow(max(0.0001, sin(rWarp * 36.0 - spin * 1.15 + turbHigh * 2.6)), 4.2);
    float sMid = pow(max(0.0001, sin(rWarp * 18.5 - spin * 0.72 + turbLow * 2.8)), 3.2);
    float sBroad = pow(max(0.0001, sin(rWarp * 9.2 - spin * 0.42 + turbLow * 1.8)), 2.4);

    float arcDense = smoothstep(
      0.24,
      0.80,
      fbm(vec2(cos(a1) * 2.2 + normR * 2.4, sin(a1) * 2.2 + normR * 1.6), octaves)
    );
    float arcFine = smoothstep(
      0.20,
      0.78,
      fbm(vec2(cos(a2) * 1.8 - spin * 0.3, sin(a2) * 1.8 + normR * 3.1), max(2.0, octaves - 1.0))
    );

    energy =
      sFine * (0.42 + 0.58 * arcFine) * 0.82 +
      sMid * (0.34 + 0.66 * arcDense) * 0.88 +
      sBroad * arcDense * 0.44;

    float orbitWave = 0.5 + 0.5 * sin(rWarp * 7.6 + turbLow * 3.8 - spin * 0.22);
    chromaMix = smoothstep(0.24, 0.76, orbitWave * 0.7 + arcFine * 0.3);
  }

  float orbitalMicroParticles(
    float normR,
    float angleOrb,
    float angCells,
    float radCells,
    float spinSpeed,
    float trailStretch,
    float seedShift,
    out float pChroma
  ) {
    float logR = log(max(normR, 0.18));
    float u = fract((angleOrb + logR * 1.8 - spinSpeed) / TAU) * angCells;
    float v = normR * radCells;

    vec2 cell = floor(vec2(u, v));
    vec2 f = fract(vec2(u, v));

    vec2 rnd = hash22(cell + seedShift);
    pChroma = rnd.y;

    float exists = step(0.62, hash21(cell * 1.37 + seedShift));
    vec2 center = vec2(0.32 + 0.36 * rnd.x, 0.25 + 0.50 * rnd.y);
    vec2 delta = f - center;

    float safeStretch = clamp(trailStretch, 1.0, 1.65);
    float dist = length(vec2(delta.x / safeStretch, delta.y * 1.18));
    float radius = mix(0.05, 0.115, hash21(cell + seedShift * 2.1));

    float core = pow(max(0.0001, 1.0 - dist / radius), 3.4);
    float microGlow = exp(-dist * 15.0) * 0.26 * smoothstep(0.22, 0.04, dist);
    return exists * (core + microGlow);
  }

  void main() {
    vec2 uv = (vUv - 0.5) * 2.0;
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    uv.x *= aspect;

    vec2 p = uv;

    float horizon = clamp(uHorizonRadius, 0.14, 1.65);
    float octaves = mix(2.0, 4.0, clamp(uComplexity, 0.0, 1.0));
    float spin = uTime * (0.34 + uWarp * 0.26);

    float tiltAngle = -0.22 + uPointer.y * 0.035;
    vec2 q = rot2(tiltAngle) * p;

    vec3 colorAcid = vec3(0.643, 0.780, 0.353);
    vec3 colorUv = vec3(0.631, 0.541, 0.784);
    vec3 coreWhite = vec3(0.97, 0.965, 0.94);
    vec3 acidTone = colorAcid;
    vec3 uvTone = colorUv;

    float radialBoundary = 1.0 - smoothstep(0.74, 0.992, length(vUv - 0.5) * 2.0);

    vec2 frontPlane = q;
    vec2 frontEllip = vec2(frontPlane.x * 0.68, frontPlane.y * 3.85);
    float frontR = length(frontEllip);
    float frontNormR = frontR / horizon;
    float frontAngle = atan(frontEllip.y, frontEllip.x);
    float frontSideMask = smoothstep(0.05 * horizon, -0.045 * horizon, frontPlane.y);

    if (uLayerPass > 0.5) {
      if (frontSideMask <= 0.0001 || frontNormR <= 0.97 || frontNormR >= 4.2 || radialBoundary <= 0.0001) {
        gl_FragColor = vec4(0.0);
        return;
      }

      float frontFilEnergy = 0.0;
      float frontChromaMix = 0.5;
      sampleFilaments(frontR, frontAngle, horizon, spin * 1.15, uWarp, octaves, frontFilEnergy, frontChromaMix);

      float frontBrightEnv =
        smoothstep(0.98, 1.05, frontNormR) *
        exp(-pow(max(frontNormR - 1.22, 0.0001) / 0.42, 1.75));
      float frontDoppler = 0.82 + 0.32 * cos(frontAngle - 0.45);
      float frontStream = frontFilEnergy * frontBrightEnv * frontDoppler * frontSideMask * 1.38;

      float fgPChroma = 0.5;
      float fgParticles = 0.0;
      if (uComplexity > 0.4) {
        fgParticles =
          orbitalMicroParticles(frontNormR, frontAngle, 40.0, 16.0, spin * 1.15, 1.6, 73.1, fgPChroma) *
          frontSideMask *
          frontBrightEnv *
          0.95;
      }

      vec3 frontHue = mix(uvTone, acidTone, frontChromaMix);
      float wfStream = frontStream * 1.15;
      float wfPart = fgParticles * 1.15;
      float wfSum = wfStream + wfPart;

      vec3 frontMixColor = (
        frontHue * wfStream +
        mix(acidTone, uvTone, fgPChroma) * wfPart
      ) / max(wfSum, 0.0001);

      float frontPeak = pow(clamp(wfSum * 0.65, 0.0001, 1.0), 2.25);
      vec3 frontFinal = mix(frontMixColor, coreWhite, frontPeak * 0.80);
      float frontLumAlpha = clamp(frontStream * 0.98 + fgParticles * 0.92, 0.0, 1.0);

      gl_FragColor = vec4(frontFinal, clamp(frontLumAlpha * radialBoundary, 0.0, 1.0));
      return;
    }

    float r = length(p);
    float angle = atan(p.y, p.x);
    float normRGlobal = r / horizon;

    float yNorm = q.y / horizon;
    float equatorBand = exp(-(yNorm * yNorm) / (0.36 + 0.14 * normRGlobal));
    float radialOut = smoothstep(0.95, 2.35, normRGlobal);
    float wingBlend = equatorBand * radialOut;

    float yAsym = mix(1.16, 1.03, smoothstep(-0.35, 0.35, yNorm));
    float xScale = mix(1.0, 0.70, wingBlend);
    float yScale = mix(yAsym, 3.65, wingBlend);

    vec2 rearCoord = vec2(q.x * xScale, q.y * yScale);
    float rearR = length(rearCoord);
    float rearNormR = rearR / horizon;
    float rearAngle = atan(rearCoord.y, rearCoord.x);

    float rearFilEnergy = 0.0;
    float rearChromaMix = 0.5;
    sampleFilaments(rearR, rearAngle, horizon, spin, uWarp, octaves, rearFilEnergy, rearChromaMix);

    float rearEnvelope =
      smoothstep(0.98, 1.055, rearNormR) *
      exp(-pow(max(rearNormR - 1.22, 0.0001) / 0.58, 1.72));
    float lowerSecondaryGain = mix(0.76, 1.0, smoothstep(-0.32 * horizon, 0.14 * horizon, q.y));
    float rearDoppler = 0.78 + 0.34 * cos(rearAngle - 0.45);
    float rearEnergy = rearFilEnergy * rearEnvelope * lowerSecondaryGain * rearDoppler * 1.28;

    float innerRingEnv =
      smoothstep(0.992, 1.022, normRGlobal) *
      exp(-pow((normRGlobal - 1.11) / 0.105, 2.0));
    float innerAngle = angle + log(max(normRGlobal, 0.2)) * 2.4 - spin * 1.25;
    float innerStreak = fbm(vec2(cos(innerAngle) * 2.8, sin(innerAngle) * 2.8 + normRGlobal * 6.0), octaves);
    float innerThreads = pow(max(0.0001, sin(normRGlobal * 54.0 - spin * 1.35 + innerStreak * 2.4)), 3.6);
    float innerLensedGlow = innerRingEnv * (0.28 + 0.85 * innerThreads) * (0.62 + 0.38 * innerStreak);

    float photonDist = abs(r - horizon * 1.012);
    float photonRing =
      exp(-photonDist / max(horizon * 0.014, 0.0035)) *
      (0.86 + 0.24 * sin(angle * 3.0 - spin * 1.4));

    float bgPChroma = 0.5;
    float midPChroma = 0.5;

    float bgParticles =
      orbitalMicroParticles(normRGlobal, angle, 56.0, 20.0, spin * 0.32, 1.0, 11.3, bgPChroma) *
      smoothstep(1.06, 1.28, normRGlobal) *
      exp(-max(normRGlobal - 1.35, 0.0) * 1.1) *
      0.72;

    float midParticles =
      orbitalMicroParticles(rearNormR, rearAngle, 44.0, 18.0, spin * 0.85, 1.55, 37.7, midPChroma) *
      rearEnvelope *
      0.85;

    vec3 rearHue = mix(uvTone, acidTone, rearChromaMix);
    vec3 innerHue = mix(uvTone, acidTone, 0.20 + 0.24 * innerStreak);
    vec3 bgPartColor = mix(acidTone, uvTone, bgPChroma);
    vec3 midPartColor = mix(uvTone, acidTone, midPChroma);

    float wRear = rearEnergy * 1.05;
    float wInner = innerLensedGlow * 1.15;
    float wPhoton = photonRing * 1.0;
    float wBgP = bgParticles * 1.1;
    float wMidP = midParticles * 1.1;
    float wSum = wRear + wInner + wPhoton + wBgP + wMidP;

    vec3 rearMixColor = (
      rearHue * wRear +
      innerHue * wInner +
      mix(uvTone, coreWhite, 0.72) * wPhoton +
      bgPartColor * wBgP +
      midPartColor * wMidP
    ) / max(wSum, 0.0001);

    float rearPeak = pow(clamp(wSum * 0.62, 0.0001, 1.0), 2.3);
    vec3 rearFinal = mix(rearMixColor, coreWhite, rearPeak * 0.78);

    float rearLumAlpha = clamp(
      rearEnergy * 0.95 + innerLensedGlow * 0.92 + photonRing * 0.96 + bgParticles * 0.88 + midParticles * 0.88,
      0.0,
      1.0
    );

    float shadowMask = 1.0 - smoothstep(horizon * 0.965, horizon * 1.008, r);
    vec3 horizonCore = vec3(0.006, 0.006, 0.009);

    vec3 baseColor = mix(rearFinal, horizonCore, shadowMask);
    float baseAlpha = max(rearLumAlpha, shadowMask);

    float frontBodyMask =
      frontSideMask *
      smoothstep(1.30, 1.44, frontNormR) *
      (1.0 - smoothstep(1.82, 2.02, frontNormR));
    float undersideAlpha = frontBodyMask * 0.92 * (1.0 - uLightMode);

    float frontFilEnergy = 0.0;
    float frontChromaMix = 0.5;
    float frontBrightEnv = 0.0;
    float frontStream = 0.0;

    if (uLayerPass < 0.0 || undersideAlpha > 0.001) {
      sampleFilaments(frontR, frontAngle, horizon, spin * 1.15, uWarp, octaves, frontFilEnergy, frontChromaMix);
      frontBrightEnv =
        smoothstep(0.98, 1.05, frontNormR) *
        exp(-pow(max(frontNormR - 1.22, 0.0001) / 0.42, 1.75));
      float frontDoppler = 0.82 + 0.32 * cos(frontAngle - 0.45);
      frontStream = frontFilEnergy * frontBrightEnv * frontDoppler * frontSideMask * 1.38;

      float undersideThreads = pow(max(0.0001, sin(frontNormR * 44.0 - spin * 0.9 + frontFilEnergy * 2.0)), 3.2);
      float frontUndersideGlow = frontBodyMask * undersideThreads * 0.32;

      vec3 undersideBase = mix(
        vec3(0.022, 0.020, 0.030),
        mix(uvTone, acidTone, frontChromaMix) * 0.55,
        clamp(frontUndersideGlow * 2.2, 0.0, 1.0)
      );
      baseColor = mix(baseColor, undersideBase, undersideAlpha * (1.0 - clamp(frontStream * 1.2, 0.0, 1.0)));
      baseAlpha = max(baseAlpha, undersideAlpha);
    }

    float engulfBoost = smoothstep(0.55, 0.68, uProgress);

    if (uLayerPass >= 0.0) {
      float rearOnlyAlpha = max(baseAlpha * radialBoundary, shadowMask * engulfBoost);
      gl_FragColor = vec4(baseColor, clamp(rearOnlyAlpha, 0.0, 1.0));
      return;
    }

    float fgPChroma = 0.5;
    float fgParticles = 0.0;
    if (uComplexity > 0.4) {
      fgParticles =
        orbitalMicroParticles(frontNormR, frontAngle, 40.0, 16.0, spin * 1.15, 1.6, 73.1, fgPChroma) *
        frontSideMask *
        frontBrightEnv *
        0.95;
    }

    vec3 frontHue = mix(uvTone, acidTone, frontChromaMix);
    float wfStream = frontStream * 1.15;
    float wfPart = fgParticles * 1.15;
    float wfSum = wfStream + wfPart;

    vec3 frontMixColor = (
      frontHue * wfStream +
      mix(acidTone, uvTone, fgPChroma) * wfPart
    ) / max(wfSum, 0.0001);

    float frontPeak = pow(clamp(wfSum * 0.65, 0.0001, 1.0), 2.25);
    vec3 frontFinal = mix(frontMixColor, coreWhite, frontPeak * 0.80);

    float frontLumAlpha = clamp(frontStream * 0.98 + fgParticles * 0.92, 0.0, 1.0);
    vec3 finalColor = mix(baseColor, frontFinal, frontLumAlpha);
    float totalAlpha = max(baseAlpha, frontLumAlpha);

    float alpha = max(totalAlpha * radialBoundary, shadowMask * engulfBoost);
    gl_FragColor = vec4(finalColor, clamp(alpha, 0.0, 1.0));
  }
`;

export const BLACKHOLE_FRAGMENT_SHADER = BLACKHOLE_FRAGMENT_SHADER_ORIGINAL;

/**
 * Compila variantes especializadas do fragment shader por nível de qualidade:
 * - 'ultra': shader completo com early-out no núcleo do horizonte e borda externa.
 * - 'high': passagem única traseira + horizonte usando uNoiseLut (zero fbm loop) e micro-partículas enxutas.
 * - 'medium': shader mobile otimizado para TBDR/PowerVR (mediump seguro com coords highp, 100% LUT, zero partículas no shader, early-out agressivo).
 */
export function createBlackHoleFragmentShader(variant: BlackHoleShaderVariant): string {
  const isMedium = variant === 'medium';
  const isUltra = variant === 'ultra';
  const useLut = !isUltra;
  const includeParticles = isUltra || variant === 'high';
  const supportsTwoPass = isUltra;

  return /* glsl */ `
  ${isMedium ? 'precision mediump float;' : 'precision highp float;'}

  varying highp vec2 vUv;

  uniform highp float uTime;
  uniform highp vec2 uResolution;
  uniform highp float uProgress;
  uniform highp float uHorizonRadius;
  uniform highp float uWarp;
  uniform highp vec2 uPointer;
  uniform float uLightMode;
  uniform float uComplexity;
  uniform float uLayerPass;
  uniform sampler2D uNoiseLut;

  #define PI 3.14159265359
  #define TAU 6.28318530718

  float fastPow2(float x) {
    return x * x;
  }

  float fastPow3(float x) {
    return x * x * x;
  }

  float fastPow4(float x) {
    float x2 = x * x;
    return x2 * x2;
  }

  ${
    useLut
      ? `
  float fbm2(vec2 p) {
    return texture2D(uNoiseLut, p * 0.088).g;
  }

  float fbm4(vec2 p) {
    return texture2D(uNoiseLut, p * 0.078).b;
  }

  float fbmTurb(vec2 p) {
    return texture2D(uNoiseLut, p * 0.095).a;
  }
  `
      : `
  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm2(vec2 p) {
    mat2 rot = mat2(0.82, -0.57, 0.57, 0.82);
    float v = 0.5 * valueNoise(p);
    p = rot * p * 2.08 + vec2(1.7, 9.2);
    v += 0.25 * valueNoise(p);
    return v * 1.3333;
  }

  float fbm4(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.82, -0.57, 0.57, 0.82);
    for (int i = 0; i < 4; i++) {
      v += a * valueNoise(p);
      p = rot * p * 2.08 + vec2(1.7, 9.2);
      a *= 0.5;
    }
    return v;
  }
  `
  }

  ${
    includeParticles
      ? `
  float hash21Part(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
  }

  float orbitalMicroParticles(
    highp float normR,
    highp float angleOrb,
    float angCells,
    float radCells,
    highp float spinSpeed,
    float trailStretch,
    float seedShift,
    out float pChroma
  ) {
    highp float logR = log(max(normR, 0.18));
    highp float u = fract((angleOrb + logR * 1.8 - spinSpeed) / TAU) * angCells;
    highp float v = normR * radCells;

    vec2 cell = floor(vec2(u, v));
    vec2 f = fract(vec2(u, v));

    vec2 rnd = hash22(cell + seedShift);
    pChroma = rnd.y;

    float exists = step(0.62, hash21Part(cell * 1.37 + seedShift));
    if (exists < 0.5) return 0.0;

    vec2 center = vec2(0.32 + 0.36 * rnd.x, 0.25 + 0.50 * rnd.y);
    vec2 delta = f - center;

    float safeStretch = clamp(trailStretch, 1.0, 1.65);
    float dist = length(vec2(delta.x / safeStretch, delta.y * 1.18));
    float radius = mix(0.05, 0.115, hash21Part(cell + seedShift * 2.1));

    float core = fastPow3(max(0.0, 1.0 - dist / radius));
    float microGlow = exp(-dist * 15.0) * 0.26 * smoothstep(0.22, 0.04, dist);
    return core + microGlow;
  }
  `
      : ''
  }

  mat2 rot2(highp float a) {
    highp float c = cos(a);
    highp float s = sin(a);
    return mat2(c, -s, s, c);
  }

  void sampleFilaments(
    highp float rOrb,
    highp float angleOrb,
    highp float horizon,
    highp float spin,
    highp float warp,
    out float energy,
    out float chromaMix
  ) {
    highp float normR = rOrb / max(horizon, 0.14);
    highp float logR = log(max(normR, 0.18));

    highp float a1 = angleOrb + logR * (3.4 + warp * 1.1) - spin * 0.72;
    highp float a2 = angleOrb * 2.0 + logR * (5.2 + warp * 1.5) - spin * 1.18;

    float c1 = cos(a1);
    float s1 = sin(a1);
    float c2 = cos(a2);
    float s2 = sin(a2);

    float turbLow = fbm2(vec2(c1 * 1.9 + normR * 1.6, s1 * 1.9 - spin * 0.25));
    float turbHigh = fbm4(vec2(c2 * 2.6 + normR * 3.4, s2 * 2.6 - spin * 0.45));

    float rWarp = normR + (turbLow - 0.5) * (0.11 + warp * 0.04) + (turbHigh - 0.5) * 0.042;

    float sFine = fastPow4(max(0.0, sin(rWarp * 36.0 - spin * 1.15 + turbHigh * 2.6)));
    float sMid = fastPow3(max(0.0, sin(rWarp * 18.5 - spin * 0.72 + turbLow * 2.8)));
    float sBroad = fastPow2(max(0.0, sin(rWarp * 9.2 - spin * 0.42 + turbLow * 1.8)));

    ${
      useLut
        ? `
    float arcDense = smoothstep(0.24, 0.80, fbmTurb(vec2(c1 * 2.2 + normR * 2.4, s1 * 2.2 + normR * 1.6)));
    float arcFine = smoothstep(0.20, 0.78, fbm2(vec2(c2 * 1.8 - spin * 0.3, s2 * 1.8 + normR * 3.1)));
    `
        : `
    float arcDense = smoothstep(0.24, 0.80, fbm4(vec2(c1 * 2.2 + normR * 2.4, s1 * 2.2 + normR * 1.6)));
    float arcFine = smoothstep(0.20, 0.78, fbm2(vec2(c2 * 1.8 - spin * 0.3, s2 * 1.8 + normR * 3.1)));
    `
    }

    energy =
      sFine * (0.42 + 0.58 * arcFine) * 0.82 +
      sMid * (0.34 + 0.66 * arcDense) * 0.88 +
      sBroad * arcDense * 0.44;

    float orbitWave = 0.5 + 0.5 * sin(rWarp * 7.6 + turbLow * 3.8 - spin * 0.22);
    chromaMix = smoothstep(0.24, 0.76, orbitWave * 0.7 + arcFine * 0.3);
  }

  void main() {
    highp float horizon = clamp(uHorizonRadius, 0.14, 1.65);
    highp vec2 uv = (vUv - 0.5) * 2.0;
    highp float aspect = uResolution.x / max(uResolution.y, 1.0);
    uv.x *= aspect;

    highp vec2 p = uv;
    highp float r = length(p);
    highp float radialBoundary = 1.0 - smoothstep(0.74, 0.992, length(vUv - 0.5) * 2.0);
    float engulfBoost = smoothstep(0.55, 0.68, uProgress);
    float shadowMask = 1.0 - smoothstep(horizon * 0.965, horizon * 1.008, r);
    vec3 horizonCore = vec3(0.006, 0.006, 0.009);

    // Early-out 1: fora da borda do canvas (exceto quando o horizonte engole a viewport na travessia)
    if (radialBoundary <= 0.0001) {
      if (engulfBoost > 0.001 && shadowMask > 0.001) {
        gl_FragColor = vec4(horizonCore, clamp(shadowMask * engulfBoost, 0.0, 1.0));
      } else {
        gl_FragColor = vec4(0.0);
      }
      return;
    }

    highp float tiltAngle = -0.22 + uPointer.y * 0.035;
    highp vec2 q = rot2(tiltAngle) * p;
    highp float spin = uTime * (0.34 + uWarp * 0.26);

    vec3 acidTone = vec3(0.643, 0.780, 0.353); // #A4C75A
    vec3 uvTone = vec3(0.631, 0.541, 0.784);   // #A18AC8
    vec3 coreWhite = vec3(0.97, 0.965, 0.94);

    highp vec2 frontEllip = vec2(q.x * 0.68, q.y * 3.85);
    highp float frontR = length(frontEllip);
    highp float frontNormR = frontR / horizon;
    float frontSideMask = smoothstep(0.05 * horizon, -0.045 * horizon, q.y);

    ${
      supportsTwoPass
        ? `
    if (uLayerPass > 0.5) {
      if (frontSideMask <= 0.0001 || frontNormR <= 0.97 || frontNormR >= 4.2) {
        gl_FragColor = vec4(0.0);
        return;
      }

      highp float frontAngle = atan(frontEllip.y, frontEllip.x);
      float frontFilEnergy = 0.0;
      float frontChromaMix = 0.5;
      sampleFilaments(frontR, frontAngle, horizon, spin * 1.15, uWarp, frontFilEnergy, frontChromaMix);

      float frontBrightEnv =
        smoothstep(0.98, 1.05, frontNormR) *
        exp(-pow(max(frontNormR - 1.22, 0.0001) / 0.42, 1.75));
      float frontDoppler = 0.82 + 0.32 * cos(frontAngle - 0.45);
      float frontStream = frontFilEnergy * frontBrightEnv * frontDoppler * frontSideMask * 1.38;

      float fgPChroma = 0.5;
      float fgParticles = 0.0;
      if (uComplexity > 0.4) {
        fgParticles =
          orbitalMicroParticles(frontNormR, frontAngle, 40.0, 16.0, spin * 1.15, 1.6, 73.1, fgPChroma) *
          frontSideMask *
          frontBrightEnv *
          0.95;
      }

      vec3 frontHue = mix(uvTone, acidTone, frontChromaMix);
      float wfStream = frontStream * 1.15;
      float wfPart = fgParticles * 1.15;
      float wfSum = wfStream + wfPart;

      vec3 frontMixColor = (
        frontHue * wfStream +
        mix(acidTone, uvTone, fgPChroma) * wfPart
      ) / max(wfSum, 0.0001);

      float frontPeak = fastPow2(clamp(wfSum * 0.65, 0.0, 1.0));
      vec3 frontFinal = mix(frontMixColor, coreWhite, frontPeak * 0.80);
      float frontLumAlpha = clamp(frontStream * 0.98 + fgParticles * 0.92, 0.0, 1.0);

      gl_FragColor = vec4(frontFinal, clamp(frontLumAlpha * radialBoundary, 0.0, 1.0));
      return;
    }
    `
        : ''
    }

    highp float normRGlobal = r / horizon;
    float frontBodyMask =
      frontSideMask *
      smoothstep(1.30, 1.44, frontNormR) *
      (1.0 - smoothstep(1.82, 2.02, frontNormR));
    float undersideAlpha = frontBodyMask * 0.92 * (1.0 - uLightMode);

    // Early-out 2: interior absoluto da sombra do horizonte de eventos (zero FBM/atan no miolo preto)
    if (r < horizon * 0.955 && undersideAlpha <= 0.001) {
      gl_FragColor = vec4(horizonCore, 1.0);
      return;
    }

    // Early-out 3: região externa sem matéria orbital visível
    if (normRGlobal > 3.6 && frontNormR > 4.1) {
      gl_FragColor = vec4(0.0);
      return;
    }

    highp float angle = atan(p.y, p.x);

    // 1. Disco traseiro com lente gravitacional contínua e arredondada
    float yNorm = q.y / horizon;
    float equatorBand = exp(-(yNorm * yNorm) / (0.36 + 0.14 * normRGlobal));
    float radialOut = smoothstep(0.95, 2.35, normRGlobal);
    float wingBlend = equatorBand * radialOut;

    float yAsym = mix(1.16, 1.03, smoothstep(-0.35, 0.35, yNorm));
    float xScale = mix(1.0, 0.70, wingBlend);
    float yScale = mix(yAsym, 3.65, wingBlend);

    highp vec2 rearCoord = vec2(q.x * xScale, q.y * yScale);
    highp float rearR = length(rearCoord);
    highp float rearNormR = rearR / horizon;
    highp float rearAngle = atan(rearCoord.y, rearCoord.x);

    float rearFilEnergy = 0.0;
    float rearChromaMix = 0.5;
    float rearEnvelope =
      smoothstep(0.98, 1.055, rearNormR) *
      exp(-pow(max(rearNormR - 1.22, 0.0001) / 0.58, 1.72));

    if (rearEnvelope > 0.002) {
      sampleFilaments(rearR, rearAngle, horizon, spin, uWarp, rearFilEnergy, rearChromaMix);
    }

    float lowerSecondaryGain = mix(0.76, 1.0, smoothstep(-0.32 * horizon, 0.14 * horizon, q.y));
    float rearDoppler = 0.78 + 0.34 * cos(rearAngle - 0.45);
    float rearEnergy = rearFilEnergy * rearEnvelope * lowerSecondaryGain * rearDoppler * 1.28;

    // 2. Anéis internos de lente e anel de fótons
    float innerRingEnv =
      smoothstep(0.992, 1.022, normRGlobal) *
      exp(-fastPow2((normRGlobal - 1.11) / 0.105));
    float innerLensedGlow = 0.0;
    float innerStreak = 0.5;
    if (innerRingEnv > 0.002) {
      highp float innerAngle = angle + log(max(normRGlobal, 0.2)) * 2.4 - spin * 1.25;
      innerStreak = fbm4(vec2(cos(innerAngle) * 2.8, sin(innerAngle) * 2.8 + normRGlobal * 6.0));
      float innerThreads = fastPow3(max(0.0, sin(normRGlobal * 54.0 - spin * 1.35 + innerStreak * 2.4)));
      innerLensedGlow = innerRingEnv * (0.28 + 0.85 * innerThreads) * (0.62 + 0.38 * innerStreak);
    }

    float photonDist = abs(r - horizon * 1.012);
    float photonRing =
      exp(-photonDist / max(horizon * 0.014, 0.0035)) *
      (0.86 + 0.24 * sin(angle * 3.0 - spin * 1.4));

    // 3. Micro-partículas traseiras (apenas Ultra e Alto)
    float bgParticles = 0.0;
    float midParticles = 0.0;
    float bgPChroma = 0.5;
    float midPChroma = 0.5;

    ${
      isUltra
        ? `
    if (normRGlobal > 1.05 && normRGlobal < 2.8) {
      bgParticles =
        orbitalMicroParticles(normRGlobal, angle, 56.0, 20.0, spin * 0.32, 1.0, 11.3, bgPChroma) *
        smoothstep(1.06, 1.28, normRGlobal) *
        exp(-max(normRGlobal - 1.35, 0.0) * 1.1) *
        0.72;
    }
    if (rearEnvelope > 0.02) {
      midParticles =
        orbitalMicroParticles(rearNormR, rearAngle, 44.0, 18.0, spin * 0.85, 1.55, 37.7, midPChroma) *
        rearEnvelope *
        0.85;
    }
    `
        : variant === 'high'
          ? `
    if (rearEnvelope > 0.03) {
      midParticles =
        orbitalMicroParticles(rearNormR, rearAngle, 44.0, 18.0, spin * 0.85, 1.55, 37.7, midPChroma) *
        rearEnvelope *
        0.82;
    }
    `
          : ''
    }

    vec3 rearHue = mix(uvTone, acidTone, rearChromaMix);
    vec3 innerHue = mix(uvTone, acidTone, 0.20 + 0.24 * innerStreak);
    vec3 bgPartColor = mix(acidTone, uvTone, bgPChroma);
    vec3 midPartColor = mix(uvTone, acidTone, midPChroma);

    float wRear = rearEnergy * 1.05;
    float wInner = innerLensedGlow * 1.15;
    float wPhoton = photonRing * 1.0;
    float wBgP = bgParticles * 1.1;
    float wMidP = midParticles * 1.1;
    float wSum = wRear + wInner + wPhoton + wBgP + wMidP;

    vec3 rearMixColor = (
      rearHue * wRear +
      innerHue * wInner +
      mix(uvTone, coreWhite, 0.72) * wPhoton +
      bgPartColor * wBgP +
      midPartColor * wMidP
    ) / max(wSum, 0.0001);

    float rearPeak = fastPow2(clamp(wSum * 0.62, 0.0, 1.0));
    vec3 rearFinal = mix(rearMixColor, coreWhite, rearPeak * 0.78);

    float rearLumAlpha = clamp(
      rearEnergy * 0.95 + innerLensedGlow * 0.92 + photonRing * 0.96 + bgParticles * 0.88 + midParticles * 0.88,
      0.0,
      1.0
    );

    vec3 baseColor = mix(rearFinal, horizonCore, shadowMask);
    float baseAlpha = max(rearLumAlpha, shadowMask);

    if (undersideAlpha > 0.001) {
      highp float frontAngle = atan(frontEllip.y, frontEllip.x);
      float frontFilEnergy = 0.0;
      float frontChromaMix = 0.5;
      sampleFilaments(frontR, frontAngle, horizon, spin * 1.15, uWarp, frontFilEnergy, frontChromaMix);
      float frontBrightEnv =
        smoothstep(0.98, 1.05, frontNormR) *
        exp(-pow(max(frontNormR - 1.22, 0.0001) / 0.42, 1.75));
      float frontDoppler = 0.82 + 0.32 * cos(frontAngle - 0.45);
      float frontStream = frontFilEnergy * frontBrightEnv * frontDoppler * frontSideMask * 1.38;

      float undersideThreads = fastPow3(max(0.0, sin(frontNormR * 44.0 - spin * 0.9 + frontFilEnergy * 2.0)));
      float frontUndersideGlow = frontBodyMask * undersideThreads * 0.32;

      vec3 undersideBase = mix(
        vec3(0.022, 0.020, 0.030),
        mix(uvTone, acidTone, frontChromaMix) * 0.55,
        clamp(frontUndersideGlow * 2.2, 0.0, 1.0)
      );
      baseColor = mix(baseColor, undersideBase, undersideAlpha * (1.0 - clamp(frontStream * 1.2, 0.0, 1.0)));
      baseAlpha = max(baseAlpha, undersideAlpha);
    }

    float rearOnlyAlpha = max(baseAlpha * radialBoundary, shadowMask * engulfBoost);
    gl_FragColor = vec4(baseColor, clamp(rearOnlyAlpha, 0.0, 1.0));
  }
`;
}
