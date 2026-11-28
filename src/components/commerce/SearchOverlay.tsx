import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Search, X } from 'lucide-react';
import { usePersonalization } from '../../context/PersonalizationContext';
import { useRouter } from '../../context/RouterContext';
import { THRESHOLD_EASE } from '../../motion/thresholdConfig';
import { trackAdSearch } from '../../services/analytics/adTrackingService';
import { fetchCatalogSnapshot, searchCatalogSuggestions } from '../../services/catalogService';
import type { Product } from '../../types/commerce';
import { ResilientImage } from '../ui/ResilientImage';

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [results, setResults] = useState<Product[]>([]);
  const { navigate } = useRouter();
  const { recordSearchQuery } = usePersonalization();
  const lastTrackedRef = useRef('');

  useEffect(() => {
    if (!open) return;
    let active = true;
    fetchCatalogSnapshot().then((snapshot) => {
      if (active) setAllProducts(snapshot.products);
    });
    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setResults(allProducts.slice(0, 8));
      return;
    }
    setResults(searchCatalogSuggestions(allProducts, trimmed, 10));

    const timer = window.setTimeout(() => {
      if (trimmed.length >= 2 && trimmed.toLowerCase() !== lastTrackedRef.current) {
        lastTrackedRef.current = trimmed.toLowerCase();
        recordSearchQuery(trimmed);
        trackAdSearch(trimmed);
      }
    }, 280);
    return () => window.clearTimeout(timer);
  }, [allProducts, open, query, recordSearchQuery]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length >= 2) {
      recordSearchQuery(trimmed);
      trackAdSearch(trimmed);
    }
    onClose();
    navigate(trimmed ? `/loja?busca=${encodeURIComponent(trimmed)}` : '/loja');
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[75] flex items-start justify-center pt-20 sm:pt-28 px-4">
          <motion.button
            type="button"
            aria-label="Fechar busca"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: THRESHOLD_EASE }}
            className="fixed inset-0 bg-black/65 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Buscar no catálogo"
            initial={{ opacity: 0, y: -12, scale: 0.975, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, scale: 0.98, filter: 'blur(4px)' }}
            transition={{ duration: 0.26, ease: THRESHOLD_EASE }}
            className="relative z-10 w-full max-w-xl glass-surface-strong rounded-[24px] p-5 sm:p-6 space-y-5"
          >
            <form onSubmit={handleSubmit} className="flex items-center gap-3 pb-3 border-b border-[var(--border-hairline)]">
              <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" aria-hidden="true" />
              <label htmlFor="limiar-search-input" className="sr-only">
                Buscar produtos
              </label>
              <input
                id="limiar-search-input"
                type="search"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar peça, categoria ou coleção..."
                className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
              />
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar janela de busca"
                className="w-8 h-8 rounded-full inline-flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </form>

            <div className="max-h-80 overflow-y-auto space-y-2">
              {results.length === 0 ? (
                <p className="py-8 text-center text-sm text-[var(--text-muted)]">
                  Nenhuma peça encontrada para &ldquo;{query}&rdquo;.
                </p>
              ) : (
                results.map((product) => (
                  <a
                    key={product.id}
                    href={`/produto/${product.slug}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onClose();
                      navigate(`/produto/${product.slug}`);
                    }}
                    className="flex items-center gap-3.5 p-2.5 rounded-xl hover:bg-[var(--bg-surface-hover)] transition-colors"
                  >
                    <div className="w-12 h-14 rounded-lg overflow-hidden bg-[var(--bg-card-media)] shrink-0">
                      <ResilientImage
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-sm uppercase tracking-[0.04em] text-[var(--text-primary)] truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {product.categoryName} · {product.collectionName}
                      </p>
                    </div>
                    <div className="text-right shrink-0 tabular-nums">
                      {product.discountPercentage && product.formattedOriginalPrice ? (
                        <span className="block text-[11px] text-[var(--text-muted)] line-through">
                          {product.formattedOriginalPrice}
                        </span>
                      ) : null}
                      <span
                        className={`text-sm ${
                          product.discountPercentage
                            ? 'text-[var(--accent-acid)] font-medium'
                            : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        {product.formattedPrice}
                      </span>
                    </div>
                  </a>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
