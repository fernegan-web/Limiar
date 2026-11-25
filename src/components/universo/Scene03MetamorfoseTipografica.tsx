import React, { useCallback, useEffect, useId, useRef } from 'react';
import { UNIVERSO_ASSETS } from '../../data/universoLimiarAssets';
import { computeScene03TypoMorph } from '../../motion/universoTimeline';
import { useThresholdPointer } from '../../motion/ThresholdMotionProvider';
import { LimiarStar } from '../ornaments/CybersigilismOrnaments';
import type { UniversoSceneProps } from './Scene01FraturaDimensional';

const LETTER_CONFIG = [
  {
    glyph: 'S',
    viewBox: '0 0 240 300',
    x: '120',
    y: '236',
    asset: UNIVERSO_ASSETS.editorial.identityPortrait,
    widthClass: 'w-[28vw] sm:w-[22vw] max-w-[270px]',
  },
  {
    glyph: 'E',
    viewBox: '0 0 240 300',
    x: '120',
    y: '236',
    asset: UNIVERSO_ASSETS.editorial.eclipseHorizon,
    widthClass: 'w-[28vw] sm:w-[22vw] max-w-[270px]',
  },
  {
    glyph: 'R.',
    viewBox: '0 0 290 300',
    x: '145',
    y: '236',
    asset: UNIVERSO_ASSETS.editorial.monolithHero,
    widthClass: 'w-[34vw] sm:w-[26vw] max-w-[320px]',
  },
] as const;

/**
 * CENA 03 — METAMORFOSE TIPOGRÁFICA ("SER.")
 * Tipografia monumental como arquitetura tridimensional: letras se separam em Z,
 * seus contornos operam como máscaras SVG para fotografias com movimento interno
 * independente, o recorte da modelo cruza entre profundidades e a abertura central
 * expande-se até se transformar na superfície inicial da Cena 04.
 */
