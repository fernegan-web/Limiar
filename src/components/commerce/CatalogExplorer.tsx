import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  ChevronDown,
  Search,
  SlidersHorizontal,
  Tag,
  X,
} from 'lucide-react';
import { usePersonalization } from '../../context/PersonalizationContext';
import { useRouter } from '../../context/RouterContext';
import { trackAdSearch } from '../../services/analytics/adTrackingService';
import {
  extractCatalogFacetMetadata,
  filterAndSortProducts,
  searchCatalogSuggestions,
} from '../../services/catalogService';
import type {
  CatalogQuery,
  Category,
  Collection,
  Product,
  SortOption,
} from '../../types/commerce';
import { formatBRL } from '../../utils/validation';
import { LimiarStar, PortalSingularity } from '../ornaments/CybersigilismOrnaments';
import { ResilientImage } from '../ui/ResilientImage';
import { ProductCard } from './ProductCard';

interface CatalogExplorerProps {
  id?: string;
  heading?: string;
  ctaLink?: { label: string; href: string };
  allProducts: Product[];
  categories: Category[];
  collections: Collection[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  initialQuery?: CatalogQuery;
  onQueryChange?: (query: CatalogQuery) => void;
  pageSize?: number;
}

export function CatalogExplorer({
  id = 'todos-os-produtos',
  heading,
  ctaLink,
  allProducts,
  categories,
  collections,
  loading,
  error,
  onRetry,
  initialQuery,
  onQueryChange,
  pageSize = 15,
}: CatalogExplorerProps) {
  const { navigate } = useRouter();
  const { recordSearchQuery } = usePersonalization();

  const [category, setCategory] = useState(initialQuery?.category || 'todas');
  const [collection, setCollection] = useState(initialQuery?.collection || 'todas');
  const [searchInput, setSearchInput] = useState(initialQuery?.search || '');
  const [debouncedSearch, setDebouncedSearch] = useState(initialQuery?.search || '');
  const [selectedSize, setSelectedSize] = useState(initialQuery?.size || '');
  const [minPriceInput, setMinPriceInput] = useState(
    initialQuery?.minPrice ? String(initialQuery.minPrice) : ''
  );
  const [maxPriceInput, setMaxPriceInput] = useState(
    initialQuery?.maxPrice ? String(initialQuery.maxPrice) : ''
  );
  const [onlyOffers, setOnlyOffers] = useState(Boolean(initialQuery?.onlyOffers));
  const [freeShippingOnly, setFreeShippingOnly] = useState(
    Boolean(initialQuery?.freeShippingOnly)
  );
  const [sort, setSort] = useState<SortOption>(initialQuery?.sort || 'featured');
  const [visibleLimit, setVisibleLimit] = useState(pageSize);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  const searchBoxRef = useRef<HTMLDivElement | null>(null);
  const lastTrackedQueryRef = useRef('');

  // Sincroniza quando initialQuery externo mudar (ex.: clique em categoria/busca via URL)
  useEffect(() => {
    if (!initialQuery) return;
    if (initialQuery.category !== undefined) setCategory(initialQuery.category || 'todas');
    if (initialQuery.collection !== undefined)
      setCollection(initialQuery.collection || 'todas');
    if (initialQuery.search !== undefined) {
      setSearchInput(initialQuery.search || '');
      setDebouncedSearch(initialQuery.search || '');
    }
    if (initialQuery.size !== undefined) setSelectedSize(initialQuery.size || '');
    if (initialQuery.onlyOffers !== undefined) setOnlyOffers(Boolean(initialQuery.onlyOffers));
    if (initialQuery.freeShippingOnly !== undefined)
      setFreeShippingOnly(Boolean(initialQuery.freeShippingOnly));
    if (initialQuery.sort !== undefined) setSort(initialQuery.sort || 'featured');
  }, [initialQuery]);

  // Debounce da busca textual + disparo consentido de sinal
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const trimmed = searchInput.trim();
      setDebouncedSearch(trimmed);
      setVisibleLimit(pageSize);

      if (trimmed.length >= 2 && trimmed.toLowerCase() !== lastTrackedQueryRef.current) {
        lastTrackedQueryRef.current = trimmed.toLowerCase();
        recordSearchQuery(trimmed);
        trackAdSearch(trimmed);
      }
    }, 200);
    return () => window.clearTimeout(timer);
  }, [pageSize, recordSearchQuery, searchInput]);

  // Fecha dropdown de sugestões ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSuggestionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const minPriceParsed = useMemo(() => {
    const n = Number(minPriceInput.replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }, [minPriceInput]);

  const maxPriceParsed = useMemo(() => {
    const n = Number(maxPriceInput.replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }, [maxPriceInput]);

  const activeQuery: CatalogQuery = useMemo(
    () => ({
      category,
      collection,
      search: debouncedSearch,
      size: selectedSize,
      minPrice: minPriceParsed,
      maxPrice: maxPriceParsed,
      onlyOffers,
      freeShippingOnly,
      sort,
    }),
    [
      category,
      collection,
      debouncedSearch,
      freeShippingOnly,
      maxPriceParsed,
      minPriceParsed,
      onlyOffers,
      selectedSize,
      sort,
    ]
  );

  useEffect(() => {
    onQueryChange?.(activeQuery);
  }, [activeQuery, onQueryChange]);

  const facetMeta = useMemo(
    () => extractCatalogFacetMetadata(allProducts),
    [allProducts]
  );

  const suggestions = useMemo(
    () => searchCatalogSuggestions(allProducts, searchInput, 6),
    [allProducts, searchInput]
  );

  const filteredProducts = useMemo(
    () => filterAndSortProducts(allProducts, activeQuery),
    [allProducts, activeQuery]
  );

  const visibleProducts = useMemo(
    () => filteredProducts.slice(0, visibleLimit),
    [filteredProducts, visibleLimit]
  );

  const hasRemaining = visibleProducts.length < filteredProducts.length;
  const remainingCount = filteredProducts.length - visibleProducts.length;

  const activeFilterCount =
    (category !== 'todas' ? 1 : 0) +
    (collection !== 'todas' ? 1 : 0) +
    (selectedSize ? 1 : 0) +
    (minPriceParsed ? 1 : 0) +
    (maxPriceParsed ? 1 : 0) +
    (onlyOffers ? 1 : 0) +
    (freeShippingOnly ? 1 : 0) +
    (debouncedSearch.trim() ? 1 : 0);

  const clearAllFilters = () => {
    setCategory('todas');
    setCollection('todas');
    setSearchInput('');
    setDebouncedSearch('');
    setSelectedSize('');
    setMinPriceInput('');
    setMaxPriceInput('');
    setOnlyOffers(false);
    setFreeShippingOnly(false);
    setSort('featured');
    setVisibleLimit(pageSize);
  };

  const showSuggestionsDropdown =
    suggestionsOpen && searchInput.trim().length >= 1 && !loading;

  return (
    <section
      id={id}
      aria-label={heading || 'Catálogo completo Limiar'}
      className="scroll-mt-24 relative mx-auto max-w-[1440px] px-4 sm:px-8 py-8 sm:py-12 space-y-6"
    >
      {/* Cabeçalho da seção quando exibida na Homepage */}
      {(heading || ctaLink) && (
        <div className="flex items-center justify-between gap-4">
          {heading && (
            <div className="flex items-center gap-3.5 flex-1 min-w-0">
              <LimiarStar className="w-4 h-4 text-[var(--accent-uv)] shrink-0 opacity-85" />
              <h2 className="font-display text-xs sm:text-[13px] uppercase tracking-[0.22em] font-medium text-[var(--text-primary)] whitespace-nowrap">
                {heading}
              </h2>
              <div className="hidden sm:block h-[1px] flex-1 bg-[var(--border-hairline)]" />
            </div>
          )}
          {ctaLink && (
            <a
              href={ctaLink.href}
              onClick={(e) => {
                e.preventDefault();
                navigate(ctaLink.href);
              }}
              className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] whitespace-nowrap shrink-0 transition-colors"
            >
              <span>{ctaLink.label}</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          )}
        </div>
      )}

      {/* Barra Unificada de Busca, Sugestões e Filtros Dinâmicos */}
      <div className="glass-surface-strong rounded-[22px] sm:rounded-[24px] p-3.5 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Busca com sugestões dinâmicas em tempo real */}
          <div ref={searchBoxRef} className="relative flex-1 max-w-xl">
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-canvas)]/60 focus-within:border-[var(--accent-uv-edge)] transition-colors">
              <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" aria-hidden="true" />
              <label htmlFor={`${id}-search-input`} className="sr-only">
                Buscar peças no catálogo
              </label>
              <input
                id={`${id}-search-input`}
                type="text"
                enterKeyHint="search"
                value={searchInput}
                onFocus={() => setSuggestionsOpen(true)}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setSuggestionsOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSuggestionsOpen(false);
                  } else if (e.key === 'Enter') {
                    setSuggestionsOpen(false);
                    const trimmed = searchInput.trim();
                    setDebouncedSearch(trimmed);
                    if (trimmed.length >= 2) {
                      recordSearchQuery(trimmed);
                      trackAdSearch(trimmed);
                    }
                  }
                }}
                placeholder="Buscar por nome, categoria ou coleção..."
                data-testid={`${id}-search-input`}
                className="w-full bg-transparent text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    setDebouncedSearch('');
                  }}
                  aria-label="Limpar busca"
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            {showSuggestionsDropdown && (
              <div
                role="listbox"
                aria-label="Sugestões de produtos"
                data-testid={`${id}-search-suggestions`}
                className="absolute left-0 right-0 top-full mt-2 z-30 bg-[var(--bg-elevated)] md:bg-[var(--bg-glass-strong)] md:backdrop-blur-2xl rounded-2xl border border-[var(--border-strong)] p-2 shadow-[0_22px_54px_-16px_rgba(0,0,0,0.6)] max-h-80 overflow-y-auto space-y-1"
              >
                {suggestions.length === 0 ? (
                  <p className="px-3 py-4 text-xs text-center text-[var(--text-muted)]">
                    Nenhuma peça encontrada para &ldquo;{searchInput.trim()}&rdquo;.
                  </p>
                ) : (
                  <>
                    {suggestions.map((item) => (
                      <a
                        key={item.id}
                        href={`/produto/${item.slug}`}
                        role="option"
                        onClick={(e) => {
                          e.preventDefault();
                          setSuggestionsOpen(false);
                          navigate(`/produto/${item.slug}`);
                        }}
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--bg-surface-hover)] transition-colors"
                      >
                        <div className="w-10 h-12 rounded-lg overflow-hidden bg-[var(--bg-card-media)] shrink-0">
                          <ResilientImage
                            src={item.images[0]}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-display text-xs uppercase tracking-[0.04em] text-[var(--text-primary)] truncate">
                            {item.name}
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)] truncate">
                            {item.categoryName}
                          </p>
                        </div>
                        <div className="text-right shrink-0 tabular-nums">
                          {item.discountPercentage && item.formattedOriginalPrice ? (
                            <span className="block text-[10px] text-[var(--text-muted)] line-through">
                              {item.formattedOriginalPrice}
                            </span>
                          ) : null}
                          <span
                            className={`text-xs font-medium ${
                              item.discountPercentage
                                ? 'text-[#5b7720] dark:text-[var(--accent-acid)]'
                                : 'text-[var(--text-secondary)]'
                            }`}
                          >
                            {item.formattedPrice}
                          </span>
                        </div>
                      </a>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Ordenação + Toggle Mobile de Filtros */}
          <div className="flex items-center justify-between sm:justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen((prev) => !prev)}
              aria-expanded={mobileFiltersOpen}
              data-testid={`${id}-toggle-filters`}
              className="lg:hidden inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-xs text-[var(--text-primary)]"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--accent-uv)]" aria-hidden="true" />
              <span>Filtros</span>
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[var(--accent-uv-glow)] text-[10px] tabular-nums">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${
                  mobileFiltersOpen ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            </button>

            <div className="flex items-center gap-2">
              <label htmlFor={`${id}-sort-select`} className="sr-only">
                Ordenar catálogo
              </label>
              <select
                id={`${id}-sort-select`}
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as SortOption);
                  setVisibleLimit(pageSize);
                }}
                data-testid={`${id}-sort-select`}
                className="rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3.5 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--accent-uv-edge)] focus:outline-none"
              >
                <option value="featured">Ordenar: Destaques</option>
                <option value="discount-desc">Maior desconto</option>
                <option value="price-asc">Menor preço</option>
                <option value="price-desc">Maior preço</option>
                <option value="name-asc">Ordem alfabética</option>
                <option value="newest">Mais recentes</option>
              </select>
            </div>
          </div>
        </div>

        {/* Categorias horizontais */}
        <div
          className="flex items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="group"
          aria-label="Filtrar por categoria"
        >
          <button
            type="button"
            onClick={() => {
              setCategory('todas');
              setVisibleLimit(pageSize);
            }}
            className={`px-3.5 py-1.5 rounded-full text-[11px] uppercase tracking-[0.14em] whitespace-nowrap shrink-0 transition-all ${
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
              onClick={() => {
                setCategory(cat.id);
                setVisibleLimit(pageSize);
              }}
              className={`px-3.5 py-1.5 rounded-full text-[11px] uppercase tracking-[0.14em] whitespace-nowrap shrink-0 transition-all ${
                category === cat.id
                  ? 'bg-[var(--text-primary)] text-[var(--text-inverse)] font-medium'
                  : 'border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Painel secundário: Tamanhos reais, Faixa de preço, Coleção, Ofertas */}
        <div
          className={`${
            mobileFiltersOpen ? 'flex' : 'hidden lg:flex'
          } flex-col lg:flex-row lg:items-center justify-between gap-4 pt-3 border-t border-[var(--border-hairline)]`}
        >
          <div className="flex flex-wrap items-center gap-3">
            {/* Tamanhos reais disponíveis no Wix */}
            {facetMeta.availableSizes.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] uppercase tracking-[0.15em] text-[var(--text-muted)] mr-1">
                  Tamanho:
                </span>
                {facetMeta.availableSizes.map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => {
                      setSelectedSize((prev) => (prev === sz ? '' : sz));
                      setVisibleLimit(pageSize);
                    }}
                    className={`min-w-[32px] h-7 px-2 rounded-lg text-[11px] font-medium transition-all ${
                      selectedSize.toUpperCase() === sz.toUpperCase()
                        ? 'border border-[var(--accent-uv)] text-[var(--text-primary)] bg-[var(--accent-uv-glow)]'
                        : 'border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            )}

            {/* Faixa de preço */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
                Preço:
              </span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={minPriceInput}
                onChange={(e) => {
                  setMinPriceInput(e.target.value);
                  setVisibleLimit(pageSize);
                }}
                placeholder={
                  facetMeta.minPriceBound > 0 ? `Mín ${facetMeta.minPriceBound}` : 'Mín'
                }
                aria-label="Preço mínimo"
                className="w-24 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)]/55 px-2.5 py-1 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-uv-edge)] focus:outline-none tabular-nums"
              />
              <span className="text-xs text-[var(--text-muted)]">–</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={maxPriceInput}
                onChange={(e) => {
                  setMaxPriceInput(e.target.value);
                  setVisibleLimit(pageSize);
                }}
                placeholder={
                  facetMeta.maxPriceBound > 0 ? `Máx ${facetMeta.maxPriceBound}` : 'Máx'
                }
                aria-label="Preço máximo"
                className="w-24 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)]/55 px-2.5 py-1 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-uv-edge)] focus:outline-none tabular-nums"
              />
            </div>

            {/* Coleção */}
            {collections.length > 0 && (
              <select
                aria-label="Filtrar por coleção"
                value={collection}
                onChange={(e) => {
                  setCollection(e.target.value);
                  setVisibleLimit(pageSize);
                }}
                className="rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3 py-1 text-xs text-[var(--text-primary)] focus:outline-none"
              >
                <option value="todas">Todas coleções</option>
                {collections.map((col) => (
                  <option key={col.id} value={col.slug}>
                    {col.name}
                  </option>
                ))}
              </select>
            )}

            {/* Em Oferta (real) */}
            {facetMeta.offersCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setOnlyOffers((prev) => !prev);
                  setVisibleLimit(pageSize);
                }}
                aria-pressed={onlyOffers}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] uppercase tracking-[0.12em] transition-all ${
                  onlyOffers
                    ? 'border border-[var(--accent-acid)] bg-[var(--bg-surface-hover)] text-[#5b7720] dark:text-[var(--accent-acid)] font-medium'
                    : 'border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                }`}
              >
                <Tag className="w-3 h-3" aria-hidden="true" />
                <span>Ofertas ({facetMeta.offersCount})</span>
              </button>
            )}

            {/* Frete grátis (somente quando existirem peças reais elegíveis na Wix) */}
            {facetMeta.freeShippingCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setFreeShippingOnly((prev) => !prev);
                  setVisibleLimit(pageSize);
                }}
                aria-pressed={freeShippingOnly}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] uppercase tracking-[0.12em] transition-all ${
                  freeShippingOnly
                    ? 'border border-[var(--accent-uv)] bg-[var(--accent-uv-glow)] text-[var(--text-primary)] font-medium'
                    : 'border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                }`}
              >
                <span>Frete grátis</span>
              </button>
            )}
          </div>

          {/* Contagem e limpeza de filtros */}
          <div className="flex items-center justify-between lg:justify-end gap-3 text-xs text-[var(--text-muted)] tabular-nums shrink-0">
            <span data-testid={`${id}-result-count`}>
              {filteredProducts.length}{' '}
              {filteredProducts.length === 1 ? 'peça' : 'peças'}
            </span>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-4"
              >
                <X className="w-3 h-3" aria-hidden="true" />
                <span>Limpar ({activeFilterCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Chips dos filtros ativos para remoção rápida */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {debouncedSearch && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setDebouncedSearch('');
                }}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <span>Busca: &ldquo;{debouncedSearch}&rdquo;</span>
                <X className="w-3 h-3" aria-hidden="true" />
              </button>
            )}
            {selectedSize && (
              <button
                type="button"
                onClick={() => setSelectedSize('')}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <span>Tam: {selectedSize}</span>
                <X className="w-3 h-3" aria-hidden="true" />
              </button>
            )}
            {(minPriceParsed || maxPriceParsed) && (
              <button
                type="button"
                onClick={() => {
                  setMinPriceInput('');
                  setMaxPriceInput('');
                }}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <span>
                  Preço: {minPriceParsed ? formatBRL(minPriceParsed) : '0'} –{' '}
                  {maxPriceParsed ? formatBRL(maxPriceParsed) : '∞'}
                </span>
                <X className="w-3 h-3" aria-hidden="true" />
              </button>
            )}
            {onlyOffers && (
              <button
                type="button"
                onClick={() => setOnlyOffers(false)}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-[var(--accent-acid)]/45 bg-[var(--bg-surface)] text-[11px] text-[var(--accent-acid)]"
              >
                <span>Somente ofertas</span>
                <X className="w-3 h-3" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Erro */}
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
            onClick={onRetry}
            className="px-4 py-2 rounded-full border border-[var(--border-strong)] text-xs uppercase tracking-[0.14em] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Skeletons de carregamento */}
      {loading && !error && (
        <div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-5"
          aria-busy="true"
        >
          {Array.from({ length: 10 }).map((_, idx) => (
            <div
              key={idx}
              className="glass-card rounded-[18px] sm:rounded-[22px] p-2.5 sm:p-3.5 space-y-3 animate-pulse"
            >
              <div className="aspect-[3/4] w-full rounded-[13px] bg-[var(--bg-card-media)]" />
              <div className="space-y-2 px-1">
                <div className="h-3 w-16 rounded bg-[var(--border-hairline)]" />
                <div className="h-4 w-28 rounded bg-[var(--border-hairline)]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Estado vazio */}
      {!loading && !error && filteredProducts.length === 0 && (
        <div className="relative overflow-hidden glass-surface rounded-[26px] py-14 px-6 text-center space-y-4">
          <PortalSingularity className="mx-auto w-20 h-20 opacity-60" />
          <p className="font-display text-lg text-[var(--text-primary)]">
            Nenhuma peça corresponde aos filtros aplicados.
          </p>
          <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
            Ajuste a busca, tamanho, faixa de preço ou categoria para explorar o catálogo completo.
          </p>
          <button
            type="button"
            onClick={clearAllFilters}
            className="px-5 py-2.5 rounded-full border border-[var(--border-strong)] text-xs uppercase tracking-[0.16em] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
          >
            Redefinir filtros
          </button>
        </div>
      )}

      {/* Grade Responsiva Compartilhada: 2 mobile | 3 tablet | 4-5 desktop */}
      {!loading && !error && visibleProducts.length > 0 && (
        <>
          <div
            data-testid={`${id}-product-grid`}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-5"
          >
            {visibleProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {hasRemaining && (
            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={() => setVisibleLimit((prev) => prev + pageSize)}
                className="px-6 py-2.5 rounded-full border border-[var(--border-strong)] bg-[var(--bg-glass)] text-xs uppercase tracking-[0.16em] text-[var(--text-primary)] hover:border-[var(--accent-uv-edge)] hover:bg-[var(--bg-surface-hover)] transition-all"
              >
                Mostrar mais peças ({remainingCount} restantes)
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
