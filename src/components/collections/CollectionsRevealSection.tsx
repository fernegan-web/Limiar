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

interface CollectionsRevealSectionProps {
  collections: Collection[];
  progressMv?: MotionValue<number>;
  staticMode?: boolean;
  onViewAllProducts: () => void;
  children?: React.ReactNode;
}

export function CollectionsRevealSection({
  collections,
  progressMv,
  staticMode = false,
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    let mobileHiddenApplied = false;
    let mobileSettledApplied = false;

    const applyProgress = (p: number) => {
      if (isMobile) {
        if (p < 0.7) {
          if (mobileHiddenApplied) return;
          mobileHiddenApplied = true;
          mobileSettledApplied = false;
        } else if (p >= 0.95) {
          if (mobileSettledApplied) return;
          mobileSettledApplied = true;
          mobileHiddenApplied = false;
        } else {
          mobileHiddenApplied = false;
          mobileSettledApplied = false;
        }
      }

      const state = computeCollectionsReveal(p, collections.length, isMobile);

      if (rootRef.current) {
        rootRef.current.style.pointerEvents = state.interactive ? 'auto' : 'none';
        rootRef.current.setAttribute(
          'aria-hidden',
          state.header.opacity < 0.08 ? 'true' : 'false'
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
          if (isMobile) headerRef.current.style.willChange = 'auto';
        } else {
          if (isMobile) {
            headerRef.current.style.willChange = h.opacity > 0.005 ? 'transform, opacity' : 'auto';
            headerRef.current.style.transform = `translate3d(0, ${h.y}px, 0) scale(${h.scale})`;
            headerRef.current.style.filter = 'none';
          } else {
            headerRef.current.style.transform = `translate3d(0, ${h.y}px, 0) scale(${h.scale})`;
            headerRef.current.style.filter = h.blurPx > 0.1 ? `blur(${h.blurPx}px)` : 'none';
          }
        }
      }

      state.cards.forEach((c, idx) => {
        const el = cardRefs.current[idx];
        if (!el) return;
        el.style.opacity = String(c.opacity);
        if (c.opacity >= 0.999) {
          el.style.transform = 'none';
          el.style.filter = 'none';
          if (isMobile) el.style.willChange = 'auto';
        } else if (isMobile) {
          el.style.willChange = c.opacity > 0.005 ? 'transform, opacity' : 'auto';
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
          if (isMobile) ctaRef.current.style.willChange = 'auto';
        } else if (isMobile) {
          ctaRef.current.style.willChange = cta.opacity > 0.005 ? 'transform, opacity' : 'auto';
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
      applyProgress(1);
      return;
    }

    applyProgress(progressMv?.get() ?? 0);
    const unsub = progressMv?.on('change', applyProgress);
    return () => unsub?.();
  }, [progressMv, collections.length, staticMode, isMobile]);

  return (
    <section
      ref={rootRef}
      data-testid="collections-reveal-section"
      aria-label="Coleções Limiar e catálogo"
      className={
        staticMode
          ? 'relative mx-auto max-w-[1360px] px-4 sm:px-8 py-12 sm:py-16'
          : 'relative z-30 flex flex-col justify-start w-full overflow-x-clip'
      }
    >
      {/* Atmosfera contida pós-travessia */}
      {!staticMode && (
        <div
          ref={envGlowRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[100svh] md:h-[100dvh] opacity-0 transition-opacity duration-300"
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
            : 'relative z-10 mx-auto max-w-[1360px] w-full px-4 sm:px-8 pt-16 sm:pt-20 md:pt-[84px] pb-4 sm:pb-6 flex flex-col justify-start'
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

      {children && <div className="relative z-10 w-full">{children}</div>}
    </section>
  );
}
