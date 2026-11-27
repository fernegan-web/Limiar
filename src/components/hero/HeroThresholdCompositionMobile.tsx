import React, { useRef } from 'react';
import type { MotionValue } from 'motion/react';
import { useThresholdPointer } from '../../motion/ThresholdMotionProvider';
import type { HeroCollapseRefs } from './HeroThresholdComposition';
import { MobileBlackHole } from './MobileBlackHole';

interface HeroThresholdCompositionMobileProps {
  modelAlt: string;
  progressMv?: MotionValue<number>;
  collapseRefs?: HeroCollapseRefs;
}

/**
 * Composição Mobile-First dedicada do Hero Limiar:
 * - Renderiza exclusivamente MobileBlackHole (camadas pré-renderizadas + GPU compositor).
 * - Zero WebGL, zero molas useSpring de ponteiro, zero filtros blur() dinâmicos.
 * - Crossfade de desfoque da moldura tribal via asset pré-desfocado (hero-wreath-640-blur.webp).
 */
export function HeroThresholdCompositionMobile({
  modelAlt,
  progressMv,
  collapseRefs,
}: HeroThresholdCompositionMobileProps) {
  const { portalRevealed } = useThresholdPointer();
  const frontBlackholeHostRef = useRef<HTMLDivElement | null>(null);
  const restoredPastRest = (progressMv?.get() ?? 0) > 0.1;
  const entranceStyle: React.CSSProperties = {
    opacity: portalRevealed ? 1 : 0,
    transform: portalRevealed ? 'translate3d(0, 0, 0) scale(1)' : 'translate3d(0, 0, 0) scale(0.96)',
    transition: restoredPastRest
      ? 'none'
      : 'opacity 480ms cubic-bezier(0.22, 1, 0.36, 1), transform 480ms cubic-bezier(0.22, 1, 0.36, 1)',
  };

  return (
    <div
      ref={collapseRefs?.compositionRef}
      className="relative w-full max-w-[540px] lg:max-w-[610px] min-h-[360px] sm:min-h-[460px] lg:min-h-[540px] flex items-end justify-center select-none"
    >
      {/* CAMADAS 02 + 03 — SINGULARIDADE & MOLDURA WREATH TRASEIRAS */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[41.5%] sm:top-[43.2%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[148%] sm:w-[156%] lg:w-[156%] aspect-[1.32/1] max-w-none z-0 flex items-center justify-center"
      >
        <div className="relative w-full h-full flex items-center justify-center">
          {/* CAMADA 03 — BURACO NEGRO TRASEIRO + HORIZONTE DE EVENTOS */}
          <div
            ref={collapseRefs?.blackholeOuterRef}
            data-hero-layer="blackhole"
            className="absolute inset-0 z-10 flex items-center justify-center will-change-transform origin-center"
          >
            <div style={entranceStyle} className="w-full">
              <div
                className="limiar-blackhole-pulse"
                style={!portalRevealed ? { animationPlayState: 'paused' } : undefined}
              >
                <MobileBlackHole
                  progressMv={progressMv}
                  frontContainerRef={frontBlackholeHostRef}
                />
              </div>
            </div>
          </div>

          {/* CAMADA 02 — MOLDURA WREATH CYBERSIGILISM (ATRÁS DE TODO O BURACO NEGRO) */}
          <div
            ref={collapseRefs?.wreathTransformRef}
            data-hero-layer="cybersigilism"
            className="relative w-[70.27%] sm:w-[70.51%] aspect-square flex items-center justify-center will-change-transform origin-center z-0"
          >
            <div
              ref={collapseRefs?.wreathRotateRef}
              className="w-full h-full will-change-transform origin-center"
            >
              <div style={entranceStyle} className="relative w-full h-full">
                <picture>
                  <source
                    srcSet="/assets/hero-wreath-640.webp 640w, /assets/hero-wreath-960.webp 960w"
                    sizes="(max-width: 640px) 104vw, 680px"
                    type="image/webp"
                  />
                  <img
                    src="/assets/aistudio/Moldura_Wreath_Cibern_tica_Prateada_78a3f5f9.png"
                    alt=""
                    width={1254}
                    height={1254}
                    decoding="async"
                    fetchPriority="high"
                    draggable={false}
                    className="w-full h-full block object-contain opacity-[0.84] dark:opacity-[0.88] dark:brightness-[1.02] dark:contrast-[1.06]"
                  />
                </picture>

                {/* Substituição econômica para blur dinâmico: crossfade com asset pré-desfocado */}
                <img
                  ref={collapseRefs?.wreathBlurOverlayRef}
                  src="/assets/hero-wreath-640-blur.webp"
                  alt=""
                  width={640}
                  height={640}
                  decoding="async"
                  draggable={false}
                  style={{ opacity: 0 }}
                  className="pointer-events-none absolute inset-0 w-full h-full block object-contain will-change-[opacity]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CAMADA 04 — MODELO OFICIAL LIMIAR */}
      <div
        ref={collapseRefs?.modelCollapseRef}
        className="pointer-events-none absolute inset-x-0 mx-auto bottom-[21%] sm:bottom-[22%] z-20 w-[94%] sm:w-[88%] lg:w-[95%] max-w-[540px] will-change-transform origin-center"
      >
        <div
          data-hero-layer="model"
          className="w-full"
          style={{
            opacity: portalRevealed ? 1 : 0,
            transform: portalRevealed ? 'translate3d(0, 0, 0)' : 'translate3d(0, 14px, 0)',
            transition: restoredPastRest
              ? 'none'
              : 'opacity 480ms cubic-bezier(0.22, 1, 0.36, 1) 80ms, transform 480ms cubic-bezier(0.22, 1, 0.36, 1) 80ms',
          }}
        >
          <picture>
            <source
              srcSet="/assets/hero-model-640.webp 640w, /assets/hero-model-1080.webp 1080w"
              sizes="(max-width: 640px) 94vw, 540px"
              type="image/webp"
            />
            <img
              src="/assets/hero-model.png"
              alt={modelAlt}
              width={1312}
              height={1199}
              decoding="async"
              fetchPriority="high"
              draggable={false}
              className="w-full h-auto block object-contain object-bottom [mask-image:linear-gradient(to_bottom,black_0%,black_85%,transparent_100%)]"
            />
          </picture>
        </div>
      </div>

      {/* CAMADA 05 — MATÉRIA ORBITAL FRONTAL (ACIMA DA MODELO) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[41.5%] sm:top-[43.2%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[148%] sm:w-[156%] lg:w-[156%] aspect-[1.32/1] max-w-none z-30 flex items-center justify-center"
      >
        <div className="relative w-full h-full flex items-center justify-center">
          <div
            ref={collapseRefs?.blackholeFrontOuterRef}
            data-hero-layer="blackhole-front"
            className="absolute inset-0 flex items-center justify-center will-change-transform origin-center"
          >
            <div style={entranceStyle} className="w-full h-full">
              <div
                className="limiar-blackhole-pulse w-full h-full"
                style={!portalRevealed ? { animationPlayState: 'paused' } : undefined}
              >
                <div
                  ref={frontBlackholeHostRef}
                  className="w-full h-full opacity-0"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
