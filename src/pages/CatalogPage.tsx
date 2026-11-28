import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CatalogExplorer } from '../components/commerce/CatalogExplorer';
import {
  CybersigilismDivider,
  EclipseSigil,
} from '../components/ornaments/CybersigilismOrnaments';
import { useRouter } from '../context/RouterContext';
import {
  fetchCatalogSnapshot,
  invalidateCatalogCache,
} from '../services/catalogService';
import type { CatalogQuery, Category, Collection, Product, SortOption } from '../types/commerce';

function parseCatalogQueryFromSearch(search: string): CatalogQuery {
  const params = new URLSearchParams(search);
  return {
    category: params.get('categoria') || 'todas',
    collection: params.get('colecao') || 'todas',
    search: params.get('busca') || '',
    size: params.get('tamanho') || '',
    onlyOffers: params.get('ofertas') === '1',
    freeShippingOnly: params.get('fretegratis') === '1',
    sort: (params.get('sort') as SortOption) || 'featured',
  };
}

export function CatalogPage() {
  const { search } = useRouter();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initialQuery = useMemo(() => parseCatalogQueryFromSearch(search), [search]);

  const loadCatalog = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    if (forceRefresh) {
      invalidateCatalogCache();
    }
    try {
      const snapshot = await fetchCatalogSnapshot();
      setAllProducts(snapshot.products);
      setCategories(snapshot.categories);
      setCollections(snapshot.collections);
    } catch {
      setError('Não foi possível carregar o catálogo no momento.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  return (
    <div className="relative overflow-x-clip">
      <div className="relative mx-auto max-w-[1440px] px-4 sm:px-8 pt-10 pb-2">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2.5 text-[var(--text-muted)]">
              <EclipseSigil className="w-5 h-5 text-[var(--accent-uv)]" />
              <p className="text-[11px] uppercase tracking-[0.22em]">
                Curadoria · Streetwear Underground
              </p>
            </div>
            <h1 className="font-display font-light text-3xl sm:text-5xl uppercase tracking-[0.03em] text-[var(--text-primary)]">
              LOJA
            </h1>
            <p className="text-sm sm:text-base text-[var(--text-secondary)]">
              Silhuetas amplas, tecidos encorpados e grafismos autorais concebidos para a travessia.
            </p>
          </div>
          <CybersigilismDivider className="hidden lg:block w-72 opacity-65" />
        </header>
      </div>

      <CatalogExplorer
        id="loja-catalogo"
        allProducts={allProducts}
        categories={categories}
        collections={collections}
        loading={loading}
        error={error}
        onRetry={() => loadCatalog(true)}
        initialQuery={initialQuery}
        pageSize={20}
      />
    </div>
  );
}
