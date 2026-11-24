import React from 'react';
import { ThresholdParallaxLayer } from '../../motion/ThresholdPrimitives';
import {
  CybersigilismCorner,
  CybersigilismSpine,
  CybersigilismWeb,
  LimiarStar,
} from './CybersigilismOrnaments';

interface OrnamentsProps {
  className?: string;
}

/**
 * Ornaments — Composição modular de ornamentos neotribais e cybersigilism
 * posicionada nas extremidades da seção Hero, com profundidade espacial sutil.
 *
 * Adapta cor, contraste e baixa opacidade automaticamente pelas variáveis de tema
 * (--ornament-stroke, --ornament-strong, --ornament-accent-uv, --ornament-accent-acid).
 */
export function Ornaments({ className = '' }: OrnamentsProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none absolute inset-x-0 top-0 h-[760px] sm:h-[820px] overflow-hidden ${className}`}
    >
      {/* Plano distante (contra-profundidade sutil) */}
      <ThresholdParallaxLayer
        depthX={-11}
        depthY={-8}
        className="absolute inset-0"
      >
        {/* Extremidade superior esquerda — teia cybersigilism ultravioleta suave */}
        <CybersigilismWeb
          tone="uv"
          className="limiar-ambient-float absolute -top-14 -left-28 w-[360px] h-[360px] sm:w-[480px] sm:h-[480px] opacity-70 dark:opacity-80 [mask-image:radial-gradient(circle_at_35%_35%,black_30%,transparent_78%)]"
        />

        {/* Extremidade superior direita — teia neotribal neutra */}
        <CybersigilismWeb
          tone="neutral"
          className="absolute -top-8 -right-32 w-[410px] h-[410px] sm:w-[540px] sm:h-[540px] rotate-90 opacity-60 dark:opacity-70 [mask-image:radial-gradient(circle_at_60%_38%,black_28%,transparent_76%)]"
        />
      </ThresholdParallaxLayer>

      {/* Plano intermediário (movimento complementar suave) */}
      <ThresholdParallaxLayer
        depthX={7}
        depthY={6}
        className="absolute inset-0"
      >
        {/* Extremidade lateral esquerda inferior — ramificação orgânica neutra */}
        <svg
          viewBox="0 0 260 420"
          fill="none"
          className="hidden md:block absolute top-44 -left-10 w-[210px] h-[340px] opacity-65 dark:opacity-75 [mask-image:linear-gradient(to_right,black_35%,transparent_100%)]"
          style={{ color: 'var(--ornament-stroke)' }}
        >
          <path
            d="M8 24C58 76 82 126 78 198C56 156 32 138 4 142C44 126 68 92 78 38C88 106 118 148 182 178C124 176 94 202 82 276C68 228 42 208 4 218C48 192 64 144 8 24Z"
            fill="currentColor"
            fillOpacity="0.34"
            stroke="currentColor"
            strokeWidth="1"
          />
          <path
            d="M12 246C52 274 74 308 82 368C96 318 122 292 172 288C124 272 98 244 90 198"
            stroke="var(--ornament-accent-uv)"
            strokeWidth="0.95"
          />
        </svg>

        {/* Extremidade direita média — espinha orgânica discreta */}
        <CybersigilismSpine
          tone="uv"
          className="hidden lg:block limiar-ambient-float absolute top-64 right-3 w-10 h-28 opacity-55 dark:opacity-65"
        />

        {/* Extremidade inferior direita — filamento ácido muito sutil */}
        <svg
          viewBox="0 0 320 260"
          fill="none"
          className="hidden sm:block absolute bottom-6 -right-14 w-[260px] h-[220px] opacity-45 dark:opacity-55 [mask-image:radial-gradient(circle_at_70%_70%,black_25%,transparent_80%)]"
          style={{ color: 'var(--ornament-accent-acid)' }}
        >
          <path
            d="M312 248C246 208 202 162 172 96C166 154 134 188 68 206C138 206 184 224 224 256M296 144C244 138 210 118 192 66"
            stroke="currentColor"
            strokeWidth="1"
          />
          <path
            d="M276 220C226 198 198 166 186 120"
            stroke="var(--ornament-stroke)"
            strokeWidth="0.85"
          />
        </svg>

        {/* Detalhes discretos nos cantos superiores */}
        <CybersigilismCorner className="hidden sm:block absolute top-24 left-6 w-12 h-12 opacity-40 dark:opacity-45" />
        <LimiarStar className="hidden md:block absolute top-28 right-14 w-3.5 h-3.5 text-[var(--ornament-strong)] opacity-60" />
      </ThresholdParallaxLayer>
    </div>
  );
}

export default Ornaments;
