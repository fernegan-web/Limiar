import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, Search, SlidersHorizontal, X } from 'lucide-react';
import { ProductCard } from '../components/commerce/ProductCard';
import {
  CybersigilismDivider,
  CybersigilismWeb,
  EclipseSigil,
  PortalSingularity,
} from '../components/ornaments/CybersigilismOrnaments';
import { ThresholdParallaxLayer } from '../motion/ThresholdPrimitives';
import { THRESHOLD_EASE } from '../motion/thresholdConfig';
import { useRouter } from '../context/RouterContext';
import { fetchCategories, fetchCollections, fetchProducts } from '../services/catalogService';
import type { Category, Collection, Product, ProductSize, SortOption } from '../types/commerce';

const SIZE_OPTIONS: ProductSize[] = ['P', 'M', 'G', 'GG', 'XG'];

export function CatalogPage() {
  const { search } = useRouter();

  const urlParams = new URLSearchParams(search);
  const initialCategory = urlParams.get('categoria') || 'todas';
  const initialCollection = urlParams.get('colecao') || 'todas';
  const initialSearch = urlParams.get('busca') || '';
  const initialSort = (urlParams.get('sort') as SortOption) || 'featured';

  const [category, setCategory] = useState(initialCategory);
  const [collection, setCollection] = useState(initialCollection);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [selectedSize, setSelectedSize] = useState<ProductSize | ''>('');
  const [sort, setSort] = useState<SortOption>(initialSort);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.has('categoria')) setCategory(params.get('categoria') || 'todas');
    if (params.has('colecao')) setCollection(params.get('colecao') || 'todas');
    if (params.has('busca')) setSearchTerm(params.get('busca') || '');
  }, [search]);

  const loadCatalog = async () => {
    setLoading(true);
    setError(null);
    try {
      const [items, cats, cols] = await Promise.all([
        fetchProducts({
          category,
          collection,
          search: searchTerm,
          size: selectedSize,
          sort,
        }),
        fetchCategories(),
        fetchCollections(),
      ]);
      setProducts(items);
      setCategories(cats);
      setCollections(cols);
    } catch {
      setError('Não foi possível carregar o catálogo demonstrativo no momento.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, collection, searchTerm, selectedSize, sort]);

  const clearFilters = () => {
    setCategory('todas');
    setCollection('todas');
    setSearchTerm('');
    setSelectedSize('');
    setSort('featured');
  };

  const hasActiveFilters =
    category !== 'todas' ||
    collection !== 'todas' ||
    searchTerm.trim() !== '' ||
    selectedSize !== '';

  return (
    <div className="relative overflow-hidden">
      <ThresholdParallaxLayer depthX={-8} depthY={-6} className="pointer-events-none absolute inset-0">
        <CybersigilismWeb
          tone="uv"
          className="absolute -top-20 -right-24 w-[420px] h-[420px] opacity-55"
        />
        <CybersigilismWeb
          tone="neutral"
          className="absolute bottom-12 -left-28 w-[360px] h-[360px] opacity-40"
        />
      </ThresholdParallaxLayer>

      <div className="relative mx-auto max-w-[1360px] px-4 sm:px-8 pt-10 pb-20 space-y-10">
        {/* Cabeçalho da Loja */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2.5 text-[var(--text-muted)]">
              <EclipseSigil className="w-5 h-5 text-[var(--accent-uv)]" />
              <p className="text-[11px] uppercase tracking-[0.22em]">
                Catálogo Demonstrativo · Preparado para Wix Catalog V3
              </p>
            </div>
            <h1 className="font-display font-light text-3xl sm:text-5xl uppercase tracking-[0.03em] text-[var(--text-primary)]">
              LOJA
            </h1>
            <p className="text-sm sm:text-base text-[var(--text-secondary)]">
              Explore a estrutura de filtros, ordenação e variantes enquanto o catálogo definitivo da loja Wix ainda não está vinculado.
            </p>
          </div>
          <CybersigilismDivider className="hidden lg:block w-72 opacity-65" />
        </header>

        {/* Barra de Filtros e Busca (Tier 3 Glass) */}
        <div className="glass-surface-strong rounded-[24px] p-4 sm:p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Categorias */}
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por categoria">
              <button
                type="button"
                onClick={() => setCategory('todas')}
                className={`px-3.5 py-1.5 rounded-full text-xs uppercase tracking-[0.14em] transition-all whitespace-nowrap ${
                  category === 'todas'
                    ? 'bg-[var(--text-primary)] text-[var(--text-inverse)] font-medium'
                    : 'border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'
                }`}
              >
                Todas
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs uppercase tracking-[0.14em] transition-all whitespace-nowrap ${
                    category === cat.id
                      ? 'bg-[var(--text-primary)] text-[var(--text-inverse)] font-medium'
                      : 'border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Busca + Ordenação */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-canvas)]/55 focus-within:border-[var(--accent-uv-edge)] min-w-[220px] transition-colors">
                <Search className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" aria-hidden="true" />
                <label htmlFor="catalog-search" className="sr-only">
                  Filtrar por nome
                </label>
                <input
                  id="catalog-search"
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filtrar peças..."
                  className="w-full bg-transparent text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" aria-hidden="true" />
                <label htmlFor="catalog-sort" className="sr-only">
                  Ordenar produtos
                </label>
                <select
                  id="catalog-sort"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortOption)}
                  className="rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3.5 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--accent-uv-edge)] focus:outline-none"
                >
                  <option value="featured">Destaques</option>
                  <option value="price-asc">Menor preço</option>
                  <option value="price-desc">Maior preço</option>
                  <option value="name-asc">Ordem alfabética</option>
                </select>
              </div>
            </div>
          </div>

          {/* Linha Secundária: Tamanhos & Coleção */}
          <div className="pt-3 border-t border-[var(--border-hairline)] flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)] mr-1">
                Tamanho:
              </span>
              {SIZE_OPTIONS.map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setSelectedSize((prev) => (prev === sz ? '' : sz))}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                    selectedSize === sz
                      ? 'border border-[var(--accent-uv)] text-[var(--text-primary)] bg-[var(--accent-uv-glow)] shadow-[0_0_12px_var(--accent-uv-glow)]'
                      : 'border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  {sz}
                </button>
              ))}

              <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)] ml-3 mr-1">
                Coleção:
              </span>
              <select
                aria-label="Filtrar por coleção"
                value={collection}
                onChange={(e) => setCollection(e.target.value)}
                className="rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3 py-1 text-xs text-[var(--text-primary)] focus:outline-none"
              >
                <option value="todas">Todas as coleções</option>
                {collections.map((col) => (
                  <option key={col.id} value={col.slug}>
                    {col.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] tabular-nums">
              <span>{products.length} peça(s)</span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-4"
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                  <span>Limpar filtros</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Estado de Erro */}
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
              onClick={loadCatalog}
              className="px-4 py-2 rounded-full border border-[var(--border-strong)] text-xs uppercase tracking-[0.14em] text-[var(--text-primary)]"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Skeleton Loading */}
        {loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" aria-busy="true">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="glass-card rounded-[20px] p-3.5 space-y-4 animate-pulse"
              >
                <div className="aspect-[3/4] w-full rounded-[14px] bg-[var(--bg-card-media)]" />
                <div className="space-y-2 px-1">
                  <div className="h-3 w-20 rounded bg-[var(--border-hairline)]" />
                  <div className="h-4 w-32 rounded bg-[var(--border-hairline)]" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Estado Vazio */}
        {!loading && !error && products.length === 0 && (
          <div className="relative overflow-hidden glass-surface rounded-[28px] py-16 px-6 text-center space-y-4">
            <PortalSingularity className="mx-auto w-24 h-24 opacity-60" />
            <p className="font-display text-lg text-[var(--text-primary)]">
              Nenhuma peça corresponde aos filtros aplicados.
            </p>
            <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
              Ajuste a busca, tamanho ou categoria para visualizar os itens disponíveis no catálogo demonstrativo.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="px-5 py-2.5 rounded-full border border-[var(--border-strong)] text-xs uppercase tracking-[0.16em] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
            >
              Redefinir filtros
            </button>
          </div>
        )}

        {/* Grade de Produtos */}
        {!loading && !error && products.length > 0 && (
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6"
          >
            <AnimatePresence mode="popLayout">
              {products.map((product, i) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, scale: 0.96, filter: 'blur(4px)' }}
                  transition={{
                    duration: 0.36,
                    delay: Math.min(i * 0.04, 0.2),
                    ease: THRESHOLD_EASE,
                  }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
