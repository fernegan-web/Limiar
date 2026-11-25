import React, { useCallback, useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { UNIVERSO_ASSETS } from '../../data/universoLimiarAssets';
import {
  computeScene05FrequencyMatter,
  type Scene05FrequencyState,
} from '../../motion/universoTimeline';
import { useThresholdPointer } from '../../motion/ThresholdMotionProvider';
import { EclipseSigil } from '../ornaments/CybersigilismOrnaments';
import type { UniversoSceneProps } from './Scene01FraturaDimensional';

const PHRASES = [
  'O que sentimos também assume forma.',
  'Frequências tornam-se formas.',
  'Formas tornam-se símbolos.',
  'Símbolos tornam-se parte de nós.',
] as const;

/**
 * CENA 05 — FREQUÊNCIA E MATÉRIA
 * Campo procedural em Canvas 2D inspirado em interferência onda-partícula e
 * dupla fenda, com ciclo de vida estritamente suspenso quando fora do capítulo.
 * Intercala fotografias macro de tecidos e estampas alinhadas às linhas do campo.
 */
export function Scene05FrequenciaMateria({ isMobile, registerApply }: UniversoSceneProps) {
  const { theme } = useTheme();
  const { nx, ny, reducedMotion } = useThresholdPointer();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const macroLeftRef = useRef<HTMLDivElement | null>(null);
  const macroRightRef = useRef<HTMLDivElement | null>(null);
  const macroCenterRef = useRef<HTMLDivElement | null>(null);
  const phraseRefs = useRef<(HTMLParagraphElement | null)[]>([]);

  const activeRef = useRef(false);
  const progressRef = useRef(0);
  const stateRef = useRef<Scene05FrequencyState>(
    computeScene05FrequencyMatter(0, isMobile)
  );
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const pointerRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef(0);
  const phaseRef = useRef(0);

  const drawField = useCallback(
    (timePhase: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 1.75);
      const width = canvas.clientWidth || window.innerWidth;
      const height = canvas.clientHeight || window.innerHeight;
      const targetW = Math.max(1, Math.floor(width * dpr));
      const targetH = Math.max(1, Math.floor(height * dpr));

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const st = stateRef.current;
      const isDark = themeRef.current === 'dark';

      const baseInk = isDark ? '232, 231, 224' : '20, 21, 22';
      const uvHex = isDark ? '161, 138, 200' : '131, 100, 180';
      const acidHex = isDark ? '164, 199, 90' : '120, 154, 50';

      const cx = width * 0.5 + pointerRef.current.x * 26 * (1 - st.scatterOut);
      const cy = height * 0.5 + pointerRef.current.y * 18 * (1 - st.scatterOut);

      // Duas fendas simétricas gerando interferência
      const slitGap = (isMobile ? 42 : 76) * (1 - st.centralConvergence * 0.58);
      const s1x = cx - slitGap;
      const s2x = cx + slitGap;

      const lineCount = isMobile ? 24 : 38;
      const stepX = isMobile ? 14 : 16;
      const amp = (isMobile ? 14 : 24) * st.waveAmplitude * (1 - st.suspensionCalm * 0.35);

      for (let i = 0; i < lineCount; i++) {
        const normY = (i / (lineCount - 1)) * 2 - 1; // [-1..1]
        // Compressão espacial localizada perto do centro
        const compressedNorm =
          normY * (1 - st.spatialCompression * 0.38 * (1 - Math.abs(normY)));
        const baseY =
          height * 0.5 +
          compressedNorm * height * 0.42 * (1 - st.centralConvergence * 0.24) +
          st.scatterOut * normY * height * 0.22;

        const isAccentUv = i % 7 === 3;
        const isAccentAcid = i % 11 === 5;
        const strokeColor = isAccentUv
          ? `rgba(${uvHex}, ${(0.28 + st.interferenceBlend * 0.35) * (1 - st.scatterOut * 0.5)})`
          : isAccentAcid
            ? `rgba(${acidHex}, ${(0.24 + st.centralConvergence * 0.36) * (1 - st.scatterOut * 0.5)})`
            : `rgba(${baseInk}, ${(0.12 + st.centralConvergence * 0.16) * (1 - st.scatterOut * 0.65)})`;

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = isAccentUv || isAccentAcid ? 1.25 : 0.9;
        ctx.beginPath();

        for (let x = 0; x <= width + stepX; x += stepX) {
          const dx1 = x - s1x;
          const dx2 = x - s2x;
          const dy = baseY - cy;
          const d1 = Math.sqrt(dx1 * dx1 + dy * dy);
          const d2 = Math.sqrt(dx2 * dx2 + dy * dy);

          const w1 = Math.sin(d1 * 0.036 - timePhase * 1.4);
          const w2 = Math.sin(d2 * 0.036 - timePhase * 1.4);
          const interference = (w1 + w2) * 0.5 * st.interferenceBlend + w1 * (1 - st.interferenceBlend);

          const falloff = Math.exp(-Math.abs(x - cx) / (width * 0.58));
          const scatterJitter =
            st.scatterOut > 0.02
              ? Math.sin(i * 1.7 + x * 0.04) * st.scatterOut * (isMobile ? 28 : 48)
              : 0;
          const y = baseY + interference * amp * falloff + scatterJitter;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      // Partículas em trajetórias curvas acompanhando o campo de interferência
      const particleCount = isMobile ? 48 : 88;
      for (let j = 0; j < particleCount; j++) {
        const seed = j * 13.37;
        const baseAngle = (j / particleCount) * Math.PI * 2 + timePhase * (0.14 + (j % 3) * 0.04);
        const orbitBase =
          ((j % 9) / 9) * (Math.min(width, height) * 0.44) *
          (1 - st.centralConvergence * 0.48) +
          st.scatterOut * (width * 0.34);

        const waveOffset = Math.sin(baseAngle * 3 + timePhase * 1.1) * 18 * st.interferenceBlend;
        const px = cx + Math.cos(baseAngle + seed * 0.05) * (orbitBase + waveOffset);
        const py = cy + Math.sin(baseAngle + seed * 0.05) * (orbitBase * 0.62 - waveOffset * 0.5);

        const radius = j % 5 === 0 ? 2.1 : 1.35;
        const alpha = (0.28 + st.interferenceBlend * 0.48) * (1 - st.scatterOut * 0.72);
        ctx.fillStyle =
          j % 4 === 0
            ? `rgba(${uvHex}, ${alpha})`
            : j % 7 === 0
              ? `rgba(${acidHex}, ${alpha})`
              : `rgba(${baseInk}, ${alpha * 0.75})`;

        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    [isMobile]
  );

  const ensureLoop = useCallback(() => {
    if (
      rafRef.current ||
      !activeRef.current ||
      reducedMotion ||
      (typeof document !== 'undefined' && document.visibilityState === 'hidden')
    ) {
      return;
    }

    let lastTime = performance.now();
    const tick = (now: number) => {
      if (
        !activeRef.current ||
        reducedMotion ||
        (typeof document !== 'undefined' && document.visibilityState === 'hidden')
      ) {
        rafRef.current = 0;
        return;
      }
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const calmFactor = 1 - stateRef.current.suspensionCalm * 0.62;
      phaseRef.current = (phaseRef.current + dt * 1.15 * calmFactor) % 10000;
      drawField(phaseRef.current);
      rafRef.current = window.requestAnimationFrame(tick);
    };
    rafRef.current = window.requestAnimationFrame(tick);
  }, [drawField, reducedMotion]);

  const stopLoop = useCallback(() => {
    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  const apply = useCallback(
    (progress: number, isActive: boolean) => {
      progressRef.current = progress;
      const p = reducedMotion ? 0.58 : progress;
      const st = computeScene05FrequencyMatter(p, isMobile);
      stateRef.current = st;

      if (macroLeftRef.current) {
        macroLeftRef.current.style.opacity = String(st.macroLeftOpacity);
        macroLeftRef.current.style.transform = `translate3d(${st.macroLeftX}px, 0, 0)`;
      }

      if (macroRightRef.current) {
        macroRightRef.current.style.opacity = String(st.macroRightOpacity);
        macroRightRef.current.style.transform = `translate3d(${st.macroRightX}px, 0, 0)`;
      }

      if (macroCenterRef.current) {
        macroCenterRef.current.style.opacity = String(st.macroCenterOpacity);
        macroCenterRef.current.style.transform = `scale(${(0.92 + st.macroCenterOpacity * 0.08).toFixed(3)})`;
      }

      st.phraseWeights.forEach((w, idx) => {
        const el = phraseRefs.current[idx];
        if (!el) return;
        el.style.opacity = String(w);
        el.style.transform = `translate3d(0, ${((1 - w) * 14).toFixed(1)}px, 0)`;
      });

      const wasActive = activeRef.current;
      activeRef.current = isActive;

      if (isActive) {
        if (reducedMotion) {
          drawField(p * Math.PI * 2);
        } else if (!wasActive) {
          drawField(phaseRef.current);
          ensureLoop();
        }
      } else if (wasActive) {
        stopLoop();
      }
    },
    [isMobile, reducedMotion, drawField, ensureLoop, stopLoop]
  );

  useEffect(() => {
    registerApply(apply);
    apply(0, false);
    return () => stopLoop();
  }, [registerApply, apply, stopLoop]);

  useEffect(() => {
    if (reducedMotion || isMobile) return;
    const unsubX = nx.on('change', (vx) => {
      pointerRef.current.x = vx;
    });
    const unsubY = ny.on('change', (vy) => {
      pointerRef.current.y = vy;
    });
    return () => {
      unsubX();
      unsubY();
    };
  }, [nx, ny, reducedMotion, isMobile]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible' && activeRef.current) {
        ensureLoop();
      } else {
        stopLoop();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [ensureLoop, stopLoop]);

  // Redesenha imediatamente se o tema mudar durante a cena ativa
  useEffect(() => {
    if (activeRef.current) {
      drawField(phaseRef.current);
    }
  }, [theme, drawField]);

  const fabricMacro = UNIVERSO_ASSETS.textileDetails.fabricMacro;
  const voidStitch = UNIVERSO_ASSETS.textileDetails.voidStitch;
  const frequencyPrint = UNIVERSO_ASSETS.textileDetails.frequencyPrint;

  return (
    <div className="relative w-full h-full overflow-hidden bg-[var(--bg-canvas)] select-none">
      {/* Canvas 2D Procedural de Interferência Onda-Partícula */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 w-full h-full z-10"
      />

      {/* Macro Fotografia Esquerda: Trama 260g/m² + Serigrafia */}
      <div
        ref={macroLeftRef}
        className="pointer-events-none absolute left-4 sm:left-12 top-24 sm:top-28 w-[56vw] sm:w-[30vw] max-w-[360px] aspect-[4/3] overflow-hidden border border-[var(--border-strong)] bg-[var(--bg-card-media)] shadow-[var(--shadow-glass)] opacity-0 z-20 will-change-transform"
      >
        <img
          src={fabricMacro.src}
          alt={fabricMacro.alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
          style={{ objectPosition: fabricMacro.objectPosition }}
        />
      </div>

      {/* Macro Fotografia Direita: Estrutura & Bordado */}
      <div
        ref={macroRightRef}
        className="pointer-events-none absolute right-4 sm:right-12 bottom-24 sm:bottom-24 w-[52vw] sm:w-[27vw] max-w-[330px] aspect-[4/5] overflow-hidden border border-[var(--border-strong)] bg-[var(--bg-card-media)] shadow-[var(--shadow-glass)] opacity-0 z-20 will-change-transform"
      >
        <img
          src={voidStitch.src}
          alt={voidStitch.alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
          style={{ objectPosition: voidStitch.objectPosition }}
        />
      </div>

      {/* Macro Central na Convergência: Estampa Radial */}
      <div
        ref={macroCenterRef}
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[56vw] sm:w-[26vw] max-w-[320px] aspect-[4/5] overflow-hidden border border-[var(--accent-uv-edge)] bg-[var(--bg-card-media)] shadow-[var(--shadow-elevated)] opacity-0 z-20 will-change-transform"
      >
        <img
          src={frequencyPrint.src}
          alt={frequencyPrint.alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
          style={{ objectPosition: frequencyPrint.objectPosition }}
        />
      </div>

      {/* Frases Sincronizadas ao Campo de Interferência */}
      <div className="pointer-events-none relative z-30 w-full h-full flex flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 flex items-center gap-2 text-[var(--text-muted)]">
          <EclipseSigil className="w-4 h-4 text-[var(--accent-uv)] shrink-0" />
          <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.24em]">
            FREQUÊNCIA &amp; MATÉRIA
          </span>
        </div>

        <div className="relative w-full max-w-2xl h-28 flex items-center justify-center">
          {PHRASES.map((phrase, idx) => (
            <p
              key={phrase}
              ref={(node) => {
                phraseRefs.current[idx] = node;
              }}
              className="absolute inset-x-0 font-display font-light text-2xl sm:text-4xl lg:text-[42px] leading-[1.12] tracking-[0.01em] text-[var(--text-primary)] bg-[var(--bg-glass-strong)]/80 backdrop-blur-md border border-[var(--border-hairline)] px-5 py-3.5 opacity-0 will-change-transform"
            >
              {phrase}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
