import React from 'react';
import { CybersigilismWeb, EclipseSigil, LimiarStar } from '../components/ornaments/CybersigilismOrnaments';
import { Reveal } from '../components/ui/Reveal';
import { UltravioletButton } from '../components/ui/UltravioletButton';

export function AboutPage() {
  return (
    <div className="relative overflow-hidden">
      <CybersigilismWeb
        tone="uv"
        className="absolute -top-12 -right-24 w-[440px] h-[440px] opacity-45"
      />
      <CybersigilismWeb
        tone="neutral"
        className="absolute bottom-0 -left-24 w-[380px] h-[380px] opacity-35"
      />

      <article className="relative mx-auto max-w-[920px] px-4 sm:px-8 pt-14 pb-24 space-y-12">
        <header className="space-y-4">
          <div className="flex items-center gap-3 text-[var(--text-muted)]">
            <EclipseSigil className="w-6 h-6 text-[var(--accent-uv)]" />
            <span className="text-[11px] uppercase tracking-[0.24em]">
              Sobre a Limiar
            </span>
          </div>
          <h1 className="font-display font-light text-3xl sm:text-5xl uppercase tracking-[0.03em] text-[var(--text-primary)] text-balance">
            A travessia entre o conhecido e o desconhecido.
          </h1>
        </header>

        <Reveal>
          <div className="glass-surface rounded-[28px] p-7 sm:p-12 space-y-7 text-base sm:text-lg text-[var(--text-secondary)] leading-[1.8] font-light">
            <p className="text-[var(--text-primary)] font-normal">
              Limiar é a fronteira entre o conhecido e o desconhecido. Entre aquilo que acreditamos ser e tudo o que ainda não descobrimos sobre nós mesmos.
            </p>
            <p>
              A travessia não oferece respostas prontas. Ela abre espaço para questionar certezas, reconhecer contradições e perceber aquilo que antes permanecia invisível.
            </p>
            <p>
              Nossa identidade nasce do encontro entre cultura underground, arte, música e expressão individual.
            </p>
            <div className="pt-4 border-t border-[var(--border-hairline)] flex items-center gap-3 text-[var(--text-primary)]">
              <LimiarStar className="w-5 h-5 text-[var(--accent-uv)] shrink-0" />
              <p className="font-display text-lg sm:text-xl tracking-[0.02em]">
                Algumas coisas só podem ser compreendidas depois da travessia.
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal delayMs={120}>
          <div id="arquitetura" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pt-2">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Explore o catálogo demonstrativo
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                Conheça as peças e interações da Fase 01.
              </p>
            </div>
            <UltravioletButton href="/loja">EXPLORAR COLEÇÃO</UltravioletButton>
          </div>
        </Reveal>
      </article>
    </div>
  );
}
