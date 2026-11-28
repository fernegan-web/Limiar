import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from '../../context/RouterContext';
import type { Product } from '../../types/commerce';
import { LimiarStar } from '../ornaments/CybersigilismOrnaments';
import { ProductCard } from './ProductCard';

interface ProductCarouselProps {
  id?: string;
  title: string;
  subtitle?: string;
  products: Product[];
  ctaLabel?: string;
  ctaHref?: string;
  minItems?: number;
}

export function ProductCarousel({
  id,
  title,
  subtitle,
  products,
  ctaLabel,
  ctaHref,
  minItems = 3,
}: ProductCarouselProps) {
  const { navigate } = useRouter();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateScrollButtons = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    setCanScrollPrev(el.scrollLeft > 8);
    setCanScrollNext(el.scrollLeft < maxScroll - 8);
  }, []);

  useEffect(() => {
    updateScrollButtons();
    const el = trackRef.current;
    if (!el) return;
    window.addEventListener('resize', updateScrollButtons, { passive: true });
    return () => window.removeEventListener('resize', updateScrollButtons);
  }, [products.length, updateScrollButtons]);

  if (products.length < minItems) {
    return null;
  }

  const scrollByStep = (direction: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    const step = Math.max(260, Math.round(el.clientWidth * 0.72));
    el.scrollBy({ left: direction * step, behavior: 'smooth' });
  };

  return (
    <section
      id={id}
      aria-label={title}
      className="relative mx-auto max-w-[1440px] px-4 sm:px-8 py-6 sm:py-8"
    >
      <div className="flex items-end justify-between gap-4 mb-5">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2.5">
            <LimiarStar className="w-3.5 h-3.5 text-[var(--accent-uv)] shrink-0 opacity-85" />
            <h2 className="font-display text-xs sm:text-[13px] uppercase tracking-[0.2em] font-medium text-[var(--text-primary)] truncate">
              {title}
            </h2>
          </div>
          {subtitle && (
            <p className="text-xs text-[var(--text-muted)] pl-6 truncate">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {ctaLabel && ctaHref && (
            <a
              href={ctaHref}
              onClick={(e) => {
                e.preventDefault();
                navigate(ctaHref);
              }}
              className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] whitespace-nowrap mr-1 transition-colors"
            >
              <span>{ctaLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          )}

          <div className="hidden md:flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => scrollByStep(-1)}
              disabled={!canScrollPrev}
              aria-label={`Anterior em ${title}`}
              className="w-8 h-8 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-glass)] inline-flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => scrollByStep(1)}
              disabled={!canScrollNext}
              aria-label={`Próximo em ${title}`}
              className="w-8 h-8 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-glass)] inline-flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={trackRef}
        onScroll={updateScrollButtons}
        className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden touch-pan-x touch-pan-y"
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="w-[47%] sm:w-[228px] md:w-[236px] lg:w-[244px] xl:w-[252px] shrink-0 snap-start flex flex-col"
          >
            <ProductCard product={product} compact className="h-full" />
          </div>
        ))}
      </div>
    </section>
  );
}
