import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'motion/react';
import { useRouter } from '../../context/RouterContext';
import {
  getEffectiveScrollY,
  getGlobalTraversalPhase,
  getGlobalTraversalReleaseScrollY,
  isNativeScrollOnly,
  subscribePhysicsScroll,
  subscribeTraversalPhase,
  type TraversalPhase,
} from '../../motion/scrollPhysics';
import type { SingularityIntroFrame } from '../../motion/singularityIntroTimeline';
import { useThresholdPointer } from '../../motion/ThresholdMotionProvider';
import {
  GLOBAL_NEOTRIBAL_BG_MOTION,
} from '../../motion/thresholdConfig';

const GLOBAL_NEOTRIBAL_ASSET =
  '/assets/aistudio/Ornamentos_Cybertribais_Luminosos_faef8fd1.png';

const DESKTOP_PARALLAX_FACTOR = 0.28;

/**
 * Camada decorativa neotribal global:
 * - Mobile: camada 100% estática, permanentemente fixa à viewport (position: fixed; inset: 0),
 *   sem parallax, sem deslocamento de scroll, sem springs ou cálculos.
 * - Desktop:
 *   1. Container permanentemente em position: fixed; inset: 0 em todas as etapas.
 *   2. Durante a travessia e revelação (Estados A, B e C), backgroundY permanece rigorosamente em zero.
 *   3. A liberação da navegação não altera a transformação da imagem.
 *   4. O deslocamento posterior segue estritamente:
 *      freeScroll = Math.max(0, scrollY - releaseScrollY);
 *      backgroundY = -freeScroll * parallaxFactor;
 *   5. Zero compensação de scroll acumulado, zero dependência de scrollYProgress global na homepage,
 *      sem descontinuidade ou saltos.
 */
export function NeotribalGlobalBackground() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const {
    nx,
    ny,
    reducedMotion,
    introActive,
    subscribeIntroTick,
    getLatestIntroFrame,
  } = useThresholdPointer();
  const { pathname } = useRouter();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (!introActive) {
      el.style.opacity = '';
      el.style.visibility = '';
      return;
    }

    const applyBg = (frame: SingularityIntroFrame) => {
      const op = frame.chrome.atmosphereOpacity;
      el.style.opacity = String(op);
      el.style.visibility = op <= 0.001 ? 'hidden' : 'visible';
    };

    applyBg(getLatestIntroFrame());
    return subscribeIntroTick(applyBg);
  }, [introActive, subscribeIntroTick, getLatestIntroFrame]);

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

  // Deslocamento vertical determinístico com referência espacial estável pós-travessia
  const scrollOffsetY = useMotionValue(0);
  const phaseRef = useRef<TraversalPhase>(getGlobalTraversalPhase());

  const syncScroll = () => {
    if (typeof window === 'undefined') return;
    if (isMobile || reducedMotion) {
      scrollOffsetY.set(0);
      return;
    }

    const isHome = pathnameRef.current === '/';
    const currentPhase = isHome ? phaseRef.current : 'free-navigation';

    // Durante Estados A, B e C na Home (hero-fixed, traversal-active, collections-reveal),
    // backgroundY permanece rigorosamente em zero.
    if (isHome && currentPhase !== 'free-navigation') {
      scrollOffsetY.set(0);
      return;
    }

    const scrollY = getEffectiveScrollY();
    const releaseScrollY = isHome ? getGlobalTraversalReleaseScrollY() : 0;
    const freeScroll = Math.max(0, scrollY - releaseScrollY);

    if (freeScroll <= 0.5) {
      scrollOffsetY.set(0);
      return;
    }

    const vh = window.innerHeight || 900;
    const vw = window.innerWidth || 1440;

    // Dimensões reais da imagem neotribal no desktop (aspect ratio 1.5 sobre largura 103vw)
    const imgEl = imageRef.current;
    const naturalImageHeight =
      imgEl && imgEl.offsetHeight > 0
        ? imgEl.offsetHeight
        : Math.round(vw * 1.03 * 1.5);
    const maxImageOverflow = Math.max(0, naturalImageHeight - vh);

    const backgroundY = -Math.min(maxImageOverflow, freeScroll * DESKTOP_PARALLAX_FACTOR);

    scrollOffsetY.set(Number(backgroundY.toFixed(2)));
  };

  useEffect(() => {
    pathnameRef.current = pathname;
    if (pathname !== '/') {
      phaseRef.current = 'free-navigation';
    } else {
      phaseRef.current = getGlobalTraversalPhase();
    }
    syncScroll();
  }, [pathname]);

  useEffect(() => {
    // No mobile, o background é 100% estático e fixo: zero listeners e zero cálculos
    if (isMobile) {
      scrollOffsetY.set(0);
      return;
    }

    syncScroll();

    const unsubScroll = subscribePhysicsScroll(syncScroll);
    const unsubPhase = subscribeTraversalPhase((nextPhase) => {
      phaseRef.current = nextPhase;
      syncScroll();
    });

    const onWindowResize = () => {
      syncScroll();
    };

    window.addEventListener('resize', onWindowResize, { passive: true });
    window.addEventListener('scroll', syncScroll, { passive: true });

    return () => {
      unsubScroll();
      unsubPhase();
      window.removeEventListener('resize', onWindowResize);
      window.removeEventListener('scroll', syncScroll);
    };
  }, [isMobile, reducedMotion, scrollOffsetY]);

  return (
    <div
      ref={containerRef}
      style={introActive ? { opacity: 0, visibility: 'hidden' } : undefined}
      aria-hidden="true"
      className="pointer-events-none select-none fixed inset-0 overflow-hidden z-[2]"
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
              onLoad={syncScroll}
              className="w-full h-full object-cover object-center md:w-full md:h-auto md:min-h-screen md:object-none block mix-blend-normal opacity-[0.56] dark:opacity-[0.46] [mask-image:linear-gradient(to_bottom,transparent_0%,black_3%,black_97%,transparent_100%)] transition-opacity duration-[520ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
            />
          </picture>
        </motion.div>
      </motion.div>
    </div>
  );
}



