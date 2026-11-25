import React, { useCallback, useEffect, useRef } from 'react';
import { UNIVERSO_ASSETS } from '../../data/universoLimiarAssets';
import { computeScene02IdentityGallery } from '../../motion/universoTimeline';
import { useThresholdPointer } from '../../motion/ThresholdMotionProvider';
import { clamp } from '../../motion/thresholdConfig';
import { EclipseSigil } from '../ornaments/CybersigilismOrnaments';
import type { UniversoSceneProps } from './Scene01FraturaDimensional';

/**
 * CENA 02 — GALERIA DE IDENTIDADES
 * Câmera virtual percorrendo spline cúbica 3D (Catmull-Rom) através de planos
 * editoriais, fotografias e recorte transparente da modelo oficial em múltiplas
 * profundidades, com oclusão real, platôs de leitura e mergulho final em "SER.".
 */
export function Scene02GaleriaIdentidades({ isMobile, registerApply }: UniversoSceneProps) {
  const { nx, ny, reducedMotion } = useThresholdPointer();
  const worldRef = useRef<HTMLDivElement | null>(null);
  const anchor0Ref = useRef<HTMLDivElement | null>(null);
  const anchor1Ref = useRef<HTMLDivElement | null>(null);
  const anchor2Ref = useRef<HTMLDivElement | null>(null);
  const serPortalRef = useRef<HTMLDivElement | null>(null);

  const stabilityRef = useRef(0);
  const pointerOffsetRef = useRef({ x: 0, y: 0 });
  const lastCamRef = useRef(computeScene02IdentityGallery(0, isMobile));
  const activeRef = useRef(false);

  const flushWorldTransform = useCallback(() => {
    if (!worldRef.current) return;
    const cam = lastCamRef.current;
    const px = pointerOffsetRef.current.x * stabilityRef.current;
    const py = pointerOffsetRef.current.y * stabilityRef.current;
    worldRef.current.style.transform = `perspective(1200px) rotateY(${(cam.yawDeg + px * 0.14).toFixed(2)}deg) rotateX(${(cam.pitchDeg - py * 0.1).toFixed(2)}deg) translate3d(${(-cam.camX + px).toFixed(1)}px, ${(-cam.camY + py).toFixed(1)}px, ${-cam.camZ}px)`;
  }, []);

  const apply = useCallback(
    (progress: number, isActive: boolean) => {
      activeRef.current = isActive;
      const p = reducedMotion ? 0.48 : progress;
      const cam = computeScene02IdentityGallery(p, isMobile);
      lastCamRef.current = cam;
      stabilityRef.current = cam.stabilityWeight;

      flushWorldTransform();

      const anchors = [anchor0Ref.current, anchor1Ref.current, anchor2Ref.current];
      anchors.forEach((el, idx) => {
        if (!el) return;
        const op = cam.anchorOpacity[idx] ?? 0;
        el.style.opacity = String(op);
        el.style.transform = `translate3d(0, ${((1 - op) * 16).toFixed(1)}px, 0)`;
      });

      if (serPortalRef.current) {
        serPortalRef.current.style.opacity = String(cam.serPortalOpacity);
        serPortalRef.current.style.transform = `translate3d(0, 0, -1820px) scale(${cam.serPortalScale})`;
      }
    },
    [isMobile, reducedMotion, flushWorldTransform]
  );

  useEffect(() => {
    registerApply(apply);
    apply(0, false);
  }, [registerApply, apply]);

  // Micro-parallax complementar subordinado à janela de estabilidade
  useEffect(() => {
    if (reducedMotion || isMobile) return;
    const unsubX = nx.on('change', (vx) => {
      if (!activeRef.current || stabilityRef.current <= 0.02) return;
      pointerOffsetRef.current.x = clamp(vx * 18, -18, 18);
      flushWorldTransform();
    });
    const unsubY = ny.on('change', (vy) => {
      if (!activeRef.current || stabilityRef.current <= 0.02) return;
      pointerOffsetRef.current.y = clamp(vy * 12, -12, 12);
      flushWorldTransform();
    });
    return () => {
      unsubX();
      unsubY();
    };
  }, [nx, ny, reducedMotion, isMobile, flushWorldTransform]);

  const portrait = UNIVERSO_ASSETS.editorial.identityPortrait;
  const monolith = UNIVERSO_ASSETS.editorial.monolithHero;
  const cutout = UNIVERSO_ASSETS.modelCutouts.officialModel;
  const hoodie = UNIVERSO_ASSETS.textileDetails.voidStitch;
  const eclipse = UNIVERSO_ASSETS.editorial.eclipseHorizon;

  return (
    <div className="relative w-full h-full overflow-hidden bg-[var(--bg-canvas)] select-none">
      {/* Grade arquitetônica sutil ao fundo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(60% 50% at 32% 45%, var(--atmosphere-radial-1) 0%, transparent 70%), radial-gradient(50% 45% at 75% 60%, var(--ornament-accent-acid) 0%, transparent 72%)',
        }}
      />

      {/* Mundo 3D percorrido pela câmera virtual */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          ref={worldRef}
          className="relative w-full h-full flex items-center justify-center will-change-transform"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* PLANO 01 (z = 0): Mesma fotografia contínua entregue pela Cena 01 */}
          <div
            className="absolute w-[90vw] max-w-[920px] h-[66vh] sm:h-[72vh] max-h-[680px] overflow-hidden rounded-[4px] border border-[var(--border-hairline)] shadow-[var(--shadow-elevated)]"
            style={{ transform: 'translate3d(0px, 0px, 0px)' }}
          >
            <img
              src={portrait.src}
              alt={portrait.alt}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
              style={{ objectPosition: portrait.objectPosition }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/20"
            />
          </div>

          {/* PLANO 02 (z = -460): Superfície editorial esquerda com oclusão */}
          <div
            className="absolute w-[68vw] sm:w-[42vw] max-w-[500px] aspect-[4/5] overflow-hidden border border-[var(--border-hairline)] bg-[var(--bg-card-media)] shadow-[var(--shadow-elevated)]"
            style={{
              transform: isMobile
                ? 'translate3d(-115px, -28px, -420px) rotateY(8deg)'
                : 'translate3d(-310px, -24px, -480px) rotateY(10deg)',
            }}
          >
            <img
              src={monolith.src}
              alt={monolith.alt}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
              style={{ objectPosition: monolith.objectPosition }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-tr from-black/60 via-transparent to-transparent"
            />
          </div>

          {/* PLANO 03 (z = -740, foreground relativo): Recorte transparente oficial da modelo */}
          <div
            className="absolute w-[74vw] sm:w-[44vw] max-w-[520px] pointer-events-none"
            style={{
              transform: isMobile
                ? 'translate3d(68px, 42px, -740px) rotateY(-5deg)'
                : 'translate3d(170px, 32px, -780px) rotateY(-6deg)',
            }}
          >
            <img
              src={cutout.src}
              alt={cutout.alt}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-full h-auto object-contain drop-shadow-[0_24px_48px_rgba(0,0,0,0.45)] [mask-image:linear-gradient(to_bottom,black_0%,black_84%,transparent_100%)]"
            />
          </div>

          {/* PLANO 04 (z = -1040, background direito): Atmosfera & peça Void Hoodie */}
          <div
            className="absolute w-[64vw] sm:w-[40vw] max-w-[460px] aspect-[4/5] overflow-hidden border border-[var(--border-hairline)] bg-[var(--bg-card-media)] shadow-[var(--shadow-glass)]"
            style={{
              transform: isMobile
                ? 'translate3d(125px, -36px, -1040px) rotateY(-9deg)'
                : 'translate3d(340px, -44px, -1120px) rotateY(-12deg)',
            }}
          >
            <img
              src={hoodie.src}
              alt={hoodie.alt}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
              style={{ objectPosition: hoodie.objectPosition }}
            />
          </div>

          {/* PLANO 05 (z = -1420): Horizonte amplo em oclusão profunda */}
          <div
            className="absolute w-[84vw] sm:w-[58vw] max-w-[740px] aspect-[16/9] overflow-hidden border border-[var(--border-hairline)] opacity-90"
            style={{
              transform: isMobile
                ? 'translate3d(-40px, 36px, -1380px) rotateY(4deg)'
                : 'translate3d(-120px, 30px, -1460px) rotateY(5deg)',
            }}
          >
            <img
              src={eclipse.src}
              alt={eclipse.alt}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
              style={{ objectPosition: eclipse.objectPosition }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-b from-transparent via-black/15 to-black/55"
            />
          </div>

          {/* PORTAL FINAL DA CÂMERA (z = -1820): Palavra monumental SER. recebendo o mergulho para a Cena 03 */}
          <div
            ref={serPortalRef}
            className="absolute flex items-center justify-center pointer-events-none opacity-0"
            style={{ transform: 'translate3d(0, 0, -1820px) scale(0.68)' }}
          >
            <span className="font-display font-light text-[clamp(5.5rem,22vw,17rem)] leading-none tracking-[-0.04em] uppercase text-[var(--text-primary)]">
              SER.
            </span>
          </div>
        </div>
      </div>

      {/* PLANOS DE LEITURA SINCRONIZADOS COM OS PLATÔS DA CÂMERA */}
      <div className="pointer-events-none relative z-20 w-full h-full mx-auto max-w-[1360px] px-5 sm:px-10">
        {/* Parada 1 */}
        <div
          ref={anchor0Ref}
          className="absolute top-20 sm:top-24 left-5 sm:left-10 max-w-md bg-[var(--bg-glass-strong)] backdrop-blur-md border border-[var(--border-hairline)] p-4 sm:p-5 opacity-0"
        >
          <div className="flex items-center gap-2 text-[var(--accent-uv)] mb-2">
            <EclipseSigil className="w-4 h-4 shrink-0" />
            <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.22em] font-medium">
              CAPÍTULO 01 — IDENTIDADE &amp; EXPRESSÃO
            </span>
          </div>
          <h3 className="font-display font-light text-2xl sm:text-3xl uppercase tracking-[0.02em] text-[var(--text-primary)]">
            O exterior também é interior.
          </h3>
        </div>

        {/* Parada 2 */}
        <div
          ref={anchor1Ref}
          className="absolute bottom-24 sm:bottom-24 right-5 sm:right-10 max-w-md bg-[var(--bg-glass-strong)] backdrop-blur-md border border-[var(--border-hairline)] p-4 sm:p-6 opacity-0"
        >
          <p className="font-display font-light text-xl sm:text-2xl leading-snug text-[var(--text-primary)]">
            Vestir é tornar visível aquilo que nem sempre encontra palavras.
          </p>
        </div>

        {/* Parada 3 */}
        <div
          ref={anchor2Ref}
          className="absolute top-1/2 -translate-y-1/2 left-5 sm:left-12 max-w-sm bg-[var(--bg-glass-strong)] backdrop-blur-md border border-[var(--border-hairline)] p-4 sm:p-5 opacity-0"
        >
          <p className="text-xs sm:text-sm uppercase tracking-[0.2em] text-[var(--accent-acid)] font-medium mb-1">
            IDENTIDADE PLURAL
          </p>
          <p className="font-display font-light text-xl sm:text-2xl text-[var(--text-primary)]">
            Identidades múltiplas. Expressões singulares.
          </p>
        </div>
      </div>
    </div>
  );
}
