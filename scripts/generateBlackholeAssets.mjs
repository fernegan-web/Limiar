/**
 * Reproducible generator for Limiar Black Hole pre-rendered orbital layers.
 * Uses the exact coordinate mapping, logarithmic spiral filaments, Doppler
 * asymmetry, gravitational lensing tilt, and Limiar palette (#A4C75A / #A18AC8)
 * defined in src/components/hero/blackholeShader.ts.
 *
 * Output (public/assets/blackhole/):
 * - rear-accretion-768.webp (768x582, 1.32:1 aspect, transparent RGBA)
 * - front-orbit-768.webp    (768x582, 1.32:1 aspect, transparent RGBA)
 * - inner-halo-768.webp     (768x582, 1.32:1 aspect, transparent RGBA)
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const WIDTH = 768;
const HEIGHT = 582; // 768 / 582 = 1.3196 (~1.32:1)
const OUT_DIR = path.resolve(process.cwd(), 'public/assets/blackhole');
fs.mkdirSync(OUT_DIR, { recursive: true });

const TAU = Math.PI * 2;
const HORIZON = 0.48;
const WARP = 0.28;
const SPIN = 1.15;
const TILT_ANGLE = -0.22;
const COS_TILT = Math.cos(TILT_ANGLE);
const SIN_TILT = Math.sin(TILT_ANGLE);

const COLOR_ACID = [0.643, 0.78, 0.353]; // #A4C75A
const COLOR_UV = [0.631, 0.541, 0.784]; // #A18AC8
const CORE_WHITE = [0.97, 0.965, 0.94];

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function fract(x) {
  return x - Math.floor(x);
}

function hash21(px, py) {
  let x = fract(px * 123.34);
  let y = fract(py * 456.21);
  const d = x * (x + 45.32) + y * (y + 45.32);
  x += d;
  y += d;
  return fract(x * y);
}

function hash22(px, py) {
  let x = fract(px * 0.1031);
  let y = fract(py * 0.1030);
  let z = fract(px * 0.0973);
  const d = x * (y + 33.33) + y * (z + 33.33) + z * (x + 33.33);
  x += d;
  y += d;
  z += d;
  return [fract((x + y) * z), fract((x + z) * y)];
}

function valueNoise(px, py) {
  const ix = Math.floor(px);
  const iy = Math.floor(py);
  const fx = px - ix;
  const fy = py - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash21(ix, iy);
  const b = hash21(ix + 1, iy);
  const c = hash21(ix, iy + 1);
  const d = hash21(ix + 1, iy + 1);
  return mix(mix(a, b, ux), mix(c, d, ux), uy);
}

function fbm(px, py, detail) {
  let v = 0;
  let a = 0.5;
  let x = px;
  let y = py;
  for (let i = 0; i < detail; i++) {
    v += a * valueNoise(x, y);
    const nx = 0.82 * x - 0.57 * y;
    const ny = 0.57 * x + 0.82 * y;
    x = nx * 2.08 + 1.7;
    y = ny * 2.08 + 9.2;
    a *= 0.5;
  }
  return v;
}

function sampleFilaments(rOrb, angleOrb, horizon, spinVal, warpVal, octaves) {
  const normR = rOrb / Math.max(horizon, 0.14);
  const logR = Math.log(Math.max(normR, 0.18));

  const a1 = angleOrb + logR * (3.4 + warpVal * 1.1) - spinVal * 0.72;
  const a2 = angleOrb * 2.0 + logR * (5.2 + warpVal * 1.5) - spinVal * 1.18;

  const turbLow = fbm(
    Math.cos(a1) * 1.9 + normR * 1.6,
    Math.sin(a1) * 1.9 - spinVal * 0.25,
    Math.max(2, octaves - 1)
  );
  const turbHigh = fbm(
    Math.cos(a2) * 2.6 + normR * 3.4,
    Math.sin(a2) * 2.6 - spinVal * 0.45,
    octaves
  );

  const rWarp = normR + (turbLow - 0.5) * (0.11 + warpVal * 0.04) + (turbHigh - 0.5) * 0.042;

  const sFine = Math.pow(Math.max(0.0001, Math.sin(rWarp * 36.0 - spinVal * 1.15 + turbHigh * 2.6)), 4.2);
  const sMid = Math.pow(Math.max(0.0001, Math.sin(rWarp * 18.5 - spinVal * 0.72 + turbLow * 2.8)), 3.2);
  const sBroad = Math.pow(Math.max(0.0001, Math.sin(rWarp * 9.2 - spinVal * 0.42 + turbLow * 1.8)), 2.4);

  const arcDense = smoothstep(
    0.24,
    0.8,
    fbm(Math.cos(a1) * 2.2 + normR * 2.4, Math.sin(a1) * 2.2 + normR * 1.6, octaves)
  );
  const arcFine = smoothstep(
    0.2,
    0.78,
    fbm(Math.cos(a2) * 1.8 - spinVal * 0.3, Math.sin(a2) * 1.8 + normR * 3.1, Math.max(2, octaves - 1))
  );

  const energy =
    sFine * (0.42 + 0.58 * arcFine) * 0.82 +
    sMid * (0.34 + 0.66 * arcDense) * 0.88 +
    sBroad * arcDense * 0.44;

  const orbitWave = 0.5 + 0.5 * Math.sin(rWarp * 7.6 + turbLow * 3.8 - spinVal * 0.22);
  const chromaMix = smoothstep(0.24, 0.76, orbitWave * 0.7 + arcFine * 0.3);
  return [energy, chromaMix];
}

function orbitalMicroParticles(normR, angleOrb, angCells, radCells, spinSpeed, trailStretch, seedShift) {
  const logR = Math.log(Math.max(normR, 0.18));
  const u = fract((angleOrb + logR * 1.8 - spinSpeed) / TAU) * angCells;
  const v = normR * radCells;

  const cellX = Math.floor(u);
  const cellY = Math.floor(v);
  const fx = u - cellX;
  const fy = v - cellY;

  const rnd = hash22(cellX + seedShift, cellY + seedShift);
  const pChroma = rnd[1];
  const exists = hash21(cellX * 1.37 + seedShift, cellY * 1.37 + seedShift) >= 0.62 ? 1 : 0;
  if (!exists) return [0, pChroma];

  const cx = 0.32 + 0.36 * rnd[0];
  const cy = 0.25 + 0.5 * rnd[1];
  const dx = fx - cx;
  const dy = fy - cy;
  const safeStretch = clamp(trailStretch, 1.0, 1.65);
  const dist = Math.hypot(dx / safeStretch, dy * 1.18);
  const radius = mix(0.05, 0.115, hash21(cellX + seedShift * 2.1, cellY + seedShift * 2.1));

  const core = Math.pow(Math.max(0.0001, 1.0 - dist / radius), 3.4);
  const microGlow = Math.exp(-dist * 15.0) * 0.26 * smoothstep(0.22, 0.04, dist);
  return [core + microGlow, pChroma];
}

function mixRgb(c1, c2, t) {
  return [mix(c1[0], c2[0], t), mix(c1[1], c2[1], t), mix(c1[2], c2[2], t)];
}

function writeWebpFromRgba(buffer, outName, quality = 88, w = WIDTH, h = HEIGHT) {
  const rawPath = path.join(OUT_DIR, `${outName}.rgba`);
  const webpPath = path.join(OUT_DIR, `${outName}.webp`);
  fs.writeFileSync(rawPath, buffer);
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-f',
      'rawvideo',
      '-pixel_format',
      'rgba',
      '-video_size',
      `${w}x${h}`,
      '-i',
      rawPath,
      '-c:v',
      'libwebp',
      '-lossless',
      '0',
      '-quality',
      String(quality),
      '-compression_level',
      '6',
      webpPath,
    ],
    { stdio: 'ignore' }
  );
  fs.unlinkSync(rawPath);
  const sizeKb = (fs.statSync(webpPath).size / 1024).toFixed(1);
  console.log(`Generated ${path.relative(process.cwd(), webpPath)} (${sizeKb} KB)`);
}

const rearBuf = Buffer.alloc(WIDTH * HEIGHT * 4);
const frontBuf = Buffer.alloc(WIDTH * HEIGHT * 4);
const haloBuf = Buffer.alloc(WIDTH * HEIGHT * 4);
const aspect = WIDTH / HEIGHT;

for (let py = 0; py < HEIGHT; py++) {
  // vUv.y in WebGL is bottom-to-top (0 at bottom, 1 at top), whereas image y=0 is top
  const vUvY = 1 - (py + 0.5) / HEIGHT;
  const pY = (vUvY - 0.5) * 2.0;

  for (let px = 0; px < WIDTH; px++) {
    const vUvX = (px + 0.5) / WIDTH;
    const pX = (vUvX - 0.5) * 2.0 * aspect;

    const qX = COS_TILT * pX + SIN_TILT * pY;
    const qY = -SIN_TILT * pX + COS_TILT * pY;

    const radialDistUv = Math.hypot(vUvX - 0.5, vUvY - 0.5) * 2.0;
    const radialBoundary = 1.0 - smoothstep(0.74, 0.992, radialDistUv);

    const idx = (py * WIDTH + px) * 4;

    // 1) FRONT ORBITAL MATTER
    const frontEllipX = qX * 0.68;
    const frontEllipY = qY * 3.85;
    const frontR = Math.hypot(frontEllipX, frontEllipY);
    const frontNormR = frontR / HORIZON;
    const frontAngle = Math.atan2(frontEllipY, frontEllipX);
    const frontSideMask = smoothstep(0.05 * HORIZON, -0.045 * HORIZON, qY);

    if (frontSideMask > 0.0005 && frontNormR > 0.97 && frontNormR < 4.2 && radialBoundary > 0.0005) {
      const [frontFilEnergy, frontChromaMix] = sampleFilaments(
        frontR,
        frontAngle,
        HORIZON,
        SPIN * 1.15,
        WARP,
        4
      );
      const frontBrightEnv =
        smoothstep(0.98, 1.05, frontNormR) *
        Math.exp(-Math.pow(Math.max(frontNormR - 1.22, 0.0001) / 0.42, 1.75));
      const frontDoppler = 0.82 + 0.32 * Math.cos(frontAngle - 0.45);
      const frontStream = frontFilEnergy * frontBrightEnv * frontDoppler * frontSideMask * 1.38;

      const [fgParticlesRaw, fgPChroma] = orbitalMicroParticles(
        frontNormR,
        frontAngle,
        40.0,
        16.0,
        SPIN * 1.15,
        1.6,
        73.1
      );
      const fgParticles = fgParticlesRaw * frontSideMask * frontBrightEnv * 0.95;

      const frontHue = mixRgb(COLOR_UV, COLOR_ACID, frontChromaMix);
      const partHue = mixRgb(COLOR_ACID, COLOR_UV, fgPChroma);
      const wfStream = frontStream * 1.15;
      const wfPart = fgParticles * 1.15;
      const wfSum = wfStream + wfPart;

      const invSum = 1 / Math.max(wfSum, 0.0001);
      const mixC = [
        (frontHue[0] * wfStream + partHue[0] * wfPart) * invSum,
        (frontHue[1] * wfStream + partHue[1] * wfPart) * invSum,
        (frontHue[2] * wfStream + partHue[2] * wfPart) * invSum,
      ];
      const frontPeak = Math.pow(clamp(wfSum * 0.65, 0.0001, 1.0), 2.25);
      const frontFinal = mixRgb(mixC, CORE_WHITE, frontPeak * 0.8);
      const frontAlpha = clamp((frontStream * 0.98 + fgParticles * 0.92) * radialBoundary, 0, 1);

      frontBuf[idx] = Math.round(clamp(frontFinal[0], 0, 1) * 255);
      frontBuf[idx + 1] = Math.round(clamp(frontFinal[1], 0, 1) * 255);
      frontBuf[idx + 2] = Math.round(clamp(frontFinal[2], 0, 1) * 255);
      frontBuf[idx + 3] = Math.round(frontAlpha * 255);
    }

    // 2) REAR ACCRETION + INNER RING + PHOTON RING (transparent around core for clean CSS horizon layering)
    const r = Math.hypot(pX, pY);
    const angle = Math.atan2(pY, pX);
    const normRGlobal = r / HORIZON;

    if (normRGlobal > 0.93 && normRGlobal < 3.6 && radialBoundary > 0.0005) {
      const yNorm = qY / HORIZON;
      const equatorBand = Math.exp(-(yNorm * yNorm) / (0.36 + 0.14 * normRGlobal));
      const radialOut = smoothstep(0.95, 2.35, normRGlobal);
      const wingBlend = equatorBand * radialOut;

      const yAsym = mix(1.16, 1.03, smoothstep(-0.35, 0.35, yNorm));
      const xScale = mix(1.0, 0.7, wingBlend);
      const yScale = mix(yAsym, 3.65, wingBlend);

      const rearCoordX = qX * xScale;
      const rearCoordY = qY * yScale;
      const rearR = Math.hypot(rearCoordX, rearCoordY);
      const rearNormR = rearR / HORIZON;
      const rearAngle = Math.atan2(rearCoordY, rearCoordX);

      const [rearFilEnergy, rearChromaMix] = sampleFilaments(rearR, rearAngle, HORIZON, SPIN, WARP, 4);
      const rearEnvelope =
        smoothstep(0.98, 1.055, rearNormR) *
        Math.exp(-Math.pow(Math.max(rearNormR - 1.22, 0.0001) / 0.58, 1.72));
      const lowerSecondaryGain = mix(0.76, 1.0, smoothstep(-0.32 * HORIZON, 0.14 * HORIZON, qY));
      const rearDoppler = 0.78 + 0.34 * Math.cos(rearAngle - 0.45);
      const rearEnergy = rearFilEnergy * rearEnvelope * lowerSecondaryGain * rearDoppler * 1.28;

      const innerRingEnv =
        smoothstep(0.992, 1.022, normRGlobal) *
        Math.exp(-Math.pow((normRGlobal - 1.11) / 0.105, 2.0));
      const innerAngle = angle + Math.log(Math.max(normRGlobal, 0.2)) * 2.4 - SPIN * 1.25;
      const innerStreak = fbm(Math.cos(innerAngle) * 2.8, Math.sin(innerAngle) * 2.8 + normRGlobal * 6.0, 4);
      const innerThreads = Math.pow(Math.max(0.0001, Math.sin(normRGlobal * 54.0 - SPIN * 1.35 + innerStreak * 2.4)), 3.6);
      const innerLensedGlow = innerRingEnv * (0.28 + 0.85 * innerThreads) * (0.62 + 0.38 * innerStreak);

      const photonDist = Math.abs(r - HORIZON * 1.012);
      const photonRing =
        Math.exp(-photonDist / Math.max(HORIZON * 0.014, 0.0035)) *
        (0.86 + 0.24 * Math.sin(angle * 3.0 - SPIN * 1.4));

      const [bgP, bgPChroma] = orbitalMicroParticles(normRGlobal, angle, 56.0, 20.0, SPIN * 0.32, 1.0, 11.3);
      const bgParticles = bgP * smoothstep(1.06, 1.28, normRGlobal) * Math.exp(-Math.max(normRGlobal - 1.35, 0) * 1.1) * 0.72;

      const [midP, midPChroma] = orbitalMicroParticles(rearNormR, rearAngle, 44.0, 18.0, SPIN * 0.85, 1.55, 37.7);
      const midParticles = midP * rearEnvelope * 0.85;

      const rearHue = mixRgb(COLOR_UV, COLOR_ACID, rearChromaMix);
      const innerHue = mixRgb(COLOR_UV, COLOR_ACID, 0.2 + 0.24 * innerStreak);
      const bgPartColor = mixRgb(COLOR_ACID, COLOR_UV, bgPChroma);
      const midPartColor = mixRgb(COLOR_UV, COLOR_ACID, midPChroma);
      const photonTone = mixRgb(COLOR_UV, CORE_WHITE, 0.72);

      const wRear = rearEnergy * 1.05;
      const wInner = innerLensedGlow * 1.15;
      const wPhoton = photonRing * 1.0;
      const wBgP = bgParticles * 1.1;
      const wMidP = midParticles * 1.1;
      const wSum = wRear + wInner + wPhoton + wBgP + wMidP;

      const invW = 1 / Math.max(wSum, 0.0001);
      const rearMixColor = [
        (rearHue[0] * wRear + innerHue[0] * wInner + photonTone[0] * wPhoton + bgPartColor[0] * wBgP + midPartColor[0] * wMidP) * invW,
        (rearHue[1] * wRear + innerHue[1] * wInner + photonTone[1] * wPhoton + bgPartColor[1] * wBgP + midPartColor[1] * wMidP) * invW,
        (rearHue[2] * wRear + innerHue[2] * wInner + photonTone[2] * wPhoton + bgPartColor[2] * wBgP + midPartColor[2] * wMidP) * invW,
      ];

      const rearPeak = Math.pow(clamp(wSum * 0.62, 0.0001, 1.0), 2.3);
      const rearFinal = mixRgb(rearMixColor, CORE_WHITE, rearPeak * 0.78);
      const rearLumAlpha = clamp(
        (rearEnergy * 0.95 + innerLensedGlow * 0.92 + photonRing * 0.96 + bgParticles * 0.88 + midParticles * 0.88) *
          radialBoundary,
        0,
        1
      );

      rearBuf[idx] = Math.round(clamp(rearFinal[0], 0, 1) * 255);
      rearBuf[idx + 1] = Math.round(clamp(rearFinal[1], 0, 1) * 255);
      rearBuf[idx + 2] = Math.round(clamp(rearFinal[2], 0, 1) * 255);
      rearBuf[idx + 3] = Math.round(rearLumAlpha * 255);

      // 3) INNER HALO / PHOTON RING LAYER (for subtle independent inner pulse in Low tier)
      const haloIntensity = clamp((innerLensedGlow * 0.95 + photonRing * 1.05) * radialBoundary, 0, 1);
      if (haloIntensity > 0.002) {
        const hw = innerLensedGlow + photonRing + 0.0001;
        const haloColor = [
          (innerHue[0] * innerLensedGlow + photonTone[0] * photonRing) / hw,
          (innerHue[1] * innerLensedGlow + photonTone[1] * photonRing) / hw,
          (innerHue[2] * innerLensedGlow + photonTone[2] * photonRing) / hw,
        ];
        const haloPeak = Math.pow(clamp(haloIntensity * 0.7, 0.0001, 1), 2.0);
        const haloFinal = mixRgb(haloColor, CORE_WHITE, haloPeak * 0.82);

        haloBuf[idx] = Math.round(clamp(haloFinal[0], 0, 1) * 255);
        haloBuf[idx + 1] = Math.round(clamp(haloFinal[1], 0, 1) * 255);
        haloBuf[idx + 2] = Math.round(clamp(haloFinal[2], 0, 1) * 255);
        haloBuf[idx + 3] = Math.round(haloIntensity * 255);
      }
    }
  }
}

// 4) CIRCULAR POLAR ORBITAL DISK (512x512) for 60 FPS GPU-composited elliptical rotation on mobile
const DISK_SIZE = 512;
const DISK_EXTENT = 1.45;
const diskBuf = Buffer.alloc(DISK_SIZE * DISK_SIZE * 4);

for (let py = 0; py < DISK_SIZE; py++) {
  const vUvY = 1 - (py + 0.5) / DISK_SIZE;
  const ey = (vUvY - 0.5) * 2.0 * DISK_EXTENT;

  for (let px = 0; px < DISK_SIZE; px++) {
    const vUvX = (px + 0.5) / DISK_SIZE;
    const ex = (vUvX - 0.5) * 2.0 * DISK_EXTENT;

    const diskR = Math.hypot(ex, ey);
    const diskNormR = diskR / HORIZON;
    const outerFade = 1.0 - smoothstep(2.35, 3.0, diskNormR);
    if (diskNormR <= 0.96 || diskNormR >= 3.0 || outerFade <= 0.0005) continue;

    const diskAngle = Math.atan2(ey, ex);
    const [filEnergy, chromaMix] = sampleFilaments(
      diskR,
      diskAngle,
      HORIZON,
      SPIN * 1.15,
      WARP,
      4
    );
    const brightEnv =
      smoothstep(0.98, 1.05, diskNormR) *
      Math.exp(-Math.pow(Math.max(diskNormR - 1.22, 0.0001) / 0.45, 1.75));
    const stream = filEnergy * brightEnv * 1.32;

    const [pRaw, pChroma] = orbitalMicroParticles(
      diskNormR,
      diskAngle,
      42.0,
      16.0,
      SPIN * 1.15,
      1.6,
      73.1
    );
    const particles = pRaw * brightEnv * 0.95;

    const filHue = mixRgb(COLOR_UV, COLOR_ACID, chromaMix);
    const partHue = mixRgb(COLOR_ACID, COLOR_UV, pChroma);
    const wfStream = stream * 1.15;
    const wfPart = particles * 1.15;
    const wfSum = wfStream + wfPart;

    const invSum = 1 / Math.max(wfSum, 0.0001);
    const mixC = [
      (filHue[0] * wfStream + partHue[0] * wfPart) * invSum,
      (filHue[1] * wfStream + partHue[1] * wfPart) * invSum,
      (filHue[2] * wfStream + partHue[2] * wfPart) * invSum,
    ];
    const peak = Math.pow(clamp(wfSum * 0.65, 0.0001, 1.0), 2.25);
    const finalRgb = mixRgb(mixC, CORE_WHITE, peak * 0.78);
    const alpha = clamp((stream * 0.95 + particles * 0.92) * outerFade, 0, 1);

    const idx = (py * DISK_SIZE + px) * 4;
    diskBuf[idx] = Math.round(clamp(finalRgb[0], 0, 1) * 255);
    diskBuf[idx + 1] = Math.round(clamp(finalRgb[1], 0, 1) * 255);
    diskBuf[idx + 2] = Math.round(clamp(finalRgb[2], 0, 1) * 255);
    diskBuf[idx + 3] = Math.round(alpha * 255);
  }
}

writeWebpFromRgba(rearBuf, 'rear-accretion-768', 88);
writeWebpFromRgba(frontBuf, 'front-orbit-768', 90);
writeWebpFromRgba(haloBuf, 'inner-halo-768', 88);
writeWebpFromRgba(diskBuf, 'orbital-disk-512', 88, DISK_SIZE, DISK_SIZE);