export function Scene03MetamorfoseTipografica({ isMobile, registerApply }: UniversoSceneProps) {
  const { reducedMotion } = useThresholdPointer();
  const rawId = useId().replace(/:/g, '');

  const leadRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const letterWrapRefs = useRef<(HTMLDivElement | null)[]>([]);
  const innerPhotoRefs = useRef<(SVGGElement | null)[]>([]);
  const cutoutRef = useRef<HTMLDivElement | null>(null);
  const portalSurfaceRef = useRef<HTMLDivElement | null>(null);

  const apply = useCallback(
    (progress: number, _active: boolean) => {
      const p = reducedMotion ? (progress > 0.6 ? 0.92 : 0.35) : progress;
      const state = computeScene03TypoMorph(p, isMobile);

      if (leadRef.current) {
        leadRef.current.style.opacity = String(state.leadPhraseOpacity);
        leadRef.current.style.transform = `translate3d(0, ${((1 - state.leadPhraseOpacity) * -18).toFixed(1)}px, 0)`;
      }

      if (endRef.current) {
        endRef.current.style.opacity = String(state.endPhraseOpacity);
        endRef.current.style.transform = `translate3d(0, ${((1 - state.endPhraseOpacity) * 16).toFixed(1)}px, 0)`;
      }

      state.letters.forEach((lt, idx) => {
        const wrap = letterWrapRefs.current[idx];
        if (wrap) {
          wrap.style.transform = `translate3d(${lt.tx}px, ${lt.ty}px, ${lt.tz}px) rotateY(${lt.rotateYDeg}deg) scale(${lt.scale})`;
        }
        const photoGroup = innerPhotoRefs.current[idx];
        if (photoGroup) {
          photoGroup.setAttribute(
            'transform',
            `translate(${lt.photoDriftX} ${lt.photoDriftY}) scale(${lt.photoScale})`
          );
        }
      });

      if (cutoutRef.current) {
        cutoutRef.current.style.opacity = String(state.crossingCutoutOpacity);
        cutoutRef.current.style.transform = `translate3d(${state.crossingCutoutX}px, ${state.crossingCutoutY}px, 12px) scale(${state.crossingCutoutScale})`;
      }

      if (portalSurfaceRef.current) {
        portalSurfaceRef.current.style.opacity = String(state.portalSurfaceOpacity);
        const insetY = (1 - state.portalExpandScale) * 42;
        const insetX = (1 - state.portalExpandScale) * 44;
        portalSurfaceRef.current.style.clipPath = `inset(${insetY.toFixed(2)}% ${insetX.toFixed(2)}% ${insetY.toFixed(2)}% ${insetX.toFixed(2)}% round ${state.portalExpandRadiusPct}%)`;
      }
    },
    [isMobile, reducedMotion]
  );

  useEffect(() => {
    registerApply(apply);
    apply(0, false);
  }, [registerApply, apply]);

  const darkpsy = UNIVERSO_ASSETS.cultural.darkpsyStage;
  const cutout = UNIVERSO_ASSETS.modelCutouts.officialModel;

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-[var(--bg-canvas)] select-none">
      {/* Frase de abertura */}
      <div
        ref={leadRef}
        className="pointer-events-none absolute top-20 sm:top-24 inset-x-0 z-30 flex justify-center px-6 text-center"
      >
        <p className="max-w-xl text-xs sm:text-sm uppercase tracking-[0.22em] text-[var(--text-secondary)]">
          Entre o que somos e o que mostramos, existe um limiar.
        </p>
      </div>

      {/* Palco 3D das letras arquitetônicas + recorte atravessando entre planos */}
      <div
        className="relative z-10 flex items-center justify-center gap-1 sm:gap-4"
        style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
      >
        {LETTER_CONFIG.map((item, idx) => {
          const clipId = `limiar-typo-clip-${rawId}-${idx}`;
          const zClass = idx === 1 ? 'z-20' : 'z-10';

          return (
            <div
              key={item.glyph}
              ref={(node) => {
                letterWrapRefs.current[idx] = node;
              }}
              className={`relative ${item.widthClass} ${zClass} will-change-transform origin-center`}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <svg
                viewBox={item.viewBox}
                className="w-full h-auto overflow-visible"
                role="img"
                aria-label={item.glyph}
              >
                <defs>
                  <clipPath id={clipId}>
                    <text
                      x={item.x}
                      y={item.y}
                      textAnchor="middle"
                      fontFamily="Manrope, sans-serif"
                      fontWeight="300"
                      fontSize="268"
                      letterSpacing="-10"
                    >
                      {item.glyph}
                    </text>
                  </clipPath>
                </defs>

                <g clipPath={`url(#${clipId})`}>
                  <g
                    ref={(node) => {
                      innerPhotoRefs.current[idx] = node;
                    }}
                  >
                    <image
                      href={item.asset.src}
                      x="-60"
                      y="-40"
                      width="420"
                      height="390"
                      preserveAspectRatio="xMidYMid slice"
                    />
                  </g>
                </g>

                <text
                  x={item.x}
                  y={item.y}
                  textAnchor="middle"
                  fontFamily="Manrope, sans-serif"
                  fontWeight="300"
                  fontSize="268"
                  letterSpacing="-10"
                  fill="none"
                  stroke="var(--border-strong)"
                  strokeWidth="1.25"
                >
                  {item.glyph}
                </text>
              </svg>
            </div>
          );
        })}

        {/* Recorte da modelo cruzando espacialmente entre S/R (fundo) e E (primeiro plano) */}
        <div
          ref={cutoutRef}
          className="pointer-events-none absolute z-[15] w-[54vw] sm:w-[30vw] max-w-[360px] opacity-0 will-change-transform"
        >
          <img
            src={cutout.src}
            alt={cutout.alt}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="w-full h-auto object-contain opacity-95 drop-shadow-[0_20px_36px_rgba(0,0,0,0.4)] [mask-image:linear-gradient(to_bottom,black_0%,black_85%,transparent_100%)]"
          />
        </div>
      </div>

      {/* Frase intermediária */}
      <div
        ref={endRef}
        className="pointer-events-none absolute bottom-12 sm:bottom-16 inset-x-0 z-30 flex items-center justify-center gap-3 px-6 opacity-0"
      >
        <LimiarStar className="w-4 h-4 text-[var(--accent-uv)] shrink-0" />
        <p className="font-display font-light text-lg sm:text-2xl uppercase tracking-[0.16em] text-[var(--text-primary)]">
          Nenhuma forma definitiva.
        </p>
      </div>

      {/* Abertura interna que expande até formar a superfície integral da Cena 04 */}
      <div
        ref={portalSurfaceRef}
        className="pointer-events-none absolute inset-0 z-40 opacity-0 will-change-[clip-path,opacity]"
      >
        <img
          src={darkpsy.src}
          alt={darkpsy.alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
          style={{ objectPosition: darkpsy.objectPosition }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/20 to-black/55"
        />
      </div>
    </div>
  );
}
