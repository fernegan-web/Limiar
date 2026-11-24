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
    const updateMetrics = () => {
      const containerEl = containerRef.current;
      const imgEl = imageRef.current;
      if (!containerEl || !imgEl) return;

      const pageHeight = containerEl.getBoundingClientRect().height;
      const viewportHeight = window.innerHeight || 900;
      const imgRectWidth = imgEl.getBoundingClientRect().width;
      const naturalImgHeight = imgRectWidth > 0 ? imgRectWidth * 1.5 : viewportHeight * 1.5;

      const travel = computeGlobalBgScrollTravel(
        pageHeight,
        viewportHeight,
        naturalImgHeight
      );
      maxTravelMv.set(travel);
    };

    updateMetrics();

    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => updateMetrics())
        : null;

    if (ro) {
      if (containerRef.current) ro.observe(containerRef.current);
      if (imageRef.current) ro.observe(imageRef.current);
    }

    window.addEventListener('resize', updateMetrics, { passive: true });
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', updateMetrics);
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
          <img
            ref={imageRef}
            src={GLOBAL_NEOTRIBAL_ASSET}
            alt=""
            draggable={false}
            className="w-full h-auto block opacity-[0.62] dark:opacity-[0.46] [mask-image:linear-gradient(to_bottom,transparent_0%,black_3%,black_97%,transparent_100%)] transition-opacity duration-[520ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
