import React, { useEffect, useRef, useState } from 'react';
import type { MotionValue } from 'motion/react';
import { useTheme } from '../../context/ThemeContext';
import { useThresholdPointer } from '../../motion/ThresholdMotionProvider';
import {
  computeSingularityFrame,
  resolveOperationalState,
  selectQualityTier,
  type BlackHoleOperationalState,
  type BlackHoleQualityTier,
} from '../../motion/gravitationalTimeline';
import type { BlackHoleEngineController } from './blackholeEngine';

interface ProceduralBlackHoleProps {
  progressMv?: MotionValue<number>;
  onQualityChange?: (tier: BlackHoleQualityTier) => void;
  frontContainerRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
}

export function ProceduralBlackHole({
  progressMv,
  onQualityChange,
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
  const [qualityTier, setQualityTier] = useState<BlackHoleQualityTier>('high');
  const [opState, setOpState] = useState<BlackHoleOperationalState>(() =>
    resolveOperationalState({
      progress: progressMv?.get() ?? 0,
      inViewport: true,
      tabVisible: true,
    })
  );

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

  // Recalcula estado operacional e notifica o motor sem recriar o WebGL
  useEffect(() => {
    const progress = progressMv?.get() ?? 0;
    const nextState = resolveOperationalState({
      progress,
      inViewport,
      tabVisible,
    });
    setOpState(nextState);
    engineRef.current?.setState(nextState);
  }, [inViewport, tabVisible, progressMv]);

  // Atualiza modo de tema no shader sem reiniciar o motor
  useEffect(() => {
    engineRef.current?.updateUniforms({ lightMode: isLightMode });
  }, [isLightMode]);

  // Repassa qualidade atual ao componente pai quando necessário
  useEffect(() => {
    onQualityChange?.(qualityTier);
  }, [qualityTier, onQualityChange]);

  // Inicialização antecipada em segundo plano durante a intro cinematográfica
  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    const initEngine = async () => {
      const host = canvasHostRef.current;
      if (!host) return;

      try {
        const { probeWebglCapability, createBlackHoleEngine } = await import(
          './blackholeEngine'
        );
        if (cancelled) return;

        const probe = probeWebglCapability();
        const isMobile =
          typeof window !== 'undefined' ? window.innerWidth < 768 : false;
        const nav =
          typeof navigator !== 'undefined'
            ? (navigator as Navigator & { deviceMemory?: number })
            : undefined;

        const initialTier = selectQualityTier({
          webglSupported: probe.supported,
          isSoftwareGl: probe.isSoftwareGl,
          isMobile,
          hardwareConcurrency: nav?.hardwareConcurrency,
          deviceMemoryGb: nav?.deviceMemory,
        });

        setQualityTier(initialTier);
        if (initialTier === 'static' || !probe.supported) {
          return;
        }

        const currentProgress = progressMv?.get() ?? 0;
        const initialFrame = computeSingularityFrame(currentProgress, isMobile);

        const controller = createBlackHoleEngine({
          container: host,
          frontOverlayContainer: frontContainerRef?.current ?? undefined,
          initialQuality: initialTier,
          isSoftwareGl: probe.isSoftwareGl,
          lightMode: isLightMode,
          onFirstFrame: () => {
            if (!cancelled) {
              setWebglReady(true);
            }
          },
          onQualityDowngrade: (tier) => {
            if (!cancelled) setQualityTier(tier);
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

        const initialState = resolveOperationalState({
          progress: currentProgress,
          inViewport,
          tabVisible,
        });
        controller.setState(initialState);

        // Dispara renderização imediata do primeiro frame para pré-compilar shaders e pipeline na GPU
        controller.renderSingleFrame();

        if (typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver((entries) => {
            const box = entries[0]?.contentRect;
            if (box) {
              controller.resize(box.width, box.height);
            }
          });
          resizeObserver.observe(host);
        }
      } catch {
        if (!cancelled) {
          setQualityTier('static');
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

    let lastOpState: BlackHoleOperationalState = opState;
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

      const nextState = resolveOperationalState({
        progress: p,
        inViewport,
        tabVisible,
      });
      if (nextState !== lastOpState) {
        lastOpState = nextState;
        setOpState(nextState);
        engineRef.current?.setState(nextState);
      }
    });

    return () => {
      unsubNx();
      unsubNy();
      unsubProgress?.();
    };
  }, [progressMv, nx, ny, inViewport, tabVisible, opState]);

  const showLiveWebgl = webglReady && !contextLost;

  // Mantém a visibilidade da camada frontal sincronizada à prontidão WebGL
  useEffect(() => {
    const frontHost = frontContainerRef?.current;
    if (!frontHost) return;
    frontHost.style.opacity = showLiveWebgl ? '1' : '0';
  }, [showLiveWebgl, frontContainerRef]);

  return (
    <div
      ref={rootRef}
      data-blackhole-engine={showLiveWebgl ? 'webgl' : 'none'}
      data-blackhole-state={opState}
      data-blackhole-quality={qualityTier}
      className={`relative w-full aspect-[1.32/1] flex items-center justify-center ${className}`}
    >
      {/* Camada WebGL procedural */}
      <div
        ref={canvasHostRef}
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 ${
          showLiveWebgl ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
