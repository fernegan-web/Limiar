import React from 'react';
import { Plus } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useRouter } from '../../context/RouterContext';
import type { AccentTone, Product } from '../../types/commerce';
import { LimiarStar } from '../ornaments/CybersigilismOrnaments';
import { ResilientImage } from '../ui/ResilientImage';

const ACCENT_DOT_COLORS: Record<AccentTone, string> = {
  acid: 'bg-[var(--accent-acid)]',
  uv: 'bg-[var(--accent-uv)]',
  terracotta: 'bg-[var(--accent-terracotta)]',
  mineral: 'bg-[var(--accent-mineral)]',
  neutral: 'bg-[var(--text-muted)]',
};

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { navigate } = useRouter();
  const { addItem } = useCart();

  const firstAvailableVariant =
    product.variants.find((v) => v.inStock) ?? product.variants[0];

  const handleOpenProduct = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    navigate(`/produto/${product.slug}`);
  };

  const handleQuickAdd = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!firstAvailableVariant || !firstAvailableVariant.inStock) {
      navigate(`/produto/${product.slug}`);
      return;
    }
    addItem(product, firstAvailableVariant, 1);
  };

  return (
    <article className="group glass-card rounded-[20px] p-3.5 flex flex-col justify-between transition-transform duration-300 hover:-translate-y-0.5">
      {/* Media Container */}
      <a
        href={`/produto/${product.slug}`}
        onClick={handleOpenProduct}
        className="relative block aspect-[3/4] w-full overflow-hidden rounded-[14px] bg-[var(--bg-card-media)]"
      >
        <ResilientImage
          src={product.images[0]}
          alt={product.name}
          fallbackTitle={product.name}
          className="h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.035]"
          loading="lazy"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-3 right-3 text-[#E8E7E0]/75 transition-transform duration-500 group-hover:rotate-12"
        >
          <LimiarStar className="w-4 h-4" />
        </span>
      </a>

      {/* Card Footer Metadata */}
      <div className="pt-4 pb-1 px-1 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-1">
            <span
              aria-hidden="true"
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${ACCENT_DOT_COLORS[product.accentTone]}`}
            />
            <span className="truncate">{product.categoryName}</span>
          </div>
          <a
            href={`/produto/${product.slug}`}
            onClick={handleOpenProduct}
            className="block font-display text-sm sm:text-[15px] font-medium tracking-[0.04em] uppercase text-[var(--text-primary)] truncate hover:text-[var(--accent-uv)] transition-colors"
          >
            {product.name}
          </a>
          <p className="mt-0.5 text-sm text-[var(--text-secondary)] tabular-nums">
            {product.formattedPrice}
          </p>
        </div>

        <button
          type="button"
          onClick={handleQuickAdd}
          aria-label={`Adicionar ${product.name} ao carrinho`}
          title={`Adicionar ${product.name} (${firstAvailableVariant?.size ?? ''})`}
          className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full border border-[var(--border-strong)] bg-[var(--bg-glass)] text-[var(--text-primary)] hover:border-[var(--accent-uv)] hover:shadow-[0_0_16px_var(--accent-uv-glow)] transition-all duration-200"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
