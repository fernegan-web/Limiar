import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import {
  CybersigilismCorner,
  CybersigilismDivider,
  EclipseSigil,
  LimiarStar,
  PortalSingularity,
} from '../components/ornaments/CybersigilismOrnaments';
import { ResilientImage } from '../components/ui/ResilientImage';
import { Reveal } from '../components/ui/Reveal';
import { UltravioletButton } from '../components/ui/UltravioletButton';
import { ThresholdScrollParallax } from '../motion/ThresholdPrimitives';
import { fetchCollections, invalidateCatalogCache } from '../services/catalogService';
import type { Collection } from '../types/commerce';

export function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCollections = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    if (forceRefresh) {
      invalidateCatalogCache();
    }
    try {
      const items = await fetchCollections();
      setCollections(items);
    } catch {
      setError('Não foi possível carregar as coleções no momento.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  return (
    <div className="relative overflow-x-clip">
      <div className="relative mx-auto max-w-[1360px] px-4 sm:px-8 pt-10 pb-20 space-y-12">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2.5 text-[var(--text-muted)]">
              <EclipseSigil className="w-5 h-5 text-[var(--accent-uv)]" />
              <p className="text-[11px] uppercase tracking-[0.22em]">
                Curadoria Editorial
              </p>
            </div>
            <h1 className="font-display font-light text-3xl sm:text-5xl uppercase tracking-[0.03em] text-[var(--text-primary)]">
              COLEÇÕES
            </h1>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              Narrativas visuais e estudos de modelagem que dão forma ao universo de Limiar.
            </p>
          </div>

          <PortalSingularity className="hidden md:block w-24 h-24 opacity-70" />
        </header>

        <CybersigilismDivider className="w-full max-w-2xl mx-auto opacity-70" />

        {error && (
          <div
            role="alert"
            className="glass-surface rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3 text-sm text-[var(--accent-terracotta)]">
              <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => loadCollections(true)}
              className="px-4 py-2 rounded-full border border-[var(--border-strong)] text-xs uppercase tracking-[0.14em] text-[var(--text-primary)]"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8" aria-busy="true">
            {Array.from({ length: 2 }).map((_, idx) => (
              <div
                key={idx}
                className="glass-card rounded-[28px] overflow-hidden p-4 space-y-4 animate-pulse"
              >
                <div className="aspect-[16/10] w-full rounded-[20px] bg-[var(--bg-card-media)]" />
                <div className="space-y-2 p-2">
                  <div className="h-3 w-24 rounded bg-[var(--border-hairline)]" />
                  <div className="h-6 w-48 rounded bg-[var(--border-hairline)]" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && collections.length === 0 && (
          <div className="glass-surface rounded-[28px] py-16 px-6 text-center text-sm text-[var(--text-muted)]">
            Nenhuma coleção encontrada no momento.
          </div>
        )}

        {!loading && !error && collections.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {collections.map((col, idx) => (
              <Reveal key={col.id} delayMs={idx * 110}>
                <article className="group relative glass-card rounded-[28px] overflow-hidden flex flex-col justify-between h-full">
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-[var(--bg-card-media)]">
                    <ThresholdScrollParallax offsetY={12} scaleRange={[1.05, 1.01]} className="w-full h-full">
                      <ResilientImage
                        src={col.image}
                        alt={col.name}
                        className="w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
                      />
                    </ThresholdScrollParallax>
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent"
                    />
                    <span className="absolute top-4 right-4 text-[#E8E7E0]/80 group-hover:rotate-12 transition-transform duration-500">
                      <LimiarStar className="w-5 h-5" />
                    </span>
                    <CybersigilismCorner className="absolute bottom-3 left-3 w-10 h-10 rotate-180 text-[#E8E7E0]/45" />
                  </div>

                  <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between gap-6">
                    <div className="space-y-2.5">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                        {col.subtitle}
                      </p>
                      <h2 className="font-display text-2xl sm:text-3xl font-light uppercase tracking-[0.04em] text-[var(--text-primary)] group-hover:text-[var(--accent-uv)] transition-colors">
                        {col.name}
                      </h2>
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                        {col.description}
                      </p>
                    </div>

                    <div>
                      <UltravioletButton
                        href={`/loja?colecao=${col.slug}`}
                        variant="secondary"
                        size="md"
                      >
                        Explorar peças
                      </UltravioletButton>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
