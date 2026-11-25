import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CinematicProgressDamper,
  DEFAULT_UNIVERSO_DAMPER_CONFIG,
  getEffectiveScrollY,
  subscribePhysicsScroll,
} from '../../motion/scrollPhysics';
import { Scene01FraturaDimensional } from './Scene01FraturaDimensional';
import { Scene02GaleriaIdentidades } from './Scene02GaleriaIdentidades';
import { Scene03MetamorfoseTipografica } from './Scene03MetamorfoseTipografica';
import { Scene04RupturaCultural } from './Scene04RupturaCultural';
import { Scene05FrequenciaMateria } from './Scene05FrequenciaMateria';
import { Scene06SinteseEncerramento } from './Scene06SinteseEncerramento';

type SceneApplyFn = (progress: number, isActive: boolean) => void;

interface RunwayMetric {
  topDocY: number;
  spanPx: number;
}

const RUNWAY_CLASSES = [
  'limiar-universo-runway-0',
  'limiar-universo-runway-1 -mt-[100dvh]',
  'limiar-universo-runway-2 -mt-[100dvh]',
  'limiar-universo-runway-3 -mt-[100dvh]',
  'limiar-universo-runway-4 -mt-[100dvh]',
  'limiar-universo-runway-5 -mt-[100dvh]',
] as const;

const SCENE_IDS = [
  'universo-cena-01-fratura',
  'universo-cena-02-identidade',
  'universo-cena-03-metamorfose',
  'universo-cena-04-cultura',
  'universo-cena-05-frequencia',
  'universo-cena-06-sintese',
] as const;

/**
 * UNIVERSO LIMIAR — ORQUESTRADOR DO CAPÍTULO 02
 * ---------------------------------------------------------------------------
 * Coordena 6 palcos sticky localizados conectados com continuidade 1:1
 * (zero corredores vazios e sem um único container sticky gigante), agora com
 * amortecimento físico por cena (peso, resistência a flicks e desaceleração).
 *
 * Gerenciamento de ciclo de vida:
 * - Permanece dormente enquanto o visitante está no Capítulo 01 (Hero / Loja).
 * - Ativa exclusivamente a cena visível no momento da rolagem.
 * - Um único loop requestAnimationFrame dirige a convergência do damper ativo
 *   e suspende automaticamente ao assentar ou ao sair de cena.
 */
