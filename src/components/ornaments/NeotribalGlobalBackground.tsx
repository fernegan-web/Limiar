import React, { useEffect, useRef } from 'react';
import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import { useThresholdPointer } from '../../motion/ThresholdMotionProvider';
import {
  GLOBAL_NEOTRIBAL_BG_MOTION,
  computeGlobalBgScrollTravel,
} from '../../motion/thresholdConfig';

const GLOBAL_NEOTRIBAL_ASSET =
  '/assets/aistudio/Ornamentos_Cybertribais_Luminosos_faef8fd1.png';

/**
 * Camada decorativa neotribal global (atrás de todo o conteúdo do site):
 * - Preserva integralmente a imagem PNG transparente original (2:3), sua
 *   posição, proporção e distribuição de elementos sem distorção ou inversão.
 * - Acompanha toda a extensão da página (do Hero ao Rodapé) com profundidade
 *   vertical vinculada à rolagem.
 * - Integra-se ao parallax magnético em direção oposta ao cursor, com baixa
 *   amplitude e retorno gradual para a posição de origem.
 * - Controla opacidade de forma independente entre os temas Claro e Escuro.
 */
export function NeotribalGlobalBackground() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const { nx, ny, reducedMotion } = useThresholdPointer();

  // Parallax oposto ao cursor com mola lenta e retorno suave
  const targetCursorX = useTransform(
    nx,
    [-1, 1],
    reducedMotion
      ? [0, 0]
      : [-GLOBAL_NEOTRIBAL_BG_MOTION.depthX, GLOBAL_NEOTRIBAL_BG_MOTION.depthX]
  );
  const targetCursorY = useTransform(
    ny,
    [-1, 1],
    reducedMotion
      ? [0, 0]
      : [-GLOBAL_NEOTRIBAL_BG_MOTION.depthY, GLOBAL_NEOTRIBAL_BG_MOTION.depthY]
  );
  const cursorX = useSpring(targetCursorX, GLOBAL_NEOTRIBAL_BG_MOTION.spring);
  const cursorY = useSpring(targetCursorY, GLOBAL_NEOTRIBAL_BG_MOTION.spring);

  // Profundidade vertical sutil vinculada à rolagem completa da página
  const { scrollYProgress } = useScroll();
  const maxTravelMv = useMotionValue(0);
  const scrollOffsetY = useTransform(
    [scrollYProgress, maxTravelMv],
    ([progress, travel]: number[]) => {
      if (reducedMotion) return 0;
      return progress * travel;
    }
  );

  useEffect(() => {
    let rafId = 0;
    let lastTravel = -1;

    const measure = () => {
      rafId = 0;
      const containerEl = containerRef.current;
      const imgEl = imageRef.current;
      if (!containerEl || !imgEl) return;

      const pageHeight = containerEl.offsetHeight;
      const viewportHeight = window.innerHeight || 900;
      const imgWidth = imgEl.offsetWidth;
      const naturalImgHeight = imgWidth > 0 ? imgWidth * 1.5 : viewportHeight * 1.5;

      const travel = computeGlobalBgScrollTravel(
        pageHeight,
        viewportHeight,
        naturalImgHeight
      );
      if (Math.abs(travel - lastTravel) > 0.5) {
        lastTravel = travel;
        maxTravelMv.set(travel);
      }
    };

    const scheduleMeasure = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(measure);
      }
    };

    measure();

    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(scheduleMeasure)
        : null;

    if (ro) {
      if (containerRef.current) ro.observe(containerRef.current);
    }

    window.addEventListener('resize', scheduleMeasure, { passive: true });
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      ro?.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
    };
  }, [maxTravelMv]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none select-none absolute inset-0 overflow-hidden z-[2]"
    >
      <motion.div
        data-global-neotribal-scroll="true"
        style={reducedMotion ? undefined : { y: scrollOffsetY }}
        className="w-full will-change-transform"
      >
        <motion.div
          data-global-neotribal-bg="true"
          style={reducedMotion ? undefined : { x: cursorX, y: cursorY }}
          className="relative w-[103%] -left-[1.5%] will-change-transform"
        >
          <picture className="block w-full">
            <source
              srcSet="/assets/global-neotribal-720.webp 720w, /assets/global-neotribal-1024.webp 1024w"
              sizes="103vw"
              type="image/webp"
            />
            <img
              ref={imageRef}
              src={GLOBAL_NEOTRIBAL_ASSET}
              alt=""
              width={1024}
              height={1536}
              decoding="async"
              draggable={false}
              className="w-full h-auto block mix-blend-normal opacity-[0.56] dark:opacity-[0.46] [mask-image:linear-gradient(to_bottom,transparent_0%,black_3%,black_97%,transparent_100%)] transition-opacity duration-[520ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
            />
          </picture>
        </motion.div>
      </motion.div>
    </div>
  );
}
