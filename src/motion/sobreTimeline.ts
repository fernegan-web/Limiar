import { clamp } from './thresholdConfig';

/**
 * TIMELINE SCROLL-DRIVEN DOS 6 BLOCOS — SOBRE A LIMIAR
 * ---------------------------------------------------------------------------
 * Fases físicas de rolagem por bloco:
 *   0.00 – 0.20 : Entrada progressiva
 *   0.20 – 0.65 : Composição completamente montada e estável (contemplação)
 *   0.65 – 0.85 : Saída progressiva
 *   0.85 – 1.00 : Respiro e transição suave para o bloco seguinte
 *
 * Durante 0.20 – 0.65, textos e fotografias permanecem constantes (opacity = 1,
 * translate = 0, scale = 1, blur = 0). Apenas os grafismos podem apresentar
 * deriva ambiental muito sutil.
 */

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function easeOutCubic(t: number): number {
  const c = clamp(t, 0, 1);
  return 1 - Math.pow(1 - c, 3);
}

export function easeInOutCubic(t: number): number {
  const c = clamp(t, 0, 1);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

export interface ElementVisualState {
  opacity: number;
  x: number;
  y: number;
  scale: number;
  blurPx: number;
  clipInsetPercent?: number;
}

/**
 * Envelope padrão com platô real de estabilidade:
 * - [inStart..inEnd]   -> inVal goes 0 -> 1
 * - [inEnd..outStart]  -> rock-solid 1 (zero structural displacement)
 * - [outStart..outEnd] -> outVal goes 1 -> 0
 */
export function computePhasePresence(
  p: number,
  inStart: number,
  inEnd: number,
  outStart: number,
  outEnd: number
): { inFactor: number; outFactor: number; active: number } {
  const inFactor = easeOutCubic(clamp((p - inStart) / Math.max(0.0001, inEnd - inStart), 0, 1));
  const outRemaining =
    1 - easeInOutCubic(clamp((p - outStart) / Math.max(0.0001, outEnd - outStart), 0, 1));
  return {
    inFactor,
    outFactor: outRemaining,
    active: Math.min(inFactor, outRemaining),
  };
}

function buildMotionState(
  p: number,
  cfg: {
    inStart: number;
    inEnd: number;
    outStart: number;
    outEnd: number;
    enterX?: number;
    enterY?: number;
    exitX?: number;
    exitY?: number;
    enterScale?: number;
    exitScale?: number;
    maxBlur?: number;
  }
): ElementVisualState {
  const { inFactor, outFactor, active } = computePhasePresence(
    p,
    cfg.inStart,
    cfg.inEnd,
    cfg.outStart,
    cfg.outEnd
  );

  const enterMix = 1 - inFactor;
  const exitMix = 1 - outFactor;

  const x = (cfg.enterX ?? 0) * enterMix + (cfg.exitX ?? 0) * exitMix;
  const y = (cfg.enterY ?? 0) * enterMix + (cfg.exitY ?? 0) * exitMix;
  const scale =
    1 +
    ((cfg.enterScale ?? 1) - 1) * enterMix +
    ((cfg.exitScale ?? 1) - 1) * exitMix;

  const maxBlur = cfg.maxBlur ?? 0;
  const blurPx = maxBlur > 0 ? maxBlur * Math.max(enterMix, exitMix) : 0;

  return {
    opacity: clamp(active, 0, 1),
    x: x || 0,
    y: y || 0,
    scale,
    blurPx,
  };
}

/* ============================================================================
   BLOCO 01 — MANIFESTO
   Entrada escalonada título/parágrafos, máscara na DARKWING, saída do texto
   antes da fotografia, dissolução gradual.
   ============================================================================ */
export interface Block01State {
  title: ElementVisualState;
  paragraphs: [ElementVisualState, ElementVisualState, ElementVisualState];
  panel: ElementVisualState;
  photo: ElementVisualState & { clipRightPercent: number };
  grafismo: ElementVisualState & { ambientY: number };
  grafismoSecondary: ElementVisualState & { ambientY: number };
  interactive: boolean;
}

export function computeBlock01State(pRaw: number): Block01State {
  const p = clamp(pRaw, 0, 1);

  const panel = buildMotionState(p, {
    inStart: 0.0,
    inEnd: 0.14,
    outStart: 0.64,
    outEnd: 0.80,
    enterY: 20,
    exitY: -12,
    enterScale: 0.98,
    exitScale: 0.985,
    maxBlur: 4,
  });

  const title = buildMotionState(p, {
    inStart: 0.01,
    inEnd: 0.13,
    outStart: 0.63,
    outEnd: 0.77,
    enterY: 18,
    exitY: -14,
    maxBlur: 4,
  });

  const p0 = buildMotionState(p, {
    inStart: 0.05,
    inEnd: 0.16,
    outStart: 0.64,
    outEnd: 0.78,
    enterY: 14,
    exitY: -10,
  });
  const p1 = buildMotionState(p, {
    inStart: 0.08,
    inEnd: 0.18,
    outStart: 0.65,
    outEnd: 0.79,
    enterY: 14,
    exitY: -10,
  });
  const p2 = buildMotionState(p, {
    inStart: 0.11,
    inEnd: 0.20,
    outStart: 0.66,
    outEnd: 0.80,
    enterY: 14,
    exitY: -10,
  });

  // Fotografia entra via máscara simples e permanece um pouco mais que o texto na saída
  const photoIn = easeOutCubic(clamp(p / 0.19, 0, 1));
  const photoOut = 1 - easeInOutCubic(clamp((p - 0.71) / 0.17, 0, 1));
  const photo: Block01State['photo'] = {
    opacity: clamp(Math.min(photoIn, photoOut), 0, 1),
    x: 0,
    y: 14 * (1 - photoIn) - 10 * (1 - photoOut),
    scale: 1.03 - 0.03 * photoIn - 0.02 * (1 - photoOut),
    blurPx: 0,
    clipRightPercent: (1 - photoIn) * 18,
  };

  const grafBase = buildMotionState(p, {
    inStart: 0.02,
    inEnd: 0.18,
    outStart: 0.68,
    outEnd: 0.90,
    enterX: 24,
    exitX: -16,
    enterScale: 0.97,
    exitScale: 0.98,
    maxBlur: 0,
  });
  const ambientY = Math.sin(clamp((p - 0.2) / 0.45, 0, 1) * Math.PI) * -4;

  const grafSecBase = buildMotionState(p, {
    inStart: 0.05,
    inEnd: 0.21,
    outStart: 0.70,
    outEnd: 0.94,
    enterX: -22,
    enterY: 16,
    exitX: 14,
    exitY: -12,
    enterScale: 0.96,
    exitScale: 0.98,
    maxBlur: 0,
  });
  const ambientSecondaryY = Math.cos(clamp((p - 0.18) / 0.5, 0, 1) * Math.PI) * 5;

  return {
    title,
    paragraphs: [p0, p1, p2],
    panel,
    photo,
    grafismo: { ...grafBase, ambientY },
    grafismoSecondary: { ...grafSecBase, ambientY: ambientSecondaryY },
    interactive: panel.opacity > 0.15,
  };
}

/* ============================================================================
   BLOCO 02 — RAÍZES
   Texto entrando lateralmente, 4 fotos em sequência com pequenos deslocamentos,
   grafismo progressivo, saída das imagens em direções diferentes.
   ============================================================================ */
export interface Block02State {
  textPanel: ElementVisualState;
  photos: [ElementVisualState, ElementVisualState, ElementVisualState, ElementVisualState];
  grafismo: ElementVisualState & { ambientY: number };
  grafismoSecondary: ElementVisualState & { ambientY: number };
  interactive: boolean;
}

export function computeBlock02State(pRaw: number): Block02State {
  const p = clamp(pRaw, 0, 1);

  const textPanel = buildMotionState(p, {
    inStart: 0.0,
    inEnd: 0.16,
    outStart: 0.65,
    outEnd: 0.82,
    enterX: -28,
    exitX: -22,
    enterScale: 0.985,
    maxBlur: 4,
  });

  const photoConfigs = [
    { inStart: 0.02, inEnd: 0.15, outStart: 0.66, outEnd: 0.83, enterY: 22, exitX: -20, exitY: -18 },
    { inStart: 0.06, inEnd: 0.17, outStart: 0.68, outEnd: 0.84, enterX: 20, exitX: 22, exitY: -12 },
    { inStart: 0.09, inEnd: 0.19, outStart: 0.70, outEnd: 0.85, enterY: 20, exitX: -14, exitY: 20 },
    { inStart: 0.12, inEnd: 0.20, outStart: 0.67, outEnd: 0.85, enterX: 18, exitX: 20, exitY: 16 },
  ];

  const photos = photoConfigs.map((cfg) =>
    buildMotionState(p, {
      ...cfg,
      enterScale: 0.97,
      exitScale: 0.97,
    })
  ) as Block02State['photos'];

  const grafBase = buildMotionState(p, {
    inStart: 0.03,
    inEnd: 0.19,
    outStart: 0.68,
    outEnd: 0.90,
    enterY: 16,
    exitY: -14,
    maxBlur: 0,
  });
  const ambientY = Math.sin(clamp((p - 0.2) / 0.45, 0, 1) * Math.PI) * 5;

  const grafSecBase = buildMotionState(p, {
    inStart: 0.01,
    inEnd: 0.17,
    outStart: 0.66,
    outEnd: 0.92,
    enterX: 20,
    enterY: -14,
    exitX: -14,
    exitY: 12,
    enterScale: 0.97,
    maxBlur: 0,
  });
  const ambientSecondaryY = Math.sin(clamp((p - 0.15) / 0.55, 0, 1) * Math.PI) * -5;

  return {
    textPanel,
    photos,
    grafismo: { ...grafBase, ambientY },
    grafismoSecondary: { ...grafSecBase, ambientY: ambientSecondaryY },
    interactive: textPanel.opacity > 0.15,
  };
}

/* ============================================================================
   BLOCO 03 — IDENTIDADE
   Revelação das 4 fotos verticais de baixo para cima com stagger e máscara,
   parallax sutil entre camadas, texto translúcido, saída progressiva.
   ============================================================================ */
export interface Block03State {
  textPanel: ElementVisualState;
  photos: [
    ElementVisualState & { clipBottomPercent: number },
    ElementVisualState & { clipBottomPercent: number },
    ElementVisualState & { clipBottomPercent: number },
    ElementVisualState & { clipBottomPercent: number },
  ];
  grafismo: ElementVisualState & { ambientY: number };
  grafismoSecondary: ElementVisualState & { ambientY: number };
  interactive: boolean;
}

export function computeBlock03State(pRaw: number): Block03State {
  const p = clamp(pRaw, 0, 1);

  const textPanel = buildMotionState(p, {
    inStart: 0.02,
    inEnd: 0.17,
    outStart: 0.65,
    outEnd: 0.82,
    enterY: 22,
    exitY: -16,
    maxBlur: 4,
  });

  const slots = [
    { inStart: 0.0, inEnd: 0.14, outStart: 0.66, outEnd: 0.83, enterY: 26, exitY: -20 },
    { inStart: 0.04, inEnd: 0.16, outStart: 0.68, outEnd: 0.84, enterY: 32, exitY: -14 },
    { inStart: 0.08, inEnd: 0.18, outStart: 0.67, outEnd: 0.85, enterY: 28, exitY: -22 },
    { inStart: 0.11, inEnd: 0.20, outStart: 0.70, outEnd: 0.86, enterY: 34, exitY: -16 },
  ];

  const photos = slots.map((s) => {
    const base = buildMotionState(p, {
      inStart: s.inStart,
      inEnd: s.inEnd,
      outStart: s.outStart,
      outEnd: s.outEnd,
      enterY: s.enterY,
      exitY: s.exitY,
      enterScale: 0.985,
      exitScale: 0.98,
    });
    const inMix = easeOutCubic(clamp((p - s.inStart) / Math.max(0.0001, s.inEnd - s.inStart), 0, 1));
    return {
      ...base,
      clipBottomPercent: (1 - inMix) * 24,
    };
  }) as Block03State['photos'];

  const grafBase = buildMotionState(p, {
    inStart: 0.02,
    inEnd: 0.18,
    outStart: 0.67,
    outEnd: 0.90,
    enterY: 14,
    exitY: -12,
    maxBlur: 0,
  });
  const ambientY = Math.sin(clamp((p - 0.2) / 0.45, 0, 1) * Math.PI) * -4;

  const grafSecBase = buildMotionState(p, {
    inStart: 0.04,
    inEnd: 0.20,
    outStart: 0.69,
    outEnd: 0.94,
    enterX: -20,
    enterY: 16,
    exitY: -16,
    enterScale: 0.96,
    maxBlur: 0,
  });
  const ambientSecondaryY = Math.cos(clamp((p - 0.2) / 0.5, 0, 1) * Math.PI) * 4;

  return {
    textPanel,
    photos,
    grafismo: { ...grafBase, ambientY },
    grafismoSecondary: { ...grafSecBase, ambientY: ambientSecondaryY },
    interactive: textPanel.opacity > 0.15,
  };
}

/* ============================================================================
   BLOCO 04 — MATÉRIA
   Revelação sequencial de pequenos grupos de fotografias com máscaras
   acompanhando a orientação das imagens, contemplação prolongada.
   ============================================================================ */
export interface Block04State {
  textPanel: ElementVisualState;
  photos: [
    ElementVisualState & { clipInsetPercent: number },
    ElementVisualState & { clipInsetPercent: number },
    ElementVisualState & { clipInsetPercent: number },
    ElementVisualState & { clipInsetPercent: number },
    ElementVisualState & { clipInsetPercent: number },
    ElementVisualState & { clipInsetPercent: number },
  ];
  grafismo: ElementVisualState & { ambientY: number };
  grafismoSecondary: ElementVisualState & { ambientY: number };
  interactive: boolean;
}

export function computeBlock04State(pRaw: number): Block04State {
  const p = clamp(pRaw, 0, 1);

  const textPanel = buildMotionState(p, {
    inStart: 0.0,
    inEnd: 0.16,
    outStart: 0.66,
    outEnd: 0.83,
    enterY: 20,
    exitY: -14,
    maxBlur: 4,
  });

  // Três duplas entrando em sequência dentro de [0, 0.20] e saindo suavemente em [0.66, 0.86]
  const groupWindows = [
    { inStart: 0.02, inEnd: 0.13, outStart: 0.66, outEnd: 0.82, enterX: -16, enterY: 12 },
    { inStart: 0.03, inEnd: 0.14, outStart: 0.67, outEnd: 0.83, enterX: 16, enterY: 10 },
    { inStart: 0.07, inEnd: 0.17, outStart: 0.68, outEnd: 0.84, enterX: -12, enterY: 16 },
    { inStart: 0.08, inEnd: 0.18, outStart: 0.69, outEnd: 0.85, enterX: 14, enterY: 14 },
    { inStart: 0.11, inEnd: 0.20, outStart: 0.70, outEnd: 0.86, enterX: -14, enterY: 16 },
    { inStart: 0.12, inEnd: 0.20, outStart: 0.71, outEnd: 0.86, enterX: 16, enterY: 14 },
  ];

  const photos = groupWindows.map((g) => {
    const base = buildMotionState(p, {
      inStart: g.inStart,
      inEnd: g.inEnd,
      outStart: g.outStart,
      outEnd: g.outEnd,
      enterX: g.enterX,
      enterY: g.enterY,
      exitY: -12,
      enterScale: 0.97,
      exitScale: 0.98,
    });
    const inMix = easeOutCubic(clamp((p - g.inStart) / Math.max(0.0001, g.inEnd - g.inStart), 0, 1));
    return {
      ...base,
      clipInsetPercent: (1 - inMix) * 14,
    };
  }) as Block04State['photos'];

  const grafBase = buildMotionState(p, {
    inStart: 0.02,
    inEnd: 0.19,
    outStart: 0.68,
    outEnd: 0.90,
    enterScale: 0.97,
    exitScale: 0.98,
    maxBlur: 0,
  });
  const ambientY = Math.sin(clamp((p - 0.2) / 0.45, 0, 1) * Math.PI) * 4;

  const grafSecBase = buildMotionState(p, {
    inStart: 0.05,
    inEnd: 0.21,
    outStart: 0.70,
    outEnd: 0.94,
    enterX: 22,
    enterY: 14,
    exitX: -14,
    enterScale: 0.96,
    exitScale: 0.98,
    maxBlur: 0,
  });
  const ambientSecondaryY = Math.sin(clamp((p - 0.18) / 0.5, 0, 1) * Math.PI) * -5;

  return {
    textPanel,
    photos,
    grafismo: { ...grafBase, ambientY },
    grafismoSecondary: { ...grafSecBase, ambientY: ambientSecondaryY },
    interactive: textPanel.opacity > 0.15,
  };
}

/* ============================================================================
   BLOCO 05 — AUTORAIS
   Entrada escalonada das 3 camisetas (translação vertical + escala suave),
   identificações aparecendo após suas respectivas peças, contemplação integral.
   ============================================================================ */
export interface Block05State {
  headerPanel: ElementVisualState;
  tees: [ElementVisualState, ElementVisualState, ElementVisualState];
  captions: [ElementVisualState, ElementVisualState, ElementVisualState];
  grafismo: ElementVisualState & { ambientY: number };
  grafismoSecondary: ElementVisualState & { ambientY: number };
  interactive: boolean;
}

export function computeBlock05State(pRaw: number): Block05State {
  const p = clamp(pRaw, 0, 1);

  const headerPanel = buildMotionState(p, {
    inStart: 0.0,
    inEnd: 0.15,
    outStart: 0.65,
    outEnd: 0.82,
    enterY: 18,
    exitY: -14,
    maxBlur: 4,
  });

  const teeConfigs = [
    { inStart: 0.03, inEnd: 0.14, outStart: 0.66, outEnd: 0.83 },
    { inStart: 0.06, inEnd: 0.17, outStart: 0.68, outEnd: 0.84 },
    { inStart: 0.09, inEnd: 0.19, outStart: 0.70, outEnd: 0.86 },
  ];

  const tees = teeConfigs.map((cfg) =>
    buildMotionState(p, {
      ...cfg,
      enterY: 26,
      exitY: -18,
      enterScale: 0.94,
      exitScale: 0.96,
    })
  ) as Block05State['tees'];

  const captions = teeConfigs.map((cfg) =>
    buildMotionState(p, {
      inStart: cfg.inStart + 0.04,
      inEnd: Math.min(0.20, cfg.inEnd + 0.03),
      outStart: cfg.outStart - 0.02,
      outEnd: cfg.outEnd - 0.02,
      enterY: 10,
      exitY: -8,
    })
  ) as Block05State['captions'];

  const grafBase = buildMotionState(p, {
    inStart: 0.02,
    inEnd: 0.19,
    outStart: 0.68,
    outEnd: 0.90,
    enterX: -16,
    exitX: 14,
    maxBlur: 0,
  });
  const ambientY = Math.sin(clamp((p - 0.2) / 0.45, 0, 1) * Math.PI) * -4;

  const grafSecBase = buildMotionState(p, {
    inStart: 0.01,
    inEnd: 0.17,
    outStart: 0.67,
    outEnd: 0.92,
    enterX: -18,
    enterY: -16,
    exitY: 14,
    enterScale: 0.97,
    maxBlur: 0,
  });
  const ambientSecondaryY = Math.cos(clamp((p - 0.2) / 0.45, 0, 1) * Math.PI) * 5;

  return {
    headerPanel,
    tees,
    captions,
    grafismo: { ...grafBase, ambientY },
    grafismoSecondary: { ...grafSecBase, ambientY: ambientSecondaryY },
    interactive: headerPanel.opacity > 0.15,
  };
}

/* ============================================================================
   BLOCO 06 — COMUNIDADE & ENCERRAMENTO
   0.00–0.20 : Entrada progressiva das fotos coletivas e manifesto
   0.20–0.55 : Contemplação da composição coletiva
   0.55–0.75 : Desaparecimento suave das fotos, revelando a assinatura final
   0.75–1.00 : Contemplação final com logo, manifesto final e CTA interativo
               (NUNCA desaparece antes de o usuário interagir com o CTA!)
   ============================================================================ */
export interface Block06State {
  collectivePanel: ElementVisualState;
  photos: [ElementVisualState, ElementVisualState, ElementVisualState];
  closingSignature: ElementVisualState;
  grafismoLeft: ElementVisualState & { ambientY: number };
  grafismoRight: ElementVisualState & { ambientY: number };
  ctaInteractive: boolean;
}

export function computeBlock06State(pRaw: number): Block06State {
  const p = clamp(pRaw, 0, 1);

  const collectivePanel = buildMotionState(p, {
    inStart: 0.0,
    inEnd: 0.16,
    outStart: 0.56,
    outEnd: 0.72,
    enterY: 20,
    exitY: -16,
    maxBlur: 4,
  });

  const photoConfigs = [
    { inStart: 0.02, inEnd: 0.15, outStart: 0.55, outEnd: 0.72, enterY: 22, exitY: -18 },
    { inStart: 0.06, inEnd: 0.18, outStart: 0.58, outEnd: 0.74, enterY: 24, exitY: -14 },
    { inStart: 0.09, inEnd: 0.20, outStart: 0.60, outEnd: 0.75, enterY: 20, exitY: -20 },
  ];

  const photos = photoConfigs.map((cfg) =>
    buildMotionState(p, {
      ...cfg,
      enterScale: 0.97,
      exitScale: 0.96,
    })
  ) as Block06State['photos'];

  // Assinatura final entra entre 0.60 e 0.76 e permanece 100% estável até 1.00
  const sigIn = easeOutCubic(clamp((p - 0.60) / 0.16, 0, 1));
  const closingSignature: ElementVisualState = {
    opacity: sigIn,
    x: 0,
    y: 22 * (1 - sigIn),
    scale: 0.97 + 0.03 * sigIn,
    blurPx: 4 * (1 - sigIn),
  };

  const grafLeftIn = easeOutCubic(clamp((p - 0.03) / 0.15, 0, 1));
  const grafRightAct1In = easeOutCubic(clamp((p - 0.06) / 0.16, 0, 1));
  const act2Blend = easeInOutCubic(clamp((p - 0.60) / 0.16, 0, 1));

  return {
    collectivePanel,
    photos,
    closingSignature,
    grafismoLeft: {
      opacity: grafLeftIn * (1 - 0.28 * act2Blend),
      x: -20 * (1 - grafLeftIn),
      y: 0,
      scale: 1,
      blurPx: 0,
      ambientY: Math.sin(p * Math.PI * 1.5) * 4,
    },
    grafismoRight: {
      opacity: grafRightAct1In * (0.78 + 0.22 * act2Blend),
      x: 20 * (1 - grafRightAct1In),
      y: 0,
      scale: 0.96 + 0.04 * grafRightAct1In,
      blurPx: 0,
      ambientY: Math.cos(p * Math.PI * 1.5) * -4,
    },
    ctaInteractive: sigIn > 0.35,
  };
}
