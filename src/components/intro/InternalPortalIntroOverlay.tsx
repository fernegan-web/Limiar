import React, { useLayoutEffect, useRef } from 'react';
import { useMotionValue } from 'motion/react';
import {
  isNativeScrollOnly,
  supportsCssScrollTimeline,
} from '../../motion/scrollPhysics';
import type { SingularityIntroFrame } from '../../motion/singularityIntroTimeline';
import { useThresholdPointer } from '../../motion/ThresholdMotionProvider';
import { ProceduralBlackHole } from '../hero/ProceduralBlackHole';

/**
 * Estágio efêmero da abertura "O Nascimento da Singularidade" para rotas internas (Final B).
 * Compartilha exatamente o mesmo início (0.0s - 2.6s) da homepage e então expande
 * buraco negro + moldura centralizados, puxando a câmera para dentro do horizonte de eventos
 * até revelar diretamente a página de destino já montada por baixo.
 *
 * Ao finalizar (~5.0s ou skip), este componente é desmontado e libera todos os recursos WebGL.
 */
export function InternalPortalIntroOverlay() {
  const {
    introActive,
    introVariant,
    markPortalRevealed,
    subscribeIntroTick,
    getLatestIntroFrame,
  } = useThresholdPointer();

  const portalProgressMv = useMotionValue(0);
  const frontBlackholeHostRef = useRef<HTMLDivElement | null>(null);

  const backdropRef = useRef<HTMLDivElement | null>(null);
  const opticalBoxRef = useRef<HTMLDivElement | null>(null);

  const wreathPortalRef = useRef<HTMLDivElement | null>(null);
  const wreathRotateRef = useRef<HTMLDivElement | null>(null);
  const wreathBirthRef = useRef<HTMLDivElement | null>(null);
  const wreathBlurRef = useRef<HTMLDivElement | null>(null);

  const bhPortalRearRef = useRef<HTMLDivElement | null>(null);
  const bhBirthRearRef = useRef<HTMLDivElement | null>(null);
  const bhPortalFrontRef = useRef<HTMLDivElement | null>(null);
  const bhBirthFrontRef = useRef<HTMLDivElement | null>(null);

  const logoCollapseRef = useRef<HTMLDivElement | null>(null);
  const logoDarkLayerRef = useRef<HTMLDivElement | null>(null);
  const logoLightLayerRef = useRef<HTMLDivElement | null>(null);
  const voidDarknessRef = useRef<HTMLDivElement | null>(null);

  const angleDegRef = useRef(0);

  useLayoutEffect(() => {
    if (typeof window === 'undefined' || !introActive || introVariant !== 'portal-expand') {
      return;
    }

    const useMobileWreathSpeed =
      isNativeScrollOnly() && supportsCssScrollTimeline();
    const restDegPerSec = useMobileWreathSpeed ? 360 / 32 : 3.6;

    const applyFrame = (frame: SingularityIntroFrame, dtSec: number) => {
      portalProgressMv.set(frame.portal.traversalProgress);

      if (backdropRef.current) {
        backdropRef.current.style.opacity = String(frame.portal.backdropOpacity);
      }

      if (opticalBoxRef.current) {
        opticalBoxRef.current.style.transform = `translate3d(-50%, -50%, 0) scale(${frame.flip.scale})`;
      }

      // Buraco negro traseiro e frontal sincronizados no mesmo centro óptico
      const birthScale = `scale(${frame.blackhole.scale})`;
      const birthOpacity = String(frame.blackhole.opacity);
      const portalBhScale = `scale(${frame.portal.blackholeScale})`;
      const portalBhOpacity = String(frame.portal.blackholeOpacity);

      if (bhBirthRearRef.current) {
        bhBirthRearRef.current.style.opacity = birthOpacity;
        bhBirthRearRef.current.style.transform = birthScale;
      }
      if (bhPortalRearRef.current) {
        bhPortalRearRef.current.style.opacity = portalBhOpacity;
        bhPortalRearRef.current.style.transform = portalBhScale;
      }
      if (bhBirthFrontRef.current) {
        bhBirthFrontRef.current.style.opacity = birthOpacity;
        bhBirthFrontRef.current.style.transform = birthScale;
      }
      if (bhPortalFrontRef.current) {
        bhPortalFrontRef.current.style.opacity = portalBhOpacity;
        bhPortalFrontRef.current.style.transform = portalBhScale;
      }

      // Moldura tribal cybersigilism
      if (wreathBirthRef.current) {
        wreathBirthRef.current.style.opacity = String(frame.wreath.opacity);
        wreathBirthRef.current.style.transform = `scale(${frame.wreath.scale})`;
      }
      if (wreathPortalRef.current) {
        wreathPortalRef.current.style.opacity = String(frame.portal.wreathOpacity);
        wreathPortalRef.current.style.transform = `scale(${frame.portal.wreathScale})`;
      }
      if (wreathBlurRef.current) {
        wreathBlurRef.current.style.filter =
          frame.portal.wreathBlurPx > 0.05
            ? `blur(${frame.portal.wreathBlurPx}px)`
            : 'none';
      }

      if (frame.wreath.speedMultiplier > 0 && dtSec > 0) {
        angleDegRef.current =
          (angleDegRef.current -
            restDegPerSec * frame.wreath.speedMultiplier * dtSec) %
          360000;
      }
      if (wreathRotateRef.current) {
        wreathRotateRef.current.style.transform = `rotate(${angleDegRef.current.toFixed(3)}deg)`;
      }

      // Logo oficial (mesma sucção gravitacional de 0.0s - 2.6s)
      if (logoCollapseRef.current) {
        const sx = frame.logo.scale;
        const sy = Number((frame.logo.scale * frame.logo.stretchY).toFixed(4));
        logoCollapseRef.current.style.opacity = String(frame.logo.opacity);
        logoCollapseRef.current.style.transform = `scale(${sx}, ${sy})`;
        logoCollapseRef.current.style.filter =
          frame.logo.blurPx > 0.05 ? `blur(${frame.logo.blurPx}px)` : 'none';
      }
      if (logoDarkLayerRef.current) {
        logoDarkLayerRef.current.style.opacity = String(
          Number((1 - frame.logo.lightHorizonMix).toFixed(4))
        );
      }
      if (logoLightLayerRef.current) {
        logoLightLayerRef.current.style.opacity = String(frame.logo.lightHorizonMix);
      }

      // Escuridão do horizonte de eventos cobrindo e depois revelando diretamente a página de destino
      if (voidDarknessRef.current) {
        voidDarknessRef.current.style.opacity = String(frame.portal.voidDarknessOpacity);
      }
    };

    applyFrame(getLatestIntroFrame(), 0);
    return subscribeIntroTick(applyFrame);
  }, [introActive, introVariant, portalProgressMv, subscribeIntroTick, getLatestIntroFrame]);

  if (!introActive || introVariant !== 'portal-expand') {
    return null;
  }

  return (
    <div
      data-testid="singularity-portal-intro"
      aria-hidden="true"
      className="fixed inset-0 z-[55] pointer-events-auto select-none overflow-hidden"
    >
      {/* Fundo sólido no tema ativo (ocultado apenas após o horizonte negro preencher 100% da tela) */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-[var(--bg-canvas)] transition-none"
      />

      {/* Conjunto óptico rigorosamente centralizado na viewport */}
      <div
        ref={opticalBoxRef}
        style={{ transform: 'translate3d(-50%, -50%, 0) scale(0.94)' }}
        className="pointer-events-none absolute top-1/2 left-1/2 w-[min(136vw,842px)] lg:w-[min(92vw,952px)] aspect-[1.32/1] max-w-none flex items-center justify-center will-change-transform origin-center"
      >
        {/* CAMADA Z-0: Moldura Wreath Cybersigilism */}
        <div
          ref={wreathPortalRef}
          className="relative w-[70.27%] sm:w-[70.51%] aspect-square flex items-center justify-center z-0 will-change-transform origin-center"
        >
          <div
            ref={wreathRotateRef}
            className="w-full h-full will-change-transform origin-center"
          >
            <div
              ref={wreathBirthRef}
              style={{ opacity: 0, transform: 'scale(0.36)' }}
              className="w-full h-full will-change-transform origin-center"
            >
              <div ref={wreathBlurRef} className="w-full h-full">
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
                    className="w-full h-full block object-contain mix-blend-normal opacity-[0.84] dark:opacity-[0.88] dark:brightness-[1.02] dark:contrast-[1.06]"
                  />
                </picture>
              </div>
            </div>
          </div>
        </div>

        {/* CAMADA Z-10: Buraco Negro Procedural Traseiro */}
        <div
          ref={bhPortalRearRef}
          className="absolute inset-0 z-10 flex items-center justify-center will-change-transform origin-center"
        >
          <div
            ref={bhBirthRearRef}
            style={{ opacity: 0, transform: 'scale(0.14)' }}
            className="w-full will-change-transform origin-center"
          >
            <ProceduralBlackHole
              progressMv={portalProgressMv}
              frontContainerRef={frontBlackholeHostRef}
              onEngineError={markPortalRevealed}
            />
          </div>
        </div>

        {/* CAMADA Z-20: Logo Oficial Limiar */}
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <div
            ref={logoCollapseRef}
            data-testid="singularity-intro-logo"
            style={{ opacity: 0, transform: 'scale(0.92)' }}
            className="relative w-[25%] sm:w-[26%] aspect-square flex items-center justify-center will-change-transform origin-center"
          >
            <div
              ref={logoDarkLayerRef}
              className="absolute inset-0 flex items-center justify-center dark:hidden"
            >
              <picture className="w-full h-full flex items-center justify-center">
                <source
                  srcSet="/assets/limiar-logo-256.webp 256w, /assets/limiar-logo-512.webp 512w"
                  sizes="(max-width: 640px) 160px, 240px"
                  type="image/webp"
                />
                <img
                  src="/assets/aistudio/LIMIAR_LOGO_d4da5a59.png"
                  alt=""
                  width={512}
                  height={512}
                  decoding="async"
                  fetchPriority="high"
                  draggable={false}
                  className="w-full h-full object-contain invert mix-blend-multiply"
                />
              </picture>
            </div>

            <div className="hidden dark:flex absolute inset-0 items-center justify-center">
              <picture className="w-full h-full flex items-center justify-center">
                <source
                  srcSet="/assets/limiar-logo-256.webp 256w, /assets/limiar-logo-512.webp 512w"
                  sizes="(max-width: 640px) 160px, 240px"
                  type="image/webp"
                />
                <img
                  src="/assets/aistudio/LIMIAR_LOGO_d4da5a59.png"
                  alt=""
                  width={512}
                  height={512}
                  decoding="async"
                  fetchPriority="high"
                  draggable={false}
                  className="w-full h-full object-contain mix-blend-screen"
                />
              </picture>
            </div>

            <div
              ref={logoLightLayerRef}
              style={{ opacity: 0 }}
              className="flex dark:hidden absolute inset-0 items-center justify-center"
            >
              <picture className="w-full h-full flex items-center justify-center">
                <source
                  srcSet="/assets/limiar-logo-256.webp 256w, /assets/limiar-logo-512.webp 512w"
                  sizes="(max-width: 640px) 160px, 240px"
                  type="image/webp"
                />
                <img
                  src="/assets/aistudio/LIMIAR_LOGO_d4da5a59.png"
                  alt=""
                  width={512}
                  height={512}
                  decoding="async"
                  fetchPriority="high"
                  draggable={false}
                  className="w-full h-full object-contain mix-blend-screen"
                />
              </picture>
            </div>
          </div>
        </div>

        {/* CAMADA Z-30: Matéria Orbital Frontal */}
        <div
          ref={bhPortalFrontRef}
          className="absolute inset-0 z-30 flex items-center justify-center will-change-transform origin-center"
        >
          <div
            ref={bhBirthFrontRef}
            style={{ opacity: 0, transform: 'scale(0.14)' }}
            className="w-full h-full will-change-transform origin-center"
          >
            <div ref={frontBlackholeHostRef} className="w-full h-full opacity-0" />
          </div>
        </div>
      </div>

      {/* Véu do horizonte de eventos: fecha a imersão e abre diretamente na rota de destino */}
      <div
        ref={voidDarknessRef}
        style={{
          opacity: 0,
          background:
            'radial-gradient(circle at 50% 50%, #030304 0%, #040406 58%, #070709 100%)',
        }}
        className="pointer-events-none absolute inset-0 z-40"
      />
    </div>
  );
}
