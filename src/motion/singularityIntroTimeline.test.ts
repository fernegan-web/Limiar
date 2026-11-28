import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SINGULARITY_INTRO_DURATION_MS,
  computeFlipOffset,
  computeSingularityIntroFrame,
  computeSyncedCssSpinDelaySec,
  shouldPlaySingularityIntro,
} from './singularityIntroTimeline';

test('shouldPlaySingularityIntro runs once on homepage entry and skips internal routes, reduced motion, autostart, and seen session', () => {
  assert.equal(shouldPlaySingularityIntro({ pathname: '/' }), true);
  assert.equal(shouldPlaySingularityIntro({ pathname: '' }), true);
  assert.equal(shouldPlaySingularityIntro({ pathname: '/loja' }), false);
  assert.equal(shouldPlaySingularityIntro({ pathname: '/colecoes' }), false);
  assert.equal(shouldPlaySingularityIntro({ pathname: '/produto/hoodie-vazio' }), false);
  assert.equal(shouldPlaySingularityIntro({ pathname: '/', reducedMotion: true }), false);
  assert.equal(shouldPlaySingularityIntro({ pathname: '/', sessionSeen: true }), false);
  assert.equal(shouldPlaySingularityIntro({ pathname: '/', search: '?autostart=1' }), false);
  assert.equal(shouldPlaySingularityIntro({ pathname: '/', hash: '#todos-os-produtos' }), false);
});

test('computeSingularityIntroFrame orchestrates all 5 phases across ~5s without discontinuities', () => {
  // 0ms — Fase 01 (O Vazio): tela vazia, apenas fundo sólido
  const f0 = computeSingularityIntroFrame(0, false);
  assert.equal(f0.phase, 'void');
  assert.equal(f0.logo.opacity, 0);
  assert.equal(f0.blackhole.opacity, 0);
  assert.equal(f0.wreath.opacity, 0);
  assert.equal(f0.model.opacity, 0);
  assert.equal(f0.chrome.atmosphereOpacity, 0);
  assert.equal(f0.chrome.navbarOpacity, 0);
  assert.equal(f0.flip.centerFactor, 1);

  // 680ms — Logo já visível no centro, buraco negro despertando mas ainda invisível
  const f680 = computeSingularityIntroFrame(680, false);
  assert.equal(f680.phase, 'void');
  assert.equal(f680.logo.opacity, 1);
  assert.equal(f680.engineActive, true);
  assert.equal(f680.blackhole.opacity, 0);

  // 1200ms — Fase 02 (O Nascimento): buraco negro crescendo atrás da logo, moldura ainda oculta
  const f1200 = computeSingularityIntroFrame(1200, false);
  assert.equal(f1200.phase, 'birth');
  assert.equal(f1200.blackhole.opacity, 1);
  assert.ok(f1200.blackhole.scale > 0.7 && f1200.blackhole.scale < 1);
  assert.equal(f1200.logo.lightHorizonMix, 1);
  assert.equal(f1200.wreath.opacity, 0);

  // 1950ms — Fase 03 (A Troca): moldura já emergindo de dentro do horizonte em 4x antes de a logo sumir
  const f1950 = computeSingularityIntroFrame(1950, false);
  assert.equal(f1950.phase, 'exchange');
  assert.ok(f1950.logo.opacity > 0 && f1950.logo.opacity < 1);
  assert.ok(f1950.logo.scale < 0.96);
  assert.ok(f1950.wreath.opacity === 1);
  assert.ok(f1950.wreath.scale > 0.36 && f1950.wreath.scale < 1);
  assert.equal(f1950.wreath.speedMultiplier, 4);

  // 2550ms — Logo totalmente consumida, moldura em 4x antes do deslocamento
  const f2550 = computeSingularityIntroFrame(2550, false);
  assert.equal(f2550.logo.opacity, 0);
  assert.ok(f2550.wreath.scale > 0.98);
  assert.equal(f2550.flip.centerFactor, 1);

  // 3350ms — Fase 04 (Posicionamento e Desaceleração): FLIP em curso e rotação desacelerando entre 4x e 1x
  const f3350 = computeSingularityIntroFrame(3350, false);
  assert.equal(f3350.phase, 'positioning');
  assert.ok(f3350.flip.centerFactor > 0.1 && f3350.flip.centerFactor < 0.9);
  assert.ok(f3350.wreath.speedMultiplier > 1 && f3350.wreath.speedMultiplier < 4);
  assert.equal(f3350.model.opacity, 0);

  // 4450ms — Fase 05 (A Materialização): Hero posicionado, modelo entrando em scale=1 com leve desfoque e deslocamento 15-25px
  const f4450 = computeSingularityIntroFrame(4450, false);
  assert.equal(f4450.phase, 'materialization');
  assert.equal(f4450.flip.centerFactor, 0);
  assert.equal(f4450.flip.scale, 1);
  assert.equal(f4450.wreath.speedMultiplier, 1);
  assert.equal(f4450.model.scale, 1);
  assert.ok(f4450.model.opacity > 0 && f4450.model.opacity < 1);
  assert.ok(f4450.model.yPx > 0 && f4450.model.yPx < 22);
  assert.ok(f4450.chrome.atmosphereOpacity > 0);
  assert.ok(f4450.chrome.heroContentOpacity > 0);

  // 5000ms — Completa: estado exato de repouso da homepage
  const fEnd = computeSingularityIntroFrame(SINGULARITY_INTRO_DURATION_MS, false);
  assert.equal(fEnd.phase, 'complete');
  assert.equal(fEnd.finished, true);
  assert.equal(fEnd.logo.opacity, 0);
  assert.equal(fEnd.blackhole.opacity, 1);
  assert.equal(fEnd.blackhole.scale, 1);
  assert.equal(fEnd.wreath.opacity, 1);
  assert.equal(fEnd.wreath.scale, 1);
  assert.equal(fEnd.wreath.speedMultiplier, 1);
  assert.equal(fEnd.flip.centerFactor, 0);
  assert.equal(fEnd.flip.scale, 1);
  assert.equal(fEnd.model.opacity, 1);
  assert.equal(fEnd.model.yPx, 0);
  assert.equal(fEnd.model.blurPx, 0);
  assert.equal(fEnd.model.scale, 1);
  assert.equal(fEnd.chrome.atmosphereOpacity, 1);
  assert.equal(fEnd.chrome.heroContentOpacity, 1);
  assert.equal(fEnd.chrome.navbarOpacity, 1);
});

test('computeFlipOffset centers composition from any layout coordinates and computeSyncedCssSpinDelaySec preserves CCW angle', () => {
  const offset = computeFlipOffset(
    { left: 736, top: 180, width: 600, height: 454 },
    { width: 1440, height: 900 }
  );
  // Anchor center = (1036, 407), Viewport center = (720, 450)
  assert.equal(offset.tx, -316);
  assert.equal(offset.ty, 43);

  // Turned 90 deg counter-clockwise (-90deg) -> 25% of 32s cycle -> -8s delay
  assert.equal(computeSyncedCssSpinDelaySec(-90, 32), -8);
  assert.equal(computeSyncedCssSpinDelaySec(-450, 32), -8);
  assert.equal(computeSyncedCssSpinDelaySec(0, 32), 0);
});