export function UniversoLimiarExperience() {
  const rootRef = useRef<HTMLElement | null>(null);
  const runwayRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stickyRefs = useRef<(HTMLDivElement | null)[]>([]);
  const applyFnsRef = useRef<(SceneApplyFn | null)[]>([
    null,
    null,
    null,
    null,
    null,
    null,
  ]);
  const dampersRef = useRef<CinematicProgressDamper[]>(
    Array.from({ length: 6 }, () => new CinematicProgressDamper(DEFAULT_UNIVERSO_DAMPER_CONFIG))
  );
  const metricsRef = useRef<RunwayMetric[]>([]);
  const lastActiveIdxRef = useRef<number>(-1);
  const inProximityRef = useRef<boolean>(false);
  const rafIdRef = useRef<number>(0);
  const lastTickMsRef = useRef<number>(0);
  const isMobileRef = useRef<boolean>(false);

  const [isMobile, setIsMobile] = useState<boolean>(() => {
    const mob = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
    isMobileRef.current = mob;
    return mob;
  });

  const registerFns = useRef(
    Array.from({ length: 6 }, (_, idx) => (fn: SceneApplyFn) => {
      applyFnsRef.current[idx] = fn;
    })
  ).current;

  const stopLoop = useCallback(() => {
    if (rafIdRef.current && typeof window !== 'undefined') {
      window.cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = 0;
    }
    lastTickMsRef.current = 0;
  }, []);

  const measureMetrics = useCallback(() => {
    if (typeof window === 'undefined') return;
    const vh = Math.max(window.innerHeight, 320);
    const scrollY = getEffectiveScrollY();
    metricsRef.current = runwayRefs.current.map((el) => {
      if (!el) return { topDocY: 0, spanPx: 1 };
      const rect = el.getBoundingClientRect();
      return {
        topDocY: rect.top + scrollY,
        spanPx: Math.max(1, el.offsetHeight - vh),
      };
    });
  }, []);

  const tickDamperLoop = useCallback((now: number) => {
    if (
      typeof document !== 'undefined' &&
      document.visibilityState === 'hidden'
    ) {
      rafIdRef.current = 0;
      lastTickMsRef.current = 0;
      return;
    }

    const activeIdx = lastActiveIdxRef.current;
    if (!inProximityRef.current || activeIdx < 0 || activeIdx > 5) {
      rafIdRef.current = 0;
      lastTickMsRef.current = 0;
      return;
    }

    const dtSec = lastTickMsRef.current > 0 ? (now - lastTickMsRef.current) / 1000 : 1 / 60;
    lastTickMsRef.current = now;

    const damper = dampersRef.current[activeIdx];
    const maxSpeedOverride = isMobileRef.current ? 0.42 : 0.46;
    const visualP = damper.step(dtSec, maxSpeedOverride);
    applyFnsRef.current[activeIdx]?.(visualP, true);

    if (!damper.isSettled()) {
      rafIdRef.current = window.requestAnimationFrame(tickDamperLoop);
    } else {
      rafIdRef.current = 0;
      lastTickMsRef.current = 0;
    }
  }, []);

  const syncScroll = useCallback(
    (snapImmediate = false) => {
      if (typeof window === 'undefined') return;
      const metrics = metricsRef.current;
      if (metrics.length < 6) return;

      const vh = Math.max(window.innerHeight, 320);
      const scrollY = getEffectiveScrollY();

      // Fora da proximidade do Capítulo 02 -> suspende tudo
      if (!inProximityRef.current) {
        stopLoop();
        if (lastActiveIdxRef.current !== -1) {
          for (let i = 0; i < 6; i++) {
            const sticky = stickyRefs.current[i];
            if (sticky) {
              sticky.style.visibility = i === 0 ? 'visible' : 'hidden';
            }
            dampersRef.current[i].snap(0);
            applyFnsRef.current[i]?.(0, false);
          }
          lastActiveIdxRef.current = -1;
        }
        return;
      }

      const prevActive = lastActiveIdxRef.current;
      let nextActive = -1;
      let targetForActive = 0;

      for (let i = 0; i < 6; i++) {
        const m = metrics[i];
        const nextTop = i < 5 ? metrics[i + 1].topDocY : m.topDocY + m.spanPx + vh + 160;

        // Cena 01 já aparece entrando por baixo após o Newsletter; cenas 2–6 assumem exatamente em Y_i
        const enterThreshold = i === 0 ? m.topDocY - vh - 80 : m.topDocY;
        const isVisible = scrollY >= enterThreshold && scrollY < nextTop;

        const sticky = stickyRefs.current[i];
        if (sticky) {
          sticky.style.visibility = isVisible ? 'visible' : 'hidden';
          sticky.style.zIndex = isVisible ? String(20 + i) : '10';
        }

        if (isVisible) {
          nextActive = i;
          const rawP = (scrollY - m.topDocY) / m.spanPx;
          targetForActive = Math.min(1, Math.max(0, rawP));
        } else if (prevActive === i) {
          // Garante estado exato nas fronteiras e suspende loops da cena recém-desativada
          const clampedEdge = scrollY < m.topDocY ? 0 : 1;
          dampersRef.current[i].snap(clampedEdge);
          applyFnsRef.current[i]?.(clampedEdge, false);
        }
      }

      lastActiveIdxRef.current = nextActive;

      if (nextActive === -1) {
        stopLoop();
        return;
      }

      const activeDamper = dampersRef.current[nextActive];

      if (snapImmediate) {
        stopLoop();
        const snapped = activeDamper.snap(targetForActive);
        applyFnsRef.current[nextActive]?.(snapped, true);
        return;
      }

      if (prevActive !== nextActive) {
        // Transição sequencial entre cenas adjacentes começa exatamente da borda compartilhada (0 ou 1)
        if (prevActive === nextActive - 1) {
          activeDamper.snap(0);
          applyFnsRef.current[nextActive]?.(0, true);
        } else if (prevActive === nextActive + 1) {
          activeDamper.snap(1);
          applyFnsRef.current[nextActive]?.(1, true);
        } else {
          // Salto direto (ex: âncora ou montagem inicial já no meio da cena)
          const snapped = activeDamper.snap(targetForActive);
          applyFnsRef.current[nextActive]?.(snapped, true);
          stopLoop();
          return;
        }
      }

      activeDamper.setTarget(targetForActive);

      if (
        !activeDamper.isSettled() &&
        !rafIdRef.current &&
        document.visibilityState !== 'hidden'
      ) {
        lastTickMsRef.current = performance.now();
        rafIdRef.current = window.requestAnimationFrame(tickDamperLoop);
      }
    },
    [stopLoop, tickDamperLoop]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const mob = window.innerWidth < 768;
      isMobileRef.current = mob;
      setIsMobile((prev) => (prev !== mob ? mob : prev));
      measureMetrics();
      syncScroll(true);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncScroll(true);
      } else {
        stopLoop();
      }
    };

    measureMetrics();

    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined' && rootRef.current) {
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          const wasIn = inProximityRef.current;
          const nowIn = Boolean(entry?.isIntersecting);
          inProximityRef.current = nowIn;
          if (nowIn && !wasIn) {
            measureMetrics();
          }
          syncScroll(true);
        },
        { rootMargin: '650px 0px 650px 0px', threshold: 0 }
      );
      observer.observe(rootRef.current);
    } else {
      inProximityRef.current = true;
    }

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && rootRef.current) {
      resizeObserver = new ResizeObserver(() => {
        measureMetrics();
        syncScroll(true);
      });
      resizeObserver.observe(rootRef.current);
    }

    const onPhysicsScroll = () => syncScroll(false);
    const unsubPhysics = subscribePhysicsScroll(onPhysicsScroll);
    window.addEventListener('resize', handleResize, { passive: true });
    document.addEventListener('visibilitychange', handleVisibility);

    syncScroll(true);

    return () => {
      stopLoop();
      unsubPhysics();
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      observer?.disconnect();
      resizeObserver?.disconnect();
    };
  }, [measureMetrics, stopLoop, syncScroll]);

  return (
    <section
      ref={rootRef}
      id="universo-limiar"
      data-testid="universo-limiar-chapter"
      aria-label="Universo Limiar — Capítulo Cinematográfico"
      className="relative w-full overflow-x-clip"
    >
      {/* CENA 01 — FRATURA DIMENSIONAL */}
      <div
        ref={(el) => {
          runwayRefs.current[0] = el;
        }}
        data-scene-id={SCENE_IDS[0]}
        className={`relative ${RUNWAY_CLASSES[0]}`}
      >
        <div
          ref={(el) => {
            stickyRefs.current[0] = el;
          }}
          className="sticky top-0 h-[100dvh] w-full overflow-hidden"
        >
          <Scene01FraturaDimensional
            isMobile={isMobile}
            registerApply={registerFns[0]}
          />
        </div>
      </div>

      {/* CENA 02 — GALERIA DE IDENTIDADES */}
      <div
        ref={(el) => {
          runwayRefs.current[1] = el;
        }}
        data-scene-id={SCENE_IDS[1]}
        className={`relative ${RUNWAY_CLASSES[1]}`}
      >
        <div
          ref={(el) => {
            stickyRefs.current[1] = el;
          }}
          className="sticky top-0 h-[100dvh] w-full overflow-hidden"
          style={{ visibility: 'hidden' }}
        >
          <Scene02GaleriaIdentidades
            isMobile={isMobile}
            registerApply={registerFns[1]}
          />
        </div>
      </div>

      {/* CENA 03 — METAMORFOSE TIPOGRÁFICA */}
      <div
        ref={(el) => {
          runwayRefs.current[2] = el;
        }}
        data-scene-id={SCENE_IDS[2]}
        className={`relative ${RUNWAY_CLASSES[2]}`}
      >
        <div
          ref={(el) => {
            stickyRefs.current[2] = el;
          }}
          className="sticky top-0 h-[100dvh] w-full overflow-hidden"
          style={{ visibility: 'hidden' }}
        >
          <Scene03MetamorfoseTipografica
            isMobile={isMobile}
            registerApply={registerFns[2]}
          />
        </div>
      </div>

      {/* CENA 04 — RUPTURA CULTURAL */}
      <div
        ref={(el) => {
          runwayRefs.current[3] = el;
        }}
        data-scene-id={SCENE_IDS[3]}
        className={`relative ${RUNWAY_CLASSES[3]}`}
      >
        <div
          ref={(el) => {
            stickyRefs.current[3] = el;
          }}
          className="sticky top-0 h-[100dvh] w-full overflow-hidden"
          style={{ visibility: 'hidden' }}
        >
          <Scene04RupturaCultural
            isMobile={isMobile}
            registerApply={registerFns[3]}
          />
        </div>
      </div>

      {/* CENA 05 — FREQUÊNCIA E MATÉRIA */}
      <div
        ref={(el) => {
          runwayRefs.current[4] = el;
        }}
        data-scene-id={SCENE_IDS[4]}
        className={`relative ${RUNWAY_CLASSES[4]}`}
      >
        <div
          ref={(el) => {
            stickyRefs.current[4] = el;
          }}
          className="sticky top-0 h-[100dvh] w-full overflow-hidden"
          style={{ visibility: 'hidden' }}
        >
          <Scene05FrequenciaMateria
            isMobile={isMobile}
            registerApply={registerFns[4]}
          />
        </div>
      </div>

      {/* CENA 06 — SÍNTESE E ENCERRAMENTO */}
      <div
        ref={(el) => {
          runwayRefs.current[5] = el;
        }}
        data-scene-id={SCENE_IDS[5]}
        className={`relative ${RUNWAY_CLASSES[5]}`}
      >
        <div
          ref={(el) => {
            stickyRefs.current[5] = el;
          }}
          className="sticky top-0 h-[100dvh] w-full overflow-hidden"
          style={{ visibility: 'hidden' }}
        >
          <Scene06SinteseEncerramento
            isMobile={isMobile}
            registerApply={registerFns[5]}
          />
        </div>
      </div>
    </section>
  );
}
