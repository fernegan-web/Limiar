import React, { useEffect, useRef, useState } from 'react';
import type { MotionValue } from 'motion/react';
import { useTheme } from '../../context/ThemeContext';
import { useThresholdPointer } from '../../motion/ThresholdMotionProvider';
import {
  computeSingularityFrame,
  resolveOperationalState,
  type BlackHoleOperationalState,
} from '../../motion/gravitationalTimeline';
import type { BlackHoleEngineController } from './blackholeEngine';

interface ProceduralBlackHoleProps {
  progressMv?: MotionValue<number>;
  frontContainerRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
}

export function ProceduralBlackHole({
  progressMv,
  frontContainerRef,
  className = '',
}: ProceduralBlackHoleProps) {
  const { theme } = useTheme();
  const { nx, ny, portalRevealed } = useThresholdPointer();
  const isLightMode = theme === 'light';

  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<BlackHoleEngineController | null>(null);

  const [inViewport, setInViewport] = useState(true);
  const [tabVisible, setTabVisible] = useState(
    typeof document === 'undefined' ? true : !document.hidden
  );
  const [webglReady, setWebglReady] = useState(false);
  const [contextLost, setContextLost] = useState(false);

  const computeEffectiveState = (
    p: number,
    visible: boolean,
    tab: boolean,
    revealed: boolean
  ): BlackHoleOperationalState => {
    if (!revealed) return 'inactive';
    return resolveOperationalState({
      progress: p,
      inViewport: visible,
      tabVisible: tab,
    });
  };

  const [opState, setOpState] = useState<BlackHoleOperationalState>(() =>
    computeEffectiveState(progressMv?.get() ?? 0, true, true, portalRevealed)
  );

  const portalRevealedRef = useRef(portalRevealed);
  const inViewportRef = useRef(inViewport);
  const tabVisibleRef = useRef(tabVisible);
  const opStateRef = useRef(opState);

  portalRevealedRef.current = portalRevealed;
  inViewportRef.current = inViewport;
  tabVisibleRef.current = tabVisible;
  opStateRef.current = opState;

  // Sincroniza visibilidade da aba
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVisibility = () => {
      setTabVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Observa entrada/saída na viewport com margem de antecipação
  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setInViewport(entry.isIntersecting);
        }
      },
      { rootMargin: '160px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Recalcula estado operacional e atualiza motor
  useEffect(() => {
    const progress = progressMv?.get() ?? 0;
    const nextState = computeEffectiveState(progress, inViewport, tabVisible, portalRevealed);
    opStateRef.current = nextState;
    setOpState(nextState);
    engineRef.current?.setState(nextState);
  }, [inViewport, tabVisible, portalRevealed, progressMv]);

  // Atualiza modo de tema no shader sem reiniciar o motor
  useEffect(() => {
    engineRef.current?.updateUniforms({ lightMode: isLightMode });
  }, [isLightMode]);

  // Inicializa engine WebGL original de duas passagens independentemente da largura ou orientação
  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    const initEngine = async () => {
      const host = canvasHostRef.current;
      if (!host || cancelled) return;

      try {
        const { createBlackHoleEngine } = await import('./blackholeEngine');
        if (cancelled) return;

        const isMobile =
          typeof window !== 'undefined' ? window.innerWidth < 768 : false;
        const currentProgress = progressMv?.get() ?? 0;
        const initialFrame = computeSingularityFrame(currentProgress, isMobile);

        const controller = createBlackHoleEngine({
          container: host,
          frontOverlayContainer: frontContainerRef?.current ?? undefined,
          lightMode: isLightMode,
          onFirstFrame: () => {
            if (!cancelled) {
              setWebglReady(true);
              if (frontContainerRef?.current) {
                frontContainerRef.current.style.opacity = '1';
              }
            }
          },
          onContextLoss: () => {
            if (!cancelled) {
              setContextLost(true);
              setWebglReady(false);
            }
          },
          onContextRestored: () => {
            if (!cancelled) {
              setContextLost(false);
              setWebglReady(true);
            }
          },
        });

        if (cancelled) {
          controller.dispose();
          return;
        }

        engineRef.current = controller;

        controller.updateUniforms({
          progress: currentProgress,
          horizonRadius: initialFrame.horizonRadius,
          warp: initialFrame.warpIntensity,
          pointerX: nx.get() * initialFrame.heroPointerStrength,
          pointerY: -ny.get() * initialFrame.heroPointerStrength,
          lightMode: isLightMode,
        });

        controller.setState('inactive');
        controller.renderSingleFrame();

        const initialState = computeEffectiveState(
          currentProgress,
          inViewportRef.current,
          tabVisibleRef.current,
          portalRevealedRef.current
        );
        opStateRef.current = initialState;
        setOpState(initialState);
        if (initialState !== 'inactive') {
          controller.setState(initialState);
        }

        if (typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver((entries) => {
            const box = entries[0]?.contentRect;
            if (box) {
              controller.resize(box.width, box.height);
            }
          });
          resizeObserver.observe(host);
        }
      } catch (err) {
        console.error('[Limiar BlackHole] Erro na inicialização WebGL:', err);
        if (!cancelled) {
          setWebglReady(false);
        }
      }
    };

    void initEngine();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      engineRef.current?.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escuta progresso de scroll e ponteiro sem re-renderizar o React
  useEffect(() => {
    const syncPointer = () => {
      const engine = engineRef.current;
      if (!engine) return;
      const p = progressMv?.get() ?? 0;
      const isMob =
        typeof window !== 'undefined' ? window.innerWidth < 768 : false;
      const frame = computeSingularityFrame(p, isMob);
      engine.updateUniforms({
        pointerX: nx.get() * frame.heroPointerStrength,
        pointerY: -ny.get() * frame.heroPointerStrength,
      });
    };

    const unsubNx = nx.on('change', syncPointer);
    const unsubNy = ny.on('change', syncPointer);

    const unsubProgress = progressMv?.on('change', (p) => {
      const isMob =
        typeof window !== 'undefined' ? window.innerWidth < 768 : false;
      const frame = computeSingularityFrame(p, isMob);

      engineRef.current?.updateUniforms({
        progress: p,
        horizonRadius: frame.horizonRadius,
        warp: frame.warpIntensity,
        pointerX: nx.get() * frame.heroPointerStrength,
        pointerY: -ny.get() * frame.heroPointerStrength,
      });

      const nextState = computeEffectiveState(
        p,
        inViewportRef.current,
        tabVisibleRef.current,
        portalRevealedRef.current
      );
      if (nextState !== opStateRef.current) {
        opStateRef.current = nextState;
        setOpState(nextState);
        engineRef.current?.setState(nextState);
      }
    });

    return () => {
      unsubNx();
      unsubNy();
      unsubProgress?.();
    };
  }, [progressMv, nx, ny]);

  // Mantém a visibilidade da camada frontal sincronizada
  useEffect(() => {
    const frontHost = frontContainerRef?.current;
    if (!frontHost) return;
    frontHost.style.opacity = webglReady && !contextLost ? '1' : '0';
  }, [webglReady, contextLost, frontContainerRef]);

  return (
    <div
      ref={rootRef}
      data-blackhole-engine="webgl"
      data-blackhole-state={opState}
      className={`relative w-full aspect-[1.32/1] flex items-center justify-center ${className}`}
    >
      <div
        ref={canvasHostRef}
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 ${
          webglReady && !contextLost ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
