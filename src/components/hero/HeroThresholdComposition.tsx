import React, { useRef } from 'react';
import { motion, useSpring, useTransform, type MotionValue } from 'motion/react';
import { useThresholdPointer } from '../../motion/ThresholdMotionProvider';
import type { BlackHoleQualityTier } from '../../motion/gravitationalTimeline';
import { HERO_PARALLAX_LAYERS, THRESHOLD_EASE } from '../../motion/thresholdConfig';
import { ProceduralBlackHole } from './ProceduralBlackHole';

export interface HeroCollapseRefs {
  compositionRef?: React.RefObject<HTMLDivElement | null>;
  blackholeOuterRef?: React.RefObject<HTMLDivElement | null>;
  blackholeFrontOuterRef?: React.RefObject<HTMLDivElement | null>;
  wreathTransformRef?: React.RefObject<HTMLDivElement | null>;
  wreathRotateRef?: React.RefObject<HTMLDivElement | null>;
  wreathBlurRef?: React.RefObject<HTMLDivElement | null>;
  modelCollapseRef?: React.RefObject<HTMLDivElement | null>;
}

interface HeroThresholdCompositionProps {
  modelAlt: string;
  progressMv?: MotionValue<number>;
  onBlackHoleQualityChange?: (tier: BlackHoleQualityTier) => void;
  collapseRefs?: HeroCollapseRefs;
}

/**
 * Composição tridimensional oficial do Hero:
 * - Camada 02 (fundo): Buraco negro procedural em tempo real centralizado atrás da modelo e alinhado à moldura espiral.
 * - Camada 03 (intermediária): Moldura wreath cybersigilism radial em rotação anti-horária contínua.
 * - Camada 04 (primeiro plano): Modelo oficial Limiar acompanhando o cursor em tempo próximo.
 *
 * Os wrappers de posicionamento estático, expansão, rotação, desfoque, parallax e entrada ficam isolados
 * para evitar qualquer conflito entre transforms e filtros da timeline.
 */
