export const BLACKHOLE_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const BLACKHOLE_FRAGMENT_SHADER = /* glsl */ `
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

  // Filamentos finos e definidos em múltiplas escalas preservando fluxo anti-horário + centrípeto
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

    // Distorção orgânica suave entre linhas de corrente (evita anéis rígidos)
    float rWarp = normR + (turbLow - 0.5) * (0.11 + warp * 0.04) + (turbHigh - 0.5) * 0.042;

    // 3 escalas de filamentos nítidos separados por intervalos escuros reais
    float sFine = pow(max(0.0001, sin(rWarp * 36.0 - spin * 1.15 + turbHigh * 2.6)), 4.2);
    float sMid = pow(max(0.0001, sin(rWarp * 18.5 - spin * 0.72 + turbLow * 2.8)), 3.2);
    float sBroad = pow(max(0.0001, sin(rWarp * 9.2 - spin * 0.42 + turbLow * 1.8)), 2.4);

    // Quebras azimutais naturais e variação de densidade ao longo das órbitas
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

    // Separação cromática orgânica ao longo de órbitas e filamentos individuais (#A18AC8 <-> #A4C75A)
    float orbitWave = 0.5 + 0.5 * sin(rWarp * 7.6 + turbLow * 3.8 - spin * 0.22);
    chromaMix = smoothstep(0.24, 0.76, orbitWave * 0.7 + arcFine * 0.3);
  }

  // Micro-partículas cósmicas refinadas com rastro orbital delicado (sem aspecto de confete)
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
    // Fase alinhada ao fluxo anti-horário + centrípeto (-spin + logR)
    float u = fract((angleOrb + logR * 1.8 - spinSpeed) / TAU) * angCells;
    float v = normR * radCells;

    vec2 cell = floor(vec2(u, v));
    vec2 f = fract(vec2(u, v));

    vec2 rnd = hash22(cell + seedShift);
    pChroma = rnd.y;

    float exists = step(0.62, hash21(cell * 1.37 + seedShift));
    vec2 center = vec2(0.32 + 0.36 * rnd.x, 0.25 + 0.50 * rnd.y);
    vec2 delta = f - center;

    // Rastro fino ao longo da órbita mantido estritamente dentro dos limites da célula
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

    // Centro óptico sincronizado ao wrapper magnético compartilhado (mantém alinhamento exato com a moldura)
    vec2 p = uv;

    float r = length(p);
    float angle = atan(p.y, p.x);

    // Raio real da sombra do horizonte de eventos
    float horizon = clamp(uHorizonRadius, 0.14, 1.65);
    float normRGlobal = r / horizon;
    float octaves = mix(2.0, 4.0, clamp(uComplexity, 0.0, 1.0));
    float spin = uTime * (0.34 + uWarp * 0.26);

    float tiltAngle = -0.22 + uPointer.y * 0.035;
    vec2 q = rot2(tiltAngle) * p;

    // =========================================================================
    // 1. DISCO TRASEIRO COM LENTE GRAVITACIONAL CONTÍNUA E ARREDONDADA
    //    Transição suave (C-infinito) dos arcos polares circulares às asas horizontais
    // =========================================================================
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

    // Envelope radial do disco e arcos gravitacionais até encontrar as pontas da moldura
    float rearEnvelope =
      smoothstep(0.98, 1.055, rearNormR) *
      exp(-pow(max(rearNormR - 1.22, 0.0001) / 0.58, 1.72));
    float lowerSecondaryGain = mix(0.76, 1.0, smoothstep(-0.32 * horizon, 0.14 * horizon, q.y));
    float rearDoppler = 0.78 + 0.34 * cos(rearAngle - 0.45);
    float rearEnergy = rearFilEnergy * rearEnvelope * lowerSecondaryGain * rearDoppler * 1.28;

    // =========================================================================
    // 2. ANÉIS INTERNOS DE LENTE E ANEL DE FÓTONS (ESTILO GARGANTUA)
    // =========================================================================
    float innerRingEnv =
      smoothstep(0.992, 1.022, normRGlobal) *
      exp(-pow((normRGlobal - 1.11) / 0.105, 2.0));
    float innerAngle = angle + log(max(normRGlobal, 0.2)) * 2.4 - spin * 1.25;
    float innerStreak = fbm(vec2(cos(innerAngle) * 2.8, sin(innerAngle) * 2.8 + normRGlobal * 6.0), octaves);
    float innerThreads = pow(max(0.0001, sin(normRGlobal * 54.0 - spin * 1.35 + innerStreak * 2.4)), 3.6);
    float innerLensedGlow = innerRingEnv * (0.28 + 0.85 * innerThreads) * (0.62 + 0.38 * innerStreak);

    // Anel de fótons ultra-fino e brilhante na borda imediata da sombra
    float photonDist = abs(r - horizon * 1.012);
    float photonRing =
      exp(-photonDist / max(horizon * 0.014, 0.0035)) *
      (0.86 + 0.24 * sin(angle * 3.0 - spin * 1.4));

    // =========================================================================
    // 3. FAIXA ORBITAL FRONTAL CONTÍNUA (PASSA À FRENTE DO HORIZONTE SEM CORTES)
    // =========================================================================
    vec2 frontPlane = q;
    vec2 frontEllip = vec2(frontPlane.x * 0.68, frontPlane.y * 3.85);
    float frontR = length(frontEllip);
    float frontNormR = frontR / horizon;
    float frontAngle = atan(frontEllip.y, frontEllip.x);

    float frontSideMask = smoothstep(0.05 * horizon, -0.045 * horizon, frontPlane.y);

    float frontFilEnergy = 0.0;
    float frontChromaMix = 0.5;
    sampleFilaments(frontR, frontAngle, horizon, spin * 1.15, uWarp, octaves, frontFilEnergy, frontChromaMix);

    // Borda frontal principal extremamente nítida cruzando a face da sombra
    float frontBrightEnv =
      smoothstep(0.98, 1.05, frontNormR) *
      exp(-pow(max(frontNormR - 1.22, 0.0001) / 0.42, 1.75));
    float frontDoppler = 0.82 + 0.32 * cos(frontAngle - 0.45);
    float frontStream = frontFilEnergy * frontBrightEnv * frontDoppler * frontSideMask * 1.38;

    // Espessura 3D escura estriada na face inferior do disco frontal (estritamente confinada ao corpo do disco)
    float frontBodyMask =
      frontSideMask *
      smoothstep(1.30, 1.44, frontNormR) *
      (1.0 - smoothstep(1.82, 2.02, frontNormR));
    float undersideThreads = pow(max(0.0001, sin(frontNormR * 44.0 - spin * 0.9 + frontFilEnergy * 2.0)), 3.2);
    float frontUndersideGlow = frontBodyMask * undersideThreads * 0.32;

    // =========================================================================
    // 4. MICRO-PARTÍCULAS CÓSMICAS E RASTROS ORBITAIS EM 3 PROFUNDIDADES
    // =========================================================================
    float bgPChroma = 0.5;
    float midPChroma = 0.5;
    float fgPChroma = 0.5;

    float bgParticles =
      orbitalMicroParticles(normRGlobal, angle, 56.0, 20.0, spin * 0.32, 1.0, 11.3, bgPChroma) *
      smoothstep(1.06, 1.28, normRGlobal) *
      exp(-max(normRGlobal - 1.35, 0.0) * 1.1) *
      0.72;

    float midParticles =
      orbitalMicroParticles(rearNormR, rearAngle, 44.0, 18.0, spin * 0.85, 1.55, 37.7, midPChroma) *
      rearEnvelope *
      0.85;

    float fgParticles = 0.0;
    if (uComplexity > 0.4) {
      fgParticles =
        orbitalMicroParticles(frontNormR, frontAngle, 40.0, 16.0, spin * 1.15, 1.6, 73.1, fgPChroma) *
        frontSideMask *
        frontBrightEnv *
        0.95;
    }

    // =========================================================================
    // 5. PALETA LIMIAR E EMISSÃO PURA (SEM DUPLA ATENUAÇÃO OU NÉVOA CINZA)
    // =========================================================================
    vec3 colorAcid = vec3(0.643, 0.780, 0.353); // #A4C75A
    vec3 colorUv = vec3(0.631, 0.541, 0.784);   // #A18AC8
    vec3 coreWhite = vec3(0.97, 0.965, 0.94);   // Branco luminoso nos picos energéticos

    // Preserva exatamente a identidade cromática (#A4C75A e #A18AC8) sem escurecimento artificial no Light Mode
    vec3 acidTone = colorAcid;
    vec3 uvTone = colorUv;

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

    // Alpha traseira reflete exclusivamente a matéria luminosa real (espaço externo 100% transparente)
    float rearLumAlpha = clamp(
      rearEnergy * 0.95 + innerLensedGlow * 0.92 + photonRing * 0.96 + bgParticles * 0.88 + midParticles * 0.88,
      0.0,
      1.0
    );

    // =========================================================================
    // 6. HORIZONTE DE EVENTOS ABSOLUTO + COMPOSIÇÃO FRONTAL
    // =========================================================================
    float shadowMask = 1.0 - smoothstep(horizon * 0.965, horizon * 1.008, r);
    vec3 horizonCore = vec3(0.006, 0.006, 0.009);

    vec3 baseColor = mix(rearFinal, horizonCore, shadowMask);
    float baseAlpha = max(rearLumAlpha, shadowMask);

    // Corpo 3D estriado preservado apenas no Dark Mode; no Light Mode apenas a sombra central permanece preta e opaca
    vec3 undersideBase = mix(
      vec3(0.022, 0.020, 0.030),
      mix(uvTone, acidTone, frontChromaMix) * 0.55,
      clamp(frontUndersideGlow * 2.2, 0.0, 1.0)
    );
    float undersideAlpha = frontBodyMask * 0.92 * (1.0 - uLightMode);
    baseColor = mix(baseColor, undersideBase, undersideAlpha * (1.0 - clamp(frontStream * 1.2, 0.0, 1.0)));
    baseAlpha = max(baseAlpha, undersideAlpha);

    // Faixa luminosa frontal contínua passando À FRENTE da sombra
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

    // Borda radial suave apenas nos limites extremos do canvas para evitar recorte retangular
    float radialBoundary = 1.0 - smoothstep(0.74, 0.992, length(vUv - 0.5) * 2.0);
    float alpha = totalAlpha * radialBoundary;

    // Durante expansão do horizonte (>= 0.55), garante cobertura sólida contínua da sombra
    float engulfBoost = smoothstep(0.55, 0.68, uProgress);
    alpha = max(alpha, shadowMask * engulfBoost);

    if (uLayerPass > 0.5) {
      // Passagem independente exclusiva da matéria orbital frontal (à frente da modelo e da moldura)
      gl_FragColor = vec4(frontFinal, clamp(frontLumAlpha * radialBoundary, 0.0, 1.0));
    } else if (uLayerPass >= 0.0) {
      // Passagem posterior exclusiva: horizonte de eventos, arcos gravitacionais e matéria orbital traseira
      float rearOnlyAlpha = max(baseAlpha * radialBoundary, shadowMask * engulfBoost);
      gl_FragColor = vec4(baseColor, clamp(rearOnlyAlpha, 0.0, 1.0));
    } else {
      gl_FragColor = vec4(finalColor, clamp(alpha, 0.0, 1.0));
    }
  }
`;
