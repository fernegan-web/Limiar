import React, { useRef, useState } from 'react';
import { ArrowUpRight, Check, Heart, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { useCart } from '../../context/CartContext';
import { useFavorites } from '../../context/FavoritesContext';
import { useRouter } from '../../context/RouterContext';
import { useThresholdPointer } from '../../motion/ThresholdMotionProvider';
import type { AccentTone, Product } from '../../types/commerce';
import { formatBRL } from '../../utils/validation';
import { CybersigilismCorner } from '../ornaments/CybersigilismOrnaments';
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
  compact?: boolean;
  className?: string;
}

export function ProductCard({ product, compact = false, className = '' }: ProductCardProps) {
  const { navigate } = useRouter();
  const { addItem } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { reducedMotion } = useThresholdPointer();
  const cardRef = useRef<HTMLElement | null>(null);
  const [addedPulse, setAddedPulse] = useState(false);

  const favorited = isFavorite(product.id);
  const inStock = product.inStock !== false;
  const firstAvailableVariant =
    product.variants.find((v) => v.inStock) ?? product.variants[0];
  const requiresVariantSelection =
    Boolean(product.manageVariants) ||
    (product.options?.length ?? 0) > 0 ||
    product.variants.length > 1;

  const hasDiscount = Boolean(
    product.discountPercentage && product.discountPercentage > 0 && product.formattedOriginalPrice
  );

  const displayPriceText =
    product.hasVariablePrice && typeof product.minPrice === 'number'
      ? `A partir de ${formatBRL(product.minPrice)}`
      : product.formattedPrice;

  const handleOpenProduct = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    navigate(`/produto/${product.slug}`);
  };

  const handleToggleFavorite = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(product);
  };

  const handlePrimaryAction = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!inStock) return;
    if (requiresVariantSelection || !firstAvailableVariant || !firstAvailableVariant.inStock) {
      navigate(`/produto/${product.slug}`);
      return;
    }
    addItem(product, firstAvailableVariant, 1);
    setAddedPulse(true);
    window.setTimeout(() => setAddedPulse(false), 850);
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
      data-testid={`product-card-${product.slug}`}
      className={`group glass-card rounded-[18px] sm:rounded-[22px] ${
        compact ? 'p-2.5 sm:p-3' : 'p-2.5 sm:p-3.5'
      } h-full flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300 ${className}`}
    >
      {/* Media Container */}
      <div className="relative">
        <a
          href={`/produto/${product.slug}`}
          onClick={handleOpenProduct}
          className="relative block aspect-[3/4] w-full overflow-hidden rounded-[13px] sm:rounded-[15px] bg-[var(--bg-card-media)] border border-[var(--border-hairline)]"
        >
          <ResilientImage
            src={product.images[0]}
            alt={product.name}
            fallbackTitle={product.name}
            sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 22vw"
            className={`h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04] ${
              !inStock ? 'opacity-60 grayscale-[35%]' : ''
            }`}
            loading="lazy"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/32 via-transparent to-black/10 opacity-70"
          />

          {/* Discreet corner sigil reveal on hover (desktop) */}
          <span
            aria-hidden="true"
            className="hidden sm:block pointer-events-none absolute bottom-2 left-2 text-[#E8E7E0]/45 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          >
            <CybersigilismCorner className="w-9 h-9 rotate-180" />
          </span>
        </a>

        {/* Indicador único de status real (Desconto real ou Indisponível) */}
        {!inStock ? (
          <span className="pointer-events-none absolute top-2 left-2 px-2 py-0.5 rounded-md bg-[var(--bg-glass-strong)] border border-[var(--border-hairline)] text-[10px] uppercase tracking-[0.1em] font-medium text-[var(--text-muted)]">
            Esgotado
          </span>
        ) : hasDiscount ? (
          <span
            data-testid={`discount-badge-${product.slug}`}
            className="pointer-events-none absolute top-2 left-2 px-2 py-0.5 rounded-md bg-[#0e1110]/82 border border-[var(--accent-acid)]/45 text-[10px] sm:text-[11px] font-medium tracking-[0.04em] text-[#a4c75a] tabular-nums"
          >
            -{product.discountPercentage}%
          </span>
        ) : product.freeShippingEligible ? (
          <span className="pointer-events-none absolute top-2 left-2 px-2 py-0.5 rounded-md bg-[var(--bg-glass-strong)] border border-[var(--border-hairline)] text-[10px] uppercase tracking-[0.08em] text-[var(--text-primary)]">
            Frete grátis
          </span>
        ) : null}

        {/* Botão real de Favorito (acessível no mobile e desktop sem depender de hover) */}
        <button
          type="button"
          onClick={handleToggleFavorite}
          aria-pressed={favorited}
          aria-label={
            favorited
              ? `Remover ${product.name} dos favoritos`
              : `Favoritar ${product.name}`
          }
          data-testid={`favorite-btn-${product.slug}`}
          className={`absolute top-2 right-2 w-8 h-8 rounded-full inline-flex items-center justify-center border shadow-sm transition-all duration-200 ${
            favorited
              ? 'border-[var(--accent-uv)] bg-[var(--bg-elevated)] text-[var(--accent-uv)] shadow-[0_0_12px_var(--accent-uv-glow)]'
              : 'border-[var(--border-strong)] bg-[var(--bg-elevated)] md:bg-[var(--bg-glass-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-uv-edge)]'
          }`}
        >
          <Heart
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              favorited ? 'fill-current scale-105' : ''
            }`}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Card Footer Metadata */}
      <div className="pt-3 pb-0.5 px-0.5 flex flex-col justify-between flex-1 gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-[var(--text-muted)]">
            <span
              aria-hidden="true"
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${ACCENT_DOT_COLORS[product.accentTone]}`}
            />
            <span className="truncate">{product.categoryName}</span>
          </div>

          <a
            href={`/produto/${product.slug}`}
            onClick={handleOpenProduct}
            className="block font-display text-[13px] sm:text-[14px] font-medium tracking-[0.03em] uppercase text-[var(--text-primary)] leading-snug line-clamp-2 h-[2.5rem] sm:h-[2.75rem] overflow-hidden text-ellipsis hover:text-[var(--accent-uv)] transition-colors"
            title={product.name}
          >
            {product.name}
          </a>
        </div>

        <div className="flex items-end justify-between gap-2 pt-1">
          <div className="min-w-0 flex flex-col tabular-nums">
            {hasDiscount && product.formattedOriginalPrice && (
              <span className="text-[10px] sm:text-[11px] text-[var(--text-muted)] line-through leading-tight">
                {product.formattedOriginalPrice}
              </span>
            )}
            <span
              className={`text-[13px] sm:text-sm font-medium leading-tight truncate ${
                hasDiscount
                  ? 'text-[#5b7720] dark:text-[var(--accent-acid)]'
                  : 'text-[var(--text-primary)]'
              }`}
            >
              {displayPriceText}
            </span>
          </div>

          <motion.button
            type="button"
            disabled={!inStock}
            whileHover={!inStock || reducedMotion ? undefined : { scale: 1.06 }}
            whileTap={!inStock || reducedMotion ? undefined : { scale: 0.92 }}
            onClick={handlePrimaryAction}
            aria-label={
              !inStock
                ? `${product.name} indisponível`
                : requiresVariantSelection
                  ? `Escolher opções de ${product.name}`
                  : `Adicionar ${product.name} ao carrinho`
            }
            title={
              !inStock
                ? 'Indisponível'
                : requiresVariantSelection
                  ? `Escolher opções`
                  : `Adicionar ao carrinho`
            }
            data-testid={`card-action-btn-${product.slug}`}
            className={`shrink-0 inline-flex items-center justify-center h-8 rounded-full border transition-all duration-200 ${
              !inStock
                ? 'w-8 border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-muted)] opacity-45 cursor-not-allowed'
                : addedPulse
                  ? 'px-2.5 border-[var(--accent-acid)] bg-[var(--bg-surface-hover)] text-[#5b7720] dark:text-[var(--accent-acid)] shadow-[0_0_16px_var(--accent-uv-glow)]'
                  : requiresVariantSelection
                    ? 'w-8 sm:w-auto sm:px-2.5 sm:gap-1 border-[var(--border-strong)] bg-[var(--bg-glass)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-uv-edge)] hover:shadow-[0_0_14px_var(--accent-uv-glow)]'
                    : 'w-8 border-[var(--border-strong)] bg-[var(--bg-glass)] text-[var(--text-primary)] hover:border-[var(--accent-uv)] hover:shadow-[0_0_14px_var(--accent-uv-glow)]'
            }`}
          >
            {addedPulse ? (
              <Check className="w-3.5 h-3.5" aria-hidden="true" />
            ) : requiresVariantSelection ? (
              <>
                <span className="hidden sm:inline text-[10px] uppercase tracking-[0.1em] font-medium">
                  Opções
                </span>
                <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
              </>
            ) : (
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </motion.button>
        </div>
      </div>
    </article>
  );
}
