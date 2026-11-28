import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { MotionValue } from 'motion/react';
import { useRouter } from '../../context/RouterContext';
import { computeCollectionsReveal } from '../../motion/gravitationalTimeline';
import type { Collection } from '../../types/commerce';
import {
  CybersigilismCorner,
  EclipseSigil,
  LimiarStar,
} from '../ornaments/CybersigilismOrnaments';
import { ResilientImage } from '../ui/ResilientImage';
import { UltravioletButton } from '../ui/UltravioletButton';

export type CollectionsRevealDirection = 'hidden' | 'forward' | 'reverse' | 'settled';

interface CollectionsRevealSectionProps {
  collections: Collection[];
  progressMv?: MotionValue<number>;
  staticMode?: boolean;
  isCssDriven?: boolean;
  revealDirection?: CollectionsRevealDirection;
  freeNavUnlocked?: boolean;
  reducedMotion?: boolean;
  onRevealComplete?: () => void;
  onRevealReversed?: () => void;
  onViewAllProducts: () => void;
  children?: React.ReactNode;
}

const REVEAL_DURATION_MS = 860;
const REDUCED_REVEAL_DURATION_MS = 140;
const REVERSE_PLAYBACK_RATE = -2.2;

export function CollectionsRevealSection({
  collections,
  progressMv,
  staticMode = false,
  revealDirection = 'hidden',
  freeNavUnlocked = false,
  reducedMotion = false,
  onRevealComplete,
  onRevealReversed,
  onViewAllProducts,
  children,
}: CollectionsRevealSectionProps) {
  const { navigate } = useRouter();

  const rootRef = useRef<HTMLElement | null>(null);
  const envGlowRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const ctaRef = useRef<HTMLDivElement | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false
  );

  const directionRef = useRef<CollectionsRevealDirection>(revealDirection);
  directionRef.current = revealDirection;

  const onRevealCompleteRef = useRef(onRevealComplete);
  onRevealCompleteRef.current = onRevealComplete;
  const onRevealReversedRef = useRef(onRevealReversed);
  onRevealReversedRef.current = onRevealReversed;

  const activeAnimsRef = useRef<Animation[]>([]);
  const fallbackRafRef = useRef<number>(0);
  const fallbackT01Ref = useRef<number>(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const cancelAllAnims = () => {
      if (fallbackRafRef.current) {
        window.cancelAnimationFrame(fallbackRafRef.current);
        fallbackRafRef.current = 0;
      }
      if (activeAnimsRef.current.length > 0) {
        activeAnimsRef.current.forEach((anim) => {
          try {
            anim.onfinish = null;
            anim.cancel();
          } catch {
            // noop
          }
        });
        activeAnimsRef.current = [];
      }
    };

    const applyProgress = (p: number) => {
      const state = computeCollectionsReveal(p, collections.length, isMobile);

      if (rootRef.current) {
        rootRef.current.style.pointerEvents = state.interactive ? 'auto' : 'none';
        rootRef.current.style.visibility =
          p <= 0.721 && !staticMode && revealDirection === 'hidden' ? 'hidden' : 'visible';
        rootRef.current.setAttribute(
          'aria-hidden',
          state.header.opacity < 0.08 && !staticMode ? 'true' : 'false'
        );
      }

      if (envGlowRef.current) {
        envGlowRef.current.style.opacity = String(state.envOpacity);
      }

      if (headerRef.current) {
        const h = state.header;
        headerRef.current.style.opacity = String(h.opacity);
        if (h.opacity >= 0.999) {
          headerRef.current.style.transform = 'none';
          headerRef.current.style.filter = 'none';
        } else if (isMobile) {
          headerRef.current.style.transform = `translate3d(0, ${h.y}px, 0) scale(${h.scale})`;
          headerRef.current.style.filter = 'none';
        } else {
          headerRef.current.style.transform = `translate3d(0, ${h.y}px, 0) scale(${h.scale})`;
          headerRef.current.style.filter = h.blurPx > 0.1 ? `blur(${h.blurPx}px)` : 'none';
        }
      }

      state.cards.forEach((c, idx) => {
        const el = cardRefs.current[idx];
        if (!el) return;
        el.style.opacity = String(c.opacity);
        if (c.opacity >= 0.999) {
          el.style.transform = 'none';
          el.style.filter = 'none';
        } else if (isMobile) {
          el.style.transform = `translate3d(0, ${c.y}px, 0) scale(${c.scale})`;
          el.style.filter = 'none';
        } else {
          el.style.transform = `perspective(1100px) translate3d(0, ${c.y}px, 0) scale(${c.scale}) rotateX(${c.rotateXDeg}deg)`;
          el.style.filter = c.blurPx > 0.1 ? `blur(${c.blurPx}px)` : 'none';
        }
      });

      if (ctaRef.current) {
        const cta = state.cta;
        ctaRef.current.style.opacity = String(cta.opacity);
        if (cta.opacity >= 0.999) {
          ctaRef.current.style.transform = 'none';
          ctaRef.current.style.filter = 'none';
        } else if (isMobile) {
          ctaRef.current.style.transform = `translate3d(0, ${cta.y}px, 0) scale(${cta.scale})`;
          ctaRef.current.style.filter = 'none';
        } else {
          ctaRef.current.style.transform = `translate3d(0, ${cta.y}px, 0) scale(${cta.scale})`;
          ctaRef.current.style.filter =
            cta.blurPx > 0.1 ? `blur(${cta.blurPx}px)` : 'none';
        }
      }
    };

    if (staticMode) {
      cancelAllAnims();
      applyProgress(1);
      return;
    }

    if (revealDirection === 'hidden') {
      cancelAllAnims();
      fallbackT01Ref.current = 0;
      applyProgress(0.72);
      return;
    }

    if (revealDirection === 'settled') {
      cancelAllAnims();
      fallbackT01Ref.current = 1;
      applyProgress(1);
      return;
    }

    const durationMs = reducedMotion ? REDUCED_REVEAL_DURATION_MS : REVEAL_DURATION_MS;
    const canUseWaapi =
      typeof window !== 'undefined' &&
      ctaRef.current &&
      typeof ctaRef.current.animate === 'function' &&
      !reducedMotion;

    if (!canUseWaapi) {
      cancelAllAnims();
      let lastTime = performance.now();
      const stepFallback = (now: number) => {
        const dt = Math.min(Math.max(now - lastTime, 1), 48);
        lastTime = now;
        const dir = directionRef.current;
        if (dir === 'forward') {
          fallbackT01Ref.current = Math.min(1, fallbackT01Ref.current + dt / durationMs);
          applyProgress(0.72 + fallbackT01Ref.current * 0.28);
          if (fallbackT01Ref.current >= 1) {
            fallbackRafRef.current = 0;
            onRevealCompleteRef.current?.();
            return;
          }
        } else if (dir === 'reverse') {
          fallbackT01Ref.current = Math.max(
            0,
            fallbackT01Ref.current - (dt * Math.abs(REVERSE_PLAYBACK_RATE)) / durationMs
          );
          applyProgress(0.72 + fallbackT01Ref.current * 0.28);
          if (fallbackT01Ref.current <= 0) {
            fallbackRafRef.current = 0;
            onRevealReversedRef.current?.();
            return;
          }
        } else {
          fallbackRafRef.current = 0;
          return;
        }
        fallbackRafRef.current = window.requestAnimationFrame(stepFallback);
      };
      if (revealDirection === 'reverse' && fallbackT01Ref.current <= 0) {
        fallbackT01Ref.current = 1;
      }
      fallbackRafRef.current = window.requestAnimationFrame(stepFallback);
      return () => {
        if (fallbackRafRef.current) {
          window.cancelAnimationFrame(fallbackRafRef.current);
          fallbackRafRef.current = 0;
        }
      };
    }

    // Garante visibilidade durante forward/reverse
    if (rootRef.current) {
      rootRef.current.style.visibility = 'visible';
      rootRef.current.style.pointerEvents = 'auto';
      rootRef.current.setAttribute('aria-hidden', 'false');
    }

    const bindMasterHandlers = (anims: Animation[]) => {
      const reverseMaster = anims[0];
      const forwardMaster = anims[anims.length - 1];
      anims.forEach((a) => {
        a.onfinish = null;
      });

      if (forwardMaster) {
        forwardMaster.onfinish = () => {
          const ct = Number(forwardMaster.currentTime ?? 0);
          if (directionRef.current === 'forward' && ct >= durationMs - 6) {
            applyProgress(1);
            cancelAllAnims();
            onRevealCompleteRef.current?.();
          }
        };
      }

      if (reverseMaster) {
        reverseMaster.onfinish = () => {
          const ct = Number(reverseMaster.currentTime ?? 0);
          if (directionRef.current === 'reverse' && ct <= 6) {
            cancelAllAnims();
            applyProgress(0.72);
            onRevealReversedRef.current?.();
          }
        };
      }
    };

    // Reutiliza animações já ativas para reversão instantânea e contínua do frame visual atual
    if (activeAnimsRef.current.length > 0) {
      const rate = revealDirection === 'forward' ? 1 : REVERSE_PLAYBACK_RATE;
      activeAnimsRef.current.forEach((anim) => {
        anim.playbackRate = rate;
        anim.play();
      });
      bindMasterHandlers(activeAnimsRef.current);
      return;
    }

    const anims: Animation[] = [];
    const easing = 'cubic-bezier(0.22, 1, 0.36, 1)';
    const initialTime = revealDirection === 'reverse' ? durationMs : 0;
    const rate = revealDirection === 'forward' ? 1 : REVERSE_PLAYBACK_RATE;

    if (envGlowRef.current) {
      const anim = envGlowRef.current.animate(
        [
          { opacity: 0, offset: 0 },
          { opacity: 1, offset: 0.4, easing },
          { opacity: 1, offset: 1 },
        ],
        { duration: durationMs, fill: 'both', easing: 'linear' }
      );
      anim.currentTime = initialTime;
      anim.playbackRate = rate;
      anims.push(anim);
    }

    if (headerRef.current) {
      const startFilter = isMobile ? 'none' : 'blur(8px)';
      const endFilter = 'none';
      const anim = headerRef.current.animate(
        [
          {
            opacity: 0,
            transform: 'translate3d(0, 28px, 0) scale(0.97)',
            filter: startFilter,
            offset: 0,
          },
          {
            opacity: 0,
            transform: 'translate3d(0, 28px, 0) scale(0.97)',
            filter: startFilter,
            offset: 0.11,
          },
          {
            opacity: 1,
            transform: 'translate3d(0, 0px, 0) scale(1)',
            filter: endFilter,
            offset: 0.46,
            easing,
          },
          {
            opacity: 1,
            transform: 'translate3d(0, 0px, 0) scale(1)',
            filter: endFilter,
            offset: 1,
          },
        ],
        { duration: durationMs, fill: 'both', easing: 'linear' }
      );
      anim.currentTime = initialTime;
      anim.playbackRate = rate;
      anims.push(anim);
    }

    collections.forEach((_, idx) => {
      const el = cardRefs.current[idx];
      if (!el) return;
      const startOffset = Math.min(0.45, 0.21 + idx * 0.14);
      const endOffset = Math.min(0.88, startOffset + 0.38);
      const startTransform = isMobile
        ? 'translate3d(0, 42px, 0) scale(0.93)'
        : 'perspective(1100px) translate3d(0, 42px, 0) scale(0.93) rotateX(5deg)';
      const endTransform = isMobile
        ? 'translate3d(0, 0px, 0) scale(1)'
        : 'perspective(1100px) translate3d(0, 0px, 0) scale(1) rotateX(0deg)';
      const startFilter = isMobile ? 'none' : 'blur(10px)';

      const anim = el.animate(
        [
          { opacity: 0, transform: startTransform, filter: startFilter, offset: 0 },
          { opacity: 0, transform: startTransform, filter: startFilter, offset: startOffset },
          { opacity: 1, transform: endTransform, filter: 'none', offset: endOffset, easing },
          { opacity: 1, transform: endTransform, filter: 'none', offset: 1 },
        ],
        { duration: durationMs, fill: 'both', easing: 'linear' }
      );
      anim.currentTime = initialTime;
      anim.playbackRate = rate;
      anims.push(anim);
    });

    if (ctaRef.current) {
      const startFilter = isMobile ? 'none' : 'blur(6px)';
      const anim = ctaRef.current.animate(
        [
          {
            opacity: 0,
            transform: 'translate3d(0, 24px, 0) scale(0.96)',
            filter: startFilter,
            offset: 0,
          },
          {
            opacity: 0,
            transform: 'translate3d(0, 24px, 0) scale(0.96)',
            filter: startFilter,
            offset: 0.44,
          },
          {
            opacity: 1,
            transform: 'translate3d(0, 0px, 0) scale(1)',
            filter: 'none',
            offset: 1,
            easing,
          },
        ],
        { duration: durationMs, fill: 'both', easing: 'linear' }
      );
      anim.currentTime = initialTime;
      anim.playbackRate = rate;
      anims.push(anim);
    }

    activeAnimsRef.current = anims;
    bindMasterHandlers(anims);
  }, [revealDirection, collections, staticMode, isMobile, reducedMotion]);

  useEffect(() => {
    return () => {
      if (fallbackRafRef.current) {
        window.cancelAnimationFrame(fallbackRafRef.current);
      }
      activeAnimsRef.current.forEach((anim) => {
        try {
          anim.onfinish = null;
          anim.cancel();
        } catch {
          // noop
        }
      });
      activeAnimsRef.current = [];
    };
  }, []);

  // Mantém compatibilidade caso progressMv seja passado diretamente fora do fluxo sequencial
  useEffect(() => {
    if (staticMode || !progressMv) return;
    if (revealDirection === 'settled') return;
    return () => {
      // Gerenciado pelo ciclo de revealDirection
    };
  }, [progressMv, staticMode, revealDirection]);

  return (
    <section
      ref={rootRef}
      data-testid="collections-reveal-section"
      aria-label="Coleções Limiar e catálogo"
      className={
        staticMode
          ? 'relative mx-auto max-w-[1360px] px-4 sm:px-8 py-12 sm:py-16'
          : 'relative z-30 -mt-[100dvh] min-h-[100dvh] flex flex-col justify-start w-full overflow-x-clip'
      }
    >
      {/* Atmosfera contida pós-travessia */}
      {!staticMode && (
        <div
          ref={envGlowRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[100svh] md:h-[100dvh] opacity-0"
          style={{
            background:
              'radial-gradient(58% 46% at 50% 42%, var(--atmosphere-radial-1) 0%, transparent 72%)',
          }}
        />
      )}

      <div
        className={
          staticMode
            ? 'relative z-10 space-y-6 sm:space-y-8'
            : 'relative z-10 mx-auto max-w-[1360px] w-full px-4 sm:px-8 pt-[76px] sm:pt-24 md:pt-[96px] pb-6 sm:pb-10 flex flex-col justify-start'
        }
      >
        {/* Cabeçalho da Seção de Coleções */}
        <div
          ref={headerRef}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4 sm:mb-6 md:will-change-transform"
        >
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
              <EclipseSigil className="w-4 h-4 text-[var(--accent-uv)] shrink-0" />
              <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.22em]">
                ENCONTRE SUA EXPRESSÃO
              </p>
            </div>
            <h2 className="font-display font-light text-2xl sm:text-4xl lg:text-[42px] leading-[1.04] tracking-[0.03em] uppercase text-[var(--text-primary)]">
              COLEÇÕES
            </h2>
          </div>

          <a
            href="/colecoes"
            onClick={(e) => {
              e.preventDefault();
              navigate('/colecoes');
            }}
            className="hidden sm:inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] whitespace-nowrap shrink-0 transition-colors"
          >
            <span>CURADORIA COMPLETA</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </a>
        </div>

        {/* Cards Sequenciais das Coleções */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-6">
          {collections.map((col, idx) => {
            const accentColor =
              col.accentTone === 'acid'
                ? 'var(--accent-acid)'
                : 'var(--accent-uv)';

            return (
              <article
                key={col.id}
                ref={(node) => {
                  cardRefs.current[idx] = node;
                }}
                onClick={() => navigate(`/loja?colecao=${col.slug}`)}
                role="link"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/loja?colecao=${col.slug}`);
                  }
                }}
                data-testid={`reveal-collection-card-${col.slug}`}
                className="group relative glass-card rounded-[22px] sm:rounded-[26px] overflow-hidden flex flex-col justify-between cursor-pointer md:will-change-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-uv)]"
              >
                <div className="relative h-[106px] sm:h-[170px] lg:h-[210px] w-full overflow-hidden bg-[var(--bg-card-media)]">
                  <ResilientImage
                    src={col.image}
                    alt={`Coleção ${col.name}`}
                    sizes="(max-width: 768px) 92vw, 620px"
                    loading={isMobile ? 'eager' : 'lazy'}
                    className="w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent"
                  />
                  <span className="absolute top-3 right-3 sm:top-4 sm:right-4 text-[#E8E7E0]/85 group-hover:rotate-12 transition-transform duration-500">
                    <LimiarStar className="w-4 h-4 sm:w-5 sm:h-5" />
                  </span>
                  <CybersigilismCorner className="hidden sm:block absolute bottom-2.5 left-2.5 w-8 h-8 rotate-180 text-[#E8E7E0]/45" />
                </div>

                <div className="p-3.5 sm:p-5 lg:p-6 flex-1 flex flex-col justify-between gap-2.5 sm:gap-4">
                  <div className="space-y-1 sm:space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: accentColor }}
                      />
                      <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                        {col.subtitle}
                      </p>
                    </div>
                    <h3 className="font-display text-lg sm:text-2xl font-light uppercase tracking-[0.04em] text-[var(--text-primary)] group-hover:text-[var(--accent-uv)] transition-colors">
                      {col.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-2">
                      {col.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-0.5">
                    <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-uv)] transition-colors">
                      <span>Explorar coleção</span>
                      <ArrowRight
                        className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Botão Final: Salto Direto para Todos os Produtos */}
        <div
          ref={ctaRef}
          className="mt-4 sm:mt-6 flex flex-wrap items-center justify-between gap-4 md:will-change-transform"
        >
          <UltravioletButton
            type="button"
            variant="primary"
            size="md"
            onClick={onViewAllProducts}
          >
            VER TODOS OS PRODUTOS
          </UltravioletButton>

          <span className="hidden sm:inline-block text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Continue rolando para ver o catálogo
          </span>
        </div>
      </div>

      {children && (
        <div
          className={
            staticMode
              ? 'relative z-10 w-full'
              : freeNavUnlocked
              ? 'relative z-10 w-full block'
              : 'hidden'
          }
        >
          {children}
        </div>
      )}
    </section>
  );
}

