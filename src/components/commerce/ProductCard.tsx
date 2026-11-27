import React, { useRef, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { useCart } from '../../context/CartContext';
import { useRouter } from '../../context/RouterContext';
import { useThresholdPointer } from '../../motion/ThresholdMotionProvider';
import type { AccentTone, Product } from '../../types/commerce';
import { CybersigilismCorner, LimiarStar } from '../ornaments/CybersigilismOrnaments';
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
  const { reducedMotion } = useThresholdPointer();
  const cardRef = useRef<HTMLElement | null>(null);
  const [addedPulse, setAddedPulse] = useState(false);

  const firstAvailableVariant =
    product.variants.find((v) => v.inStock) ?? product.variants[0];
  const requiresVariantSelection =
    Boolean(product.manageVariants) ||
    (product.options?.length ?? 0) > 0 ||
    product.variants.length > 1;

  const handleOpenProduct = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    navigate(`/produto/${product.slug}`);
  };

  const handleQuickAdd = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (requiresVariantSelection || !firstAvailableVariant || !firstAvailableVariant.inStock) {
      navigate(`/produto/${product.slug}`);
      return;
    }
    addItem(product, firstAvailableVariant, 1);
    setAddedPulse(true);
    window.setTimeout(() => setAddedPulse(false), 750);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (reducedMotion || e.pointerType === 'touch' || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    cardRef.current.style.setProperty('--card-x', `${e.clientX - rect.left}px`);
    cardRef.current.style.setProperty('--card-y', `${e.clientY - rect.top}px`);
  };

  return (
    <article
      ref={cardRef}
      onPointerMove={handlePointerMove}
      className="group glass-card rounded-[22px] p-3.5 flex flex-col justify-between hover:-translate-y-1"
    >
      {/* Media Container */}
      <a
        href={`/produto/${product.slug}`}
        onClick={handleOpenProduct}
        className="relative block aspect-[3/4] w-full overflow-hidden rounded-[15px] bg-[var(--bg-card-media)] border border-[var(--border-hairline)]"
      >
        <ResilientImage
          src={product.images[0]}
          alt={product.name}
          fallbackTitle={product.name}
          className="h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
          loading="lazy"
        />

        {/* Subtle edge vignette inside media for garment depth */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10 opacity-70"
        />

        {/* Discreet corner sigil reveal on hover */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-2 left-2 text-[#E8E7E0]/45 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        >
          <CybersigilismCorner className="w-10 h-10 rotate-180" />
        </span>

        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-3 right-3 text-[#E8E7E0]/75 transition-transform duration-500 group-hover:rotate-12 group-hover:text-[var(--accent-uv)]"
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
          <div className="mt-0.5 flex items-baseline gap-2 tabular-nums">
            <span className="text-sm text-[var(--text-secondary)]">
              {product.formattedPrice}
            </span>
            {product.formattedOriginalPrice && (
              <span className="text-xs text-[var(--text-muted)] line-through">
                {product.formattedOriginalPrice}
              </span>
            )}
          </div>
        </div>

        <motion.button
          type="button"
          whileHover={{ scale: 1.07 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleQuickAdd}
          aria-label={
            requiresVariantSelection
              ? `Escolher opções de ${product.name}`
              : `Adicionar ${product.name} ao carrinho`
          }
          title={
            requiresVariantSelection
              ? `Escolher opções de ${product.name}`
              : `Adicionar ${product.name}`
          }
          className={`shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full border transition-all duration-200 ${
            addedPulse
              ? 'border-[var(--accent-acid)] bg-[var(--bg-surface-hover)] text-[var(--accent-acid)] shadow-[0_0_18px_var(--accent-uv-glow)]'
              : 'border-[var(--border-strong)] bg-[var(--bg-glass)] text-[var(--text-primary)] hover:border-[var(--accent-uv)] hover:shadow-[0_0_18px_var(--accent-uv-glow)]'
          }`}
        >
          {addedPulse ? (
            <Check className="w-4 h-4" aria-hidden="true" />
          ) : (
            <Plus className="w-4 h-4" aria-hidden="true" />
          )}
        </motion.button>
      </div>
    </article>
  );
}