export function HeroThresholdComposition({
  modelAlt,
  progressMv,
  onBlackHoleQualityChange,
  collapseRefs,
}: HeroThresholdCompositionProps) {
  const { nx, ny, portalRevealed } = useThresholdPointer();
  const shouldPlayEntrance = portalRevealed;
  const frontBlackholeHostRef = useRef<HTMLDivElement | null>(null);

  // Camada 02 e 03 — Buraco negro e moldura wreath integrados no mesmo centro óptico
  const bhTargetX = useTransform(nx, [-1, 1], [
    -HERO_PARALLAX_LAYERS.blackhole.depthX,
    HERO_PARALLAX_LAYERS.blackhole.depthX,
  ]);
  const bhTargetY = useTransform(ny, [-1, 1], [
    -HERO_PARALLAX_LAYERS.blackhole.depthY,
    HERO_PARALLAX_LAYERS.blackhole.depthY,
  ]);
  const bhX = useSpring(bhTargetX, HERO_PARALLAX_LAYERS.blackhole.spring);
  const bhY = useSpring(bhTargetY, HERO_PARALLAX_LAYERS.blackhole.spring);

  // Camada 04 — Modelo oficial (primeiro plano, acompanha o cursor com maior proximidade)
  const modelTargetX = useTransform(nx, [-1, 1], [
    -HERO_PARALLAX_LAYERS.model.depthX,
    HERO_PARALLAX_LAYERS.model.depthX,
  ]);
  const modelTargetY = useTransform(ny, [-1, 1], [
    -HERO_PARALLAX_LAYERS.model.depthY,
    HERO_PARALLAX_LAYERS.model.depthY,
  ]);
  const modelX = useSpring(modelTargetX, HERO_PARALLAX_LAYERS.model.spring);
  const modelY = useSpring(modelTargetY, HERO_PARALLAX_LAYERS.model.spring);

  return (
    <div
      ref={collapseRefs?.compositionRef}
      className="relative w-full max-w-[540px] lg:max-w-[610px] min-h-[360px] sm:min-h-[460px] lg:min-h-[540px] flex items-end justify-center select-none"
    >
      {/* ============================================================
          CAMADAS 02 + 03 — SINGULARIDADE & MOLDURA WREATH INTEGRADAS
          Compartilham o mesmo centro óptico e exatamente o mesmo
          deslocamento magnético (interpolação e amortecimento idênticos).
          ============================================================ */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[41.5%] sm:top-[43.2%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[148%] sm:w-[156%] lg:w-[156%] aspect-[1.32/1] max-w-none z-0 flex items-center justify-center"
      >
        <motion.div
          style={{ x: bhX, y: bhY }}
          className="relative w-full h-full flex items-center justify-center"
        >
          {/* CAMADA 03 — BURACO NEGRO PROCEDURAL TRASEIRO (ACIMA DA MOLDURA, ATRÁS DA MODELO) */}
          <div
            ref={collapseRefs?.blackholeOuterRef}
            data-hero-layer="blackhole"
            className="absolute inset-0 z-10 flex items-center justify-center will-change-transform origin-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={shouldPlayEntrance ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.52, delay: 0, ease: THRESHOLD_EASE }}
              className="w-full"
            >
              <div
                className="limiar-blackhole-pulse"
                style={!portalRevealed ? { animationPlayState: 'paused' } : undefined}
              >
                <ProceduralBlackHole
                  progressMv={progressMv}
                  onQualityChange={onBlackHoleQualityChange}
                  frontContainerRef={frontBlackholeHostRef}
                />
              </div>
            </motion.div>
          </div>

          {/* CAMADA 02 — MOLDURA WREATH CYBERSIGILISM (ATRÁS DE TODO O BURACO NEGRO, MESMO MAGNETISMO) */}
          <div
            ref={collapseRefs?.wreathTransformRef}
            data-hero-layer="cybersigilism"
            className="relative w-[70.27%] sm:w-[70.51%] aspect-square flex items-center justify-center will-change-transform origin-center z-0"
          >
            <div
              ref={collapseRefs?.wreathRotateRef}
              className="w-full h-full will-change-transform origin-center"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={
                  shouldPlayEntrance
                    ? { opacity: 1, scale: 1 }
                    : { opacity: 0, scale: 0.96 }
                }
                transition={{ duration: 0.5, delay: 0.05, ease: THRESHOLD_EASE }}
                className="w-full h-full"
              >
                <div
                  ref={collapseRefs?.wreathBlurRef}
                  className="w-full h-full will-change-[filter]"
                >
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
                      className="w-full h-full block object-contain mix-blend-normal opacity-[0.84] dark:opacity-[0.88] dark:brightness-[1.02] dark:contrast-[1.06] transition-opacity duration-[520ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                    />
                  </picture>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ============================================================
          CAMADA 04 — MODELO OFICIAL LIMIAR (ENTRE DISCO POSTERIOR E FRONTAL)
          ============================================================ */}
      <div
        ref={collapseRefs?.modelCollapseRef}
        className="pointer-events-none absolute inset-x-0 mx-auto bottom-[21%] sm:bottom-[22%] z-20 w-[94%] sm:w-[88%] lg:w-[95%] max-w-[540px] will-change-transform origin-center"
      >
        <motion.div
          data-hero-layer="model"
          style={{ x: modelX, y: modelY }}
          className="w-full"
        >
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={
              shouldPlayEntrance
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: 14 }
            }
            transition={{ duration: 0.5, delay: 0.09, ease: THRESHOLD_EASE }}
          >
            <picture>
              <source
                srcSet="/assets/hero-model-640.webp 640w, /assets/hero-model-1080.webp 1080w, /assets/hero-model.webp 1312w"
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
          </motion.div>
        </motion.div>
      </div>

      {/* ============================================================
          CAMADA 05 — MATÉRIA ORBITAL FRONTAL (ACIMA DA MODELO E DA MOLDURA)
          Compartilha exatamente o mesmo centro, magnetismo, escala e
          quadro de shader do buraco negro em camada z-30 sincronizada.
          ============================================================ */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[41.5%] sm:top-[43.2%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[148%] sm:w-[156%] lg:w-[156%] aspect-[1.32/1] max-w-none z-30 flex items-center justify-center"
      >
        <motion.div
          style={{ x: bhX, y: bhY }}
          className="relative w-full h-full flex items-center justify-center"
        >
          <div
            ref={collapseRefs?.blackholeFrontOuterRef}
            data-hero-layer="blackhole-front"
            className="absolute inset-0 flex items-center justify-center will-change-transform origin-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={shouldPlayEntrance ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.52, delay: 0, ease: THRESHOLD_EASE }}
              className="w-full h-full"
            >
              <div
                className="limiar-blackhole-pulse w-full h-full"
                style={!portalRevealed ? { animationPlayState: 'paused' } : undefined}
              >
                <div
                  ref={frontBlackholeHostRef}
                  className="w-full h-full opacity-0"
                />
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
