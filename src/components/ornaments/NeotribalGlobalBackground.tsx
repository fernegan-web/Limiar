import React, { useEffect, useRef, useState } from 'react';
import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import { isNativeScrollOnly } from '../../motion/scrollPhysics';
import { useThresholdPointer } from '../../motion/ThresholdMotionProvider';
import {
  GLOBAL_NEOTRIBAL_BG_MOTION,
  computeGlobalBgScrollTravel,
} from '../../motion/thresholdConfig';

const GLOBAL_NEOTRIBAL_ASSET =
  '/assets/aistudio/Ornamentos_Cybertribais_Luminosos_faef8fd1.png';

/**
 * Camada decorativa neotribal global (atrás de todo o conteúdo do site):
 * - Mobile: camada 100% estática, fixa à viewport (position: fixed; inset: 0),
 *   sem parallax, sem deslocamentos atrelados ao scroll, sem springs, lerp ou
 *   movimentos de cursor, sem loops de RAF ou ResizeObserver, preservando
 *   as proporções, opacidade e adaptação aos temas claro e escuro.
 * - Desktop: preserva integralmente a profundidade vertical vinculada à rolagem
 *   e o parallax sutil oposto ao cursor.
 */
export function NeotribalGlobalBackground() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const { nx, ny, reducedMotion } = useThresholdPointer();
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 767px)').matches || isNativeScrollOnly()
      : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches || isNativeScrollOnly());
    update();
    mq.addEventListener('change', update);
    window.addEventListener('resize', update, { passive: true });
    return () => {
      mq.removeEventListener('change', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  // Parallax oposto ao cursor com mola lenta e retorno suave (apenas Desktop)
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

  // Profundidade vertical sutil vinculada à rolagem completa da página (apenas Desktop)
  const { scrollYProgress } = useScroll();
  const maxTravelMv = useMotionValue(0);
  const scrollOffsetY = useTransform(
    [scrollYProgress, maxTravelMv],
    ([progress, travel]: number[]) => {
      if (reducedMotion || isMobile) return 0;
      return progress * travel;
    }
  );

  useEffect(() => {
    // No mobile, o background é 100% estático e fixo: elimina medições, loops de RAF e observers
    if (isMobile) {
      maxTravelMv.set(0);
      return;
    }

    let rafId = 0;
    let lastTravel = -1;
    let lastVw = typeof window !== 'undefined' ? window.innerWidth : 1440;
    let lastVh = typeof window !== 'undefined' ? window.innerHeight : 900;

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

    const onWindowResize = () => {
      const nextVw = window.innerWidth;
      const nextVh = window.innerHeight || 900;
      if (Math.abs(nextVw - lastVw) < 2 && Math.abs(nextVh - lastVh) < 160) {
        return;
      }
      lastVw = nextVw;
      lastVh = nextVh;
      scheduleMeasure();
    };

    measure();

    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(scheduleMeasure)
        : null;

    if (ro) {
      if (containerRef.current) ro.observe(containerRef.current);
    }

    window.addEventListener('resize', onWindowResize, { passive: true });
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      ro?.disconnect();
      window.removeEventListener('resize', onWindowResize);
    };
  }, [maxTravelMv, isMobile]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none select-none fixed md:absolute inset-0 overflow-hidden z-[2]"
    >
      <motion.div
        data-global-neotribal-scroll="true"
        style={reducedMotion || isMobile ? undefined : { y: scrollOffsetY }}
        className="w-full h-full md:h-auto md:will-change-transform"
      >
        <motion.div
          data-global-neotribal-bg="true"
          style={reducedMotion || isMobile ? undefined : { x: cursorX, y: cursorY }}
          className="relative w-full h-full md:w-[103%] md:-left-[1.5%] md:will-change-transform"
        >
          <picture className="block w-full h-full md:h-auto">
            <source
              srcSet="/assets/global-neotribal-720.webp 720w, /assets/global-neotribal-1024.webp 1024w"
              sizes="(max-width: 767px) 100vw, 103vw"
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
              className="w-full h-full object-cover object-center md:w-full md:h-auto md:object-none block mix-blend-normal opacity-[0.56] dark:opacity-[0.46] [mask-image:linear-gradient(to_bottom,transparent_0%,black_3%,black_97%,transparent_100%)] transition-opacity duration-[520ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
            />
          </picture>
        </motion.div>
      </motion.div>
    </div>
  );
}

