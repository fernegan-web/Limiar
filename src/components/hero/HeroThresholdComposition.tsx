import React from 'react';
import { motion, useSpring, useTransform } from 'motion/react';
import { useThresholdPointer } from '../../motion/ThresholdMotionProvider';
import { HERO_PARALLAX_LAYERS, THRESHOLD_EASE } from '../../motion/thresholdConfig';

interface HeroThresholdCompositionProps {
  modelAlt: string;
}

/**
 * Composição tridimensional oficial do Hero:
 * - Camada 02 (fundo): Buraco negro monumental com movimento inverso lento e pulsação cósmica.
 * - Camada 03 (intermediária): Cybersigilism circular vazado com velocidade própria e rotação sutil.
 * - Camada 04 (primeiro plano): Modelo oficial Limiar acompanhando o cursor em tempo próximo.
 *
 * Os wrappers de entrada, pulsação ambiental e parallax são separados para nunca reiniciar
 * animações de entrada ou conflitar transformações CSS/Motion.
 */
export function HeroThresholdComposition({ modelAlt }: HeroThresholdCompositionProps) {
  const { nx, ny, reducedMotion, portalRevealed } = useThresholdPointer();
  const shouldPlayEntrance = reducedMotion || portalRevealed;

  // Camada 02 — Buraco negro (direção oposta, interpolação mais lenta)
  const bhTargetX = useTransform(
    nx,
    [-1, 1],
    reducedMotion
      ? [0, 0]
      : [-HERO_PARALLAX_LAYERS.blackhole.depthX, HERO_PARALLAX_LAYERS.blackhole.depthX]
  );
  const bhTargetY = useTransform(
    ny,
    [-1, 1],
    reducedMotion
      ? [0, 0]
      : [-HERO_PARALLAX_LAYERS.blackhole.depthY, HERO_PARALLAX_LAYERS.blackhole.depthY]
  );
  const bhX = useSpring(bhTargetX, HERO_PARALLAX_LAYERS.blackhole.spring);
  const bhY = useSpring(bhTargetY, HERO_PARALLAX_LAYERS.blackhole.spring);

  // Camada 03 — Cybersigilism circular (plano intermediário, velocidade própria + rotação)
  const sigilTargetX = useTransform(
    nx,
    [-1, 1],
    reducedMotion
      ? [0, 0]
      : [-HERO_PARALLAX_LAYERS.cybersigilism.depthX, HERO_PARALLAX_LAYERS.cybersigilism.depthX]
  );
  const sigilTargetY = useTransform(
    ny,
    [-1, 1],
    reducedMotion
      ? [0, 0]
      : [-HERO_PARALLAX_LAYERS.cybersigilism.depthY, HERO_PARALLAX_LAYERS.cybersigilism.depthY]
  );
  const sigilTargetRotate = useTransform(
    nx,
    [-1, 1],
    reducedMotion
      ? [0, 0]
      : [
          -HERO_PARALLAX_LAYERS.cybersigilism.maxRotateDeg,
          HERO_PARALLAX_LAYERS.cybersigilism.maxRotateDeg,
        ]
  );
  const sigilX = useSpring(sigilTargetX, HERO_PARALLAX_LAYERS.cybersigilism.spring);
  const sigilY = useSpring(sigilTargetY, HERO_PARALLAX_LAYERS.cybersigilism.spring);
  const sigilRotate = useSpring(sigilTargetRotate, HERO_PARALLAX_LAYERS.cybersigilism.spring);

  // Camada 04 — Modelo oficial (primeiro plano, acompanha o cursor com maior proximidade)
  const modelTargetX = useTransform(
    nx,
    [-1, 1],
    reducedMotion
      ? [0, 0]
      : [-HERO_PARALLAX_LAYERS.model.depthX, HERO_PARALLAX_LAYERS.model.depthX]
  );
  const modelTargetY = useTransform(
    ny,
    [-1, 1],
    reducedMotion
      ? [0, 0]
      : [-HERO_PARALLAX_LAYERS.model.depthY, HERO_PARALLAX_LAYERS.model.depthY]
  );
  const modelX = useSpring(modelTargetX, HERO_PARALLAX_LAYERS.model.spring);
  const modelY = useSpring(modelTargetY, HERO_PARALLAX_LAYERS.model.spring);

  return (
    <div className="relative w-full max-w-[540px] lg:max-w-[610px] min-h-[380px] sm:min-h-[480px] lg:min-h-[540px] flex items-end justify-center select-none">
      {/* ============================================================
          CAMADA 02 — BURACO NEGRO MONUMENTAL (FUNDO)
          ============================================================ */}
      <motion.div
        data-hero-layer="blackhole"
        aria-hidden="true"
        style={reducedMotion ? undefined : { x: bhX, y: bhY }}
        className="pointer-events-none absolute top-[6%] sm:top-[4%] left-1/2 -translate-x-1/2 w-[136%] sm:w-[144%] lg:w-[144%] max-w-none z-0"
      >
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, scale: 0.96 }}
          animate={shouldPlayEntrance ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.52, delay: 0, ease: THRESHOLD_EASE }}
        >
          <div className="limiar-blackhole-pulse">
            <picture>
              <source srcSet="/assets/hero-blackhole.webp" type="image/webp" />
              <img
                src="/assets/hero-blackhole.png"
                alt=""
                draggable={false}
                className="w-full h-auto block object-contain opacity-[0.84] dark:opacity-[0.96] [mask-image:radial-gradient(ellipse_88%_86%_at_50%_50%,black_52%,transparent_94%)] transition-[opacity,filter] duration-[520ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
              />
            </picture>
          </div>
        </motion.div>
      </motion.div>

      {/* ============================================================
          CAMADA 03 — CYBERSIGILISM CIRCULAR (PLANO INTERMEDIÁRIO)
          ============================================================ */}
      <motion.div
        data-hero-layer="cybersigilism"
        aria-hidden="true"
        style={reducedMotion ? undefined : { x: sigilX, y: sigilY, rotate: sigilRotate }}
        className="pointer-events-none absolute top-[1%] sm:top-[-2%] left-1/2 -translate-x-1/2 w-[114%] sm:w-[120%] lg:w-[120%] max-w-none z-10"
      >
        <motion.div
          initial={
            reducedMotion
              ? false
              : { opacity: 0, scale: 0.96, filter: 'blur(4px)' }
          }
          animate={
            shouldPlayEntrance
              ? { opacity: 1, scale: 1, filter: 'blur(0px)' }
              : { opacity: 0, scale: 0.96, filter: 'blur(4px)' }
          }
          transition={{ duration: 0.5, delay: 0.05, ease: THRESHOLD_EASE }}
        >
          <picture>
            <source srcSet="/assets/hero-cybersigilism.webp" type="image/webp" />
            <img
              src="/assets/hero-cybersigilism.png"
              alt=""
              draggable={false}
              className="w-full h-auto block object-contain opacity-[0.68] brightness-[0.84] contrast-[1.08] dark:opacity-[0.74] dark:brightness-100 dark:contrast-100 transition-[opacity,filter] duration-[520ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
            />
          </picture>
        </motion.div>
      </motion.div>

      {/* ============================================================
          CAMADA 04 — MODELO OFICIAL LIMIAR (PRIMEIRO PLANO)
          ============================================================ */}
      <motion.div
        data-hero-layer="model"
        style={reducedMotion ? undefined : { x: modelX, y: modelY }}
        className="relative z-20 w-[94%] sm:w-[88%] lg:w-[95%] max-w-[540px]"
      >
        <motion.div
          initial={
            reducedMotion
              ? false
              : { opacity: 0, y: 14, filter: 'blur(4px)' }
          }
          animate={
            shouldPlayEntrance
              ? { opacity: 1, y: 0, filter: 'blur(0px)' }
              : { opacity: 0, y: 14, filter: 'blur(4px)' }
          }
          transition={{ duration: 0.5, delay: 0.09, ease: THRESHOLD_EASE }}
        >
          <picture>
            <source srcSet="/assets/hero-model.webp" type="image/webp" />
            <img
              src="/assets/hero-model.png"
              alt={modelAlt}
              draggable={false}
              className="w-full h-auto block object-contain object-bottom [mask-image:linear-gradient(to_bottom,black_0%,black_85%,transparent_100%)]"
            />
          </picture>
        </motion.div>
      </motion.div>
    </div>
  );
}
