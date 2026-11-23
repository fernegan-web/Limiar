import React, { useEffect, useState } from 'react';
import { CybersigilismWeb, LimiarStar } from '../components/ornaments/CybersigilismOrnaments';
import { ResilientImage } from '../components/ui/ResilientImage';
import { Reveal } from '../components/ui/Reveal';
import { UltravioletButton } from '../components/ui/UltravioletButton';
import { fetchCollections } from '../services/catalogService';
import type { Collection } from '../types/commerce';

export function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);

  useEffect(() => {
    fetchCollections().then(setCollections);
  }, []);

  return (
    <div className="relative overflow-hidden">
      <CybersigilismWeb
        tone="uv"
        className="absolute -top-20 -left-20 w-96 h-96 opacity-45"
      />

      <div className="relative mx-auto max-w-[1360px] px-4 sm:px-8 pt-10 pb-20 space-y-12">
        <header className="space-y-3 max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)]">
            Coleções Demonstrativas · Curadoria Editorial
          </p>
          <h1 className="font-display font-light text-3xl sm:text-5xl uppercase tracking-[0.03em] text-[var(--text-primary)]">
            COLEÇÕES
          </h1>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
            Narrativas visuais e estudos de modelagem preparados para sincronização com as coleções oficiais do Wix Stores.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {collections.map((col, idx) => (
            <Reveal key={col.id} delayMs={idx * 100}>
              <article className="glass-card rounded-[26px] overflow-hidden flex flex-col justify-between h-full">
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-[var(--bg-card-media)]">
                  <ResilientImage
                    src={col.image}
                    alt={col.name}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.03]"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent"
                  />
                  <span className="absolute top-4 right-4 text-[#E8E7E0]/80">
                    <LimiarStar className="w-5 h-5" />
                  </span>
                </div>

                <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between gap-6">
                  <div className="space-y-2.5">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                      {col.subtitle}
                    </p>
                    <h2 className="font-display text-2xl sm:text-3xl font-light uppercase tracking-[0.04em] text-[var(--text-primary)]">
                      {col.name}
                    </h2>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      {col.description}
                    </p>
                  </div>

                  <div>
                    <UltravioletButton href={`/loja?colecao=${col.slug}`} size="md">
                      Explorar peças
                    </UltravioletButton>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}
