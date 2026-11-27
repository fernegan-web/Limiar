import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { MotionValue } from 'motion/react';
import { useTheme } from '../../context/ThemeContext';
import { useThresholdPointer } from '../../motion/ThresholdMotionProvider';
import {
  computeSingularityFrame,
  resolveOperationalState,
  type BlackHoleOperationalState,
  type BlackHoleQualityTier,
} from '../../motion/gravitationalTimeline';
import { mapEngineLevelToBlackHoleTier } from '../../performance/performanceGovernor';
import {
  getActiveEngineQuality,
  initPerformanceRuntime,
  performanceGovernor,
  reportEngineTelemetry,
} from '../../performance/performanceRuntime';
import type { EngineQualityLevel } from '../../performance/performanceTypes';
import type { BlackHoleEngineController } from './blackholeEngine';

interface ProceduralBlackHoleProps {
  progressMv?: MotionValue<number>;
  onQualityChange?: (tier: BlackHoleQualityTier) => void;
  frontContainerRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
}

const HYBRID_REAR_SRC = '/assets/blackhole/rear-accretion-768.webp';
const HYBRID_HALO_SRC = '/assets/blackhole/inner-halo-768.webp';
const HYBRID_FRONT_SRC = '/assets/blackhole/front-orbit-768.webp';

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
  const hybridHorizonRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<BlackHoleEngineController | null>(null);

  const [inViewport, setInViewport] = useState(true);
  const [tabVisible, setTabVisible] = useState(
    typeof document === 'undefined' ? true : !document.hidden
  );
  const [webglReady, setWebglReady] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const [engineQuality, setEngineQuality] = useState<EngineQualityLevel>(() => {
    initPerformanceRuntime();
    return getActiveEngineQuality();
  });

  const qualityTier: BlackHoleQualityTier = mapEngineLevelToBlackHoleTier(engineQuality);

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
  const engineQualityRef = useRef(engineQuality);

  portalRevealedRef.current = portalRevealed;
  inViewportRef.current = inViewport;
  tabVisibleRef.current = tabVisible;
  opStateRef.current = opState;
  engineQualityRef.current = engineQuality;

  // Escuta mudanças do Governador de Performance (DSR, downgrades/upgrades ou override via ?debug=performance)
  useEffect(() => {
    initPerformanceRuntime();
    const unsub = performanceGovernor.subscribe((evt) => {
      setEngineQuality(evt.activeQuality);
      engineRef.current?.setQuality(evt.activeQuality, evt.dsrScale);
    });
    return unsub;
  }, []);

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

  // Recalcula estado operacional e atualiza motor ou telemetria híbrida
  useEffect(() => {
    const progress = progressMv?.get() ?? 0;
    const nextState = computeEffectiveState(progress, inViewport, tabVisible, portalRevealed);
    opStateRef.current = nextState;
    setOpState(nextState);
    engineRef.current?.setState(nextState);

    if (engineQuality === 'low' || engineQuality === 'emergency') {
      reportEngineTelemetry({
        activeRenderMode:
          nextState === 'inactive'
            ? 'suspended'
            : engineQuality === 'low'
              ? 'hybrid-prerendered'
              : 'css-emergency',
        canvasWidthPx: 0,
        canvasHeightPx: 0,
        canvasPixelCount: 0,
      });
    }
  }, [inViewport, tabVisible, portalRevealed, progressMv, engineQuality]);

  // Atualiza modo de tema no shader sem reiniciar o motor
  useEffect(() => {
    engineRef.current?.updateUniforms({ lightMode: isLightMode });
  }, [isLightMode]);

  // Repassa qualidade atual ao componente pai quando necessário
  useEffect(() => {
    onQualityChange?.(qualityTier);
  }, [qualityTier, onQualityChange]);

  const usesWebgl =
    engineQuality === 'ultra' ||
    engineQuality === 'high' ||
    engineQuality === 'medium';

  // Inicializa WebGL quando o tier exige shader e descarta integralmente em Baixo/Emergencial
  useEffect(() => {
    if (!usesWebgl) {
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
      setWebglReady(false);
      reportEngineTelemetry({
        activeRenderMode:
          opStateRef.current === 'inactive'
            ? 'suspended'
            : engineQuality === 'low'
              ? 'hybrid-prerendered'
              : 'css-emergency',
        canvasWidthPx: 0,
        canvasHeightPx: 0,
        canvasPixelCount: 0,
      });
      return;
    }

    if (engineRef.current) {
      engineRef.current.setQuality(engineQuality, performanceGovernor.getDsrScale());
      return;
    }

    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    const initEngine = async () => {
      const host = canvasHostRef.current;
      if (!host || cancelled) return;

      try {
        const { probeWebglCapability, createBlackHoleEngine } = await import(
          './blackholeEngine'
        );
        if (cancelled) return;

        const probe = probeWebglCapability();
        if (!probe.supported) {
          performanceGovernor.setManualOverride('low');
          return;
        }

        const resolvedQuality = performanceGovernor.getActiveQuality();
        if (resolvedQuality === 'low' || resolvedQuality === 'emergency') {
          return;
        }

        const isMobile =
          typeof window !== 'undefined' ? window.innerWidth < 768 : false;
        const currentProgress = progressMv?.get() ?? 0;
        const initialFrame = computeSingularityFrame(currentProgress, isMobile);

        const controller = createBlackHoleEngine({
          container: host,
          frontOverlayContainer: frontContainerRef?.current ?? undefined,
          initialQuality: resolvedQuality,
          isSoftwareGl: probe.isSoftwareGl,
          lightMode: isLightMode,
          onFirstFrame: () => {
            if (!cancelled) {
              setWebglReady(true);
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
      } catch {
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
  }, [usesWebgl]);

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

      if (hybridHorizonRef.current) {
        const horizonScale = frame.horizonRadius / 0.48;
        hybridHorizonRef.current.style.transform = `scale(${horizonScale.toFixed(3)})`;
      }

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

  const showLiveWebgl = usesWebgl && webglReady && !contextLost;
  const isHybridLow = engineQuality === 'low' || (usesWebgl && (!webglReady || contextLost));
  const isEmergency = engineQuality === 'emergency';
  const useHybridFrontLayer =
    engineQuality === 'high' ||
    engineQuality === 'medium' ||
    isHybridLow;

  // Mantém a visibilidade da camada frontal sincronizada
  useEffect(() => {
    const frontHost = frontContainerRef?.current;
    if (!frontHost) return;
    const shouldShowFront =
      (engineQuality === 'ultra' && showLiveWebgl) || useHybridFrontLayer;
    frontHost.style.opacity = shouldShowFront ? '1' : '0';
  }, [engineQuality, showLiveWebgl, useHybridFrontLayer, frontContainerRef]);

  const animationsPaused = opState === 'inactive' || !portalRevealed;

  const frontPortal =
    useHybridFrontLayer && frontContainerRef?.current
      ? createPortal(
          <img
            src={HYBRID_FRONT_SRC}
            alt=""
            width={768}
            height={582}
            decoding="async"
            draggable={false}
            className="w-full h-full block object-contain pointer-events-none select-none limiar-blackhole-hybrid-front"
            style={animationsPaused ? { animationPlayState: 'paused' } : undefined}
          />,
          frontContainerRef.current
        )
      : null;

  return (
    <div
      ref={rootRef}
      data-blackhole-engine={
        showLiveWebgl ? 'webgl' : isEmergency ? 'css-emergency' : 'hybrid-prerendered'
      }
      data-blackhole-state={opState}
      data-blackhole-quality={engineQuality}
      className={`relative w-full aspect-[1.32/1] flex items-center justify-center ${className}`}
    >
      {/* Camada WebGL procedural (Ultra / Alto / Médio) */}
      <div
        ref={canvasHostRef}
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 ${
          showLiveWebgl ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Modo Baixo / Fallback pré-renderizado animado (zero WebGL contínuo, profundidade 100% preservada) */}
      {isHybridLow && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <img
            src={HYBRID_REAR_SRC}
            alt=""
            width={768}
            height={582}
            decoding="async"
            draggable={false}
            className="absolute inset-0 w-full h-full object-contain limiar-blackhole-hybrid-rear"
            style={animationsPaused ? { animationPlayState: 'paused' } : undefined}
          />
          <img
            src={HYBRID_HALO_SRC}
            alt=""
            width={768}
            height={582}
            decoding="async"
            draggable={false}
            className="absolute inset-0 w-full h-full object-contain limiar-blackhole-hybrid-halo"
            style={animationsPaused ? { animationPlayState: 'paused' } : undefined}
          />
          <div
            ref={hybridHorizonRef}
            className="relative z-10 h-[48%] aspect-square rounded-full bg-[#030304] shadow-[0_0_26px_rgba(3,3,4,0.92)] will-change-transform"
          />
        </div>
      )}

      {/* Modo Emergencial: horizonte de eventos puro em CSS (preto absoluto em ambos os temas) */}
      {isEmergency && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div
            ref={hybridHorizonRef}
            className="relative h-[48%] aspect-square rounded-full bg-[#030304] ring-1 ring-[rgba(161,138,200,0.28)] shadow-[0_0_32px_rgba(3,3,4,0.88)] will-change-transform"
          />
        </div>
      )}

      {frontPortal}
    </div>
  );
}
