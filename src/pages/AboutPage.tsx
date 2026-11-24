import React from 'react';
import {
  CybersigilismCorner,
  CybersigilismDivider,
  CybersigilismSpine,
  EclipseSigil,
  LimiarStar,
  PortalSingularity,
} from '../components/ornaments/CybersigilismOrnaments';
import { ResilientImage } from '../components/ui/ResilientImage';
import { Reveal } from '../components/ui/Reveal';
import { UltravioletButton } from '../components/ui/UltravioletButton';
import { DEMO_IMAGES } from '../data/demoCatalog';
import { ThresholdParallaxLayer } from '../motion/ThresholdPrimitives';

export function AboutPage() {
  return (
    <div className="relative overflow-hidden">
      <article className="relative mx-auto max-w-[1220px] px-4 sm:px-8 pt-12 pb-24 space-y-16">
        {/* Cabeçalho Assimétrico com Singularidade */}
        <header className="grid grid-cols-1 lg:grid-cols-12 items-center gap-10">
          <div className="lg:col-span-7 space-y-5">
            <div className="limiar-enter flex items-center gap-3 text-[var(--text-muted)]" style={{ animationDelay: '50ms' }}>
              <EclipseSigil className="w-6 h-6 text-[var(--accent-uv)]" />
              <span className="text-[11px] uppercase tracking-[0.24em]">
                Sobre Limiar
              </span>
            </div>
            <h1
              className="limiar-enter font-display font-light text-3xl sm:text-5xl xl:text-[54px] leading-[1.06] uppercase tracking-[0.03em] text-[var(--text-primary)] text-balance"
              style={{ animationDelay: '130ms' }}
            >
              A travessia entre o conhecido e o desconhecido.
            </h1>
          </div>

          <div className="lg:col-span-5 relative flex items-center justify-center">
            <ThresholdParallaxLayer
              depthX={7}
              depthY={5}
              rotateDeg={1.5}
              className="relative w-full max-w-[360px] aspect-square flex items-center justify-center"
            >
              <PortalSingularity className="limiar-ambient-ring w-full h-full opacity-90" />
              <div className="absolute inset-12 rounded-full overflow-hidden border border-[var(--border-hairline)] shadow-[0_0_64px_-16px_var(--accent-uv-glow)]">
                <ResilientImage
                  src={DEMO_IMAGES.bannerEclipse}
                  alt="Singularidade e eclipse — atmosfera Limiar"
                  className="w-full h-full object-cover object-top scale-125 opacity-90"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-radial from-transparent via-black/20 to-[var(--bg-canvas)]/70"
                />
              </div>
              <CybersigilismSpine
                tone="uv"
                className="absolute -right-2 top-1/2 -translate-y-1/2 w-10 h-28 opacity-85"
              />
            </ThresholdParallaxLayer>
          </div>
        </header>

        <CybersigilismDivider className="w-full max-w-xl mx-auto opacity-75" />

        {/* Blocos Editoriais com Copy Oficial Aprovada */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Bloco Principal */}
          <Reveal className="lg:col-span-8">
            <div className="relative glass-surface-strong rounded-[28px] p-7 sm:p-12 space-y-8 overflow-hidden">
              <CybersigilismCorner className="absolute top-3 right-3 w-12 h-12 opacity-55" />

              <p className="text-lg sm:text-2xl text-[var(--text-primary)] font-display font-light leading-[1.55]">
                Limiar é a fronteira entre o conhecido e o desconhecido. Entre aquilo que acreditamos ser e tudo o que ainda não descobrimos sobre nós mesmos.
              </p>

              <div className="h-[1px] w-24 bg-[var(--border-strong)]" />

              <p className="text-base sm:text-lg text-[var(--text-secondary)] font-light leading-[1.8]">
                A travessia não oferece respostas prontas. Ela abre espaço para questionar certezas, reconhecer contradições e perceber aquilo que antes permanecia invisível.
              </p>

              <p className="text-base sm:text-lg text-[var(--text-secondary)] font-light leading-[1.8]">
                Nossa identidade nasce do encontro entre cultura underground, arte, música e expressão individual.
              </p>

              <div className="pt-5 border-t border-[var(--border-hairline)] flex items-start sm:items-center gap-3.5 text-[var(--text-primary)]">
                <LimiarStar className="w-5 h-5 text-[var(--accent-uv)] shrink-0 mt-1 sm:mt-0" />
                <p className="font-display text-lg sm:text-xl tracking-[0.02em] font-normal">
                  Algumas coisas só podem ser compreendidas depois da travessia.
                </p>
              </div>
            </div>
          </Reveal>

          {/* Coluna Lateral Atmosférica */}
          <Reveal delayMs={120} className="lg:col-span-4 space-y-6">
            <div className="glass-card rounded-[24px] overflow-hidden p-3.5">
              <div className="relative aspect-[3/4] rounded-[16px] overflow-hidden bg-[var(--bg-card-media)]">
                <ResilientImage
                  src={DEMO_IMAGES.heroModel}
                  alt="Expressão individual e estética Organic Dark Tech"
                  className="w-full h-full object-cover object-top"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent"
                />
                <span className="absolute top-3 right-3 text-[#E8E7E0]/75">
                  <LimiarStar className="w-4 h-4" />
                </span>
              </div>
              <div className="pt-4 pb-1 px-1 flex items-center justify-between text-xs text-[var(--text-muted)] uppercase tracking-[0.16em]">
                <span>Organic Dark Tech</span>
                <EclipseSigil className="w-4 h-4 text-[var(--accent-uv)]" />
              </div>
            </div>
          </Reveal>
        </div>

        {/* Chamada Final */}
        <Reveal delayMs={160}>
          <div
            id="arquitetura"
            className="glass-surface rounded-[24px] p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
          >
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                Explore as coleções
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                Peças autorais entre a cultura underground, a arte e a expressão individual.
              </p>
            </div>
            <UltravioletButton href="/loja" variant="primary">
              EXPLORAR COLEÇÃO
            </UltravioletButton>
          </div>
        </Reveal>
      </article>
    </div>
  );
}
