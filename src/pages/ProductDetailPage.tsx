import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Check, ChevronDown, Minus, Plus } from 'lucide-react';
import {
  CybersigilismCorner,
  LimiarStar,
} from '../components/ornaments/CybersigilismOrnaments';
import { ResilientImage } from '../components/ui/ResilientImage';
import { UltravioletButton } from '../components/ui/UltravioletButton';
import { THRESHOLD_EASE } from '../motion/thresholdConfig';
import { useCart } from '../context/CartContext';
import { useRouter } from '../context/RouterContext';
import { fetchProductBySlug } from '../services/catalogService';
import type { Product, ProductVariant } from '../types/commerce';

interface ProductDetailPageProps {
  slug: string;
}

export function ProductDetailPage({ slug }: ProductDetailPageProps) {
  const { navigate } = useRouter();
  const { addItem } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addedFeedback, setAddedFeedback] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setActiveImageIdx(0);
    setQuantity(1);
    fetchProductBySlug(slug).then((found) => {
      if (!active) return;
      setProduct(found);
      if (found) {
        const firstInStock = found.variants.find((v) => v.inStock) ?? found.variants[0] ?? null;
        setSelectedVariant(firstInStock);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1360px] px-4 sm:px-8 py-14 animate-pulse grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 aspect-[3/4] rounded-[24px] bg-[var(--bg-card-media)]" />
        <div className="lg:col-span-5 space-y-4">
          <div className="h-4 w-32 rounded bg-[var(--border-hairline)]" />
          <div className="h-10 w-64 rounded bg-[var(--border-hairline)]" />
          <div className="h-6 w-28 rounded bg-[var(--border-hairline)]" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-[1360px] px-4 sm:px-8 py-24 text-center space-y-5">
        <h1 className="font-display text-2xl uppercase tracking-[0.06em] text-[var(--text-primary)]">
          Peça não encontrada
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          O item solicitado não está disponível no catálogo demonstrativo atual.
        </p>
        <UltravioletButton href="/loja">Voltar à loja</UltravioletButton>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (!selectedVariant || !selectedVariant.inStock) return;
    addItem(product, selectedVariant, quantity);
    setAddedFeedback(true);
    window.setTimeout(() => setAddedFeedback(false), 1800);
  };

  return (
    <div className="relative overflow-hidden">
      <div className="relative mx-auto max-w-[1360px] px-4 sm:px-8 pt-8 pb-20 space-y-8">
        {/* Navegação / Breadcrumb */}
        <div className="flex items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
          <a
            href="/loja"
            onClick={(e) => {
              e.preventDefault();
              navigate('/loja');
            }}
            className="inline-flex items-center gap-2 uppercase tracking-[0.16em] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Voltar para loja</span>
          </a>
          <span className="truncate">
            {product.categoryName} · {product.collectionName}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Galeria Esquerda */}
          <div className="lg:col-span-7 flex flex-col-reverse sm:flex-row gap-4 lg:sticky lg:top-24">
            {product.images.length > 1 && (
              <div className="flex sm:flex-col gap-3 shrink-0">
                {product.images.map((img, idx) => (
                  <button
                    key={`${img}-${idx}`}
                    type="button"
                    onClick={() => setActiveImageIdx(idx)}
                    aria-label={`Ver imagem ${idx + 1} de ${product.name}`}
                    className={`w-16 h-20 sm:w-20 sm:h-24 rounded-xl overflow-hidden border transition-all bg-[var(--bg-card-media)] ${
                      activeImageIdx === idx
                        ? 'border-[var(--accent-uv)] shadow-[0_0_14px_var(--accent-uv-glow)]'
                        : 'border-[var(--border-hairline)] opacity-60 hover:opacity-100'
                    }`}
                  >
                    <ResilientImage
                      src={img}
                      alt={`${product.name} — miniatura ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            <div className="relative flex-1 aspect-[3/4] rounded-[26px] overflow-hidden glass-card bg-[var(--bg-card-media)]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={product.images[activeImageIdx] ?? product.images[0]}
                  initial={{ opacity: 0.2, scale: 1.015 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0.2 }}
                  transition={{ duration: 0.3, ease: THRESHOLD_EASE }}
                  className="w-full h-full"
                >
                  <ResilientImage
                    src={product.images[activeImageIdx] ?? product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              </AnimatePresence>
              <span className="pointer-events-none absolute top-4 right-4 text-[#E8E7E0]/75">
                <LimiarStar className="w-5 h-5" />
              </span>
              <CybersigilismCorner className="pointer-events-none absolute bottom-3 left-3 w-12 h-12 rotate-180 text-[#E8E7E0]/45" />
            </div>
          </div>

          {/* Módulo Contíguo de Compra Direita (Tier 3 Glass) */}
          <div className="lg:col-span-5 glass-surface-strong rounded-[28px] p-6 sm:p-8 space-y-6 lg:sticky lg:top-24">
            <div className="space-y-2 border-b border-[var(--border-hairline)] pb-5">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                {product.collectionName} · Item demonstrativo
              </p>
              <h1 className="font-display font-light text-3xl sm:text-4xl uppercase tracking-[0.03em] text-[var(--text-primary)]">
                {product.name}
              </h1>
              <p className="text-xl font-medium text-[var(--text-primary)] tabular-nums pt-1">
                {product.formattedPrice}
              </p>
            </div>

            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {product.description}
            </p>

            {/* Seleção de Tamanho */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Tamanho
                </span>
                {selectedVariant && (
                  <span className="text-[var(--text-secondary)]">
                    {selectedVariant.colorName} ·{' '}
                    {selectedVariant.inStock
                      ? 'Disponível (demonstração)'
                      : 'Indisponível'}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Selecionar tamanho">
                {product.variants.map((variant) => {
                  const isSelected = selectedVariant?.id === variant.id;
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      disabled={!variant.inStock}
                      onClick={() => setSelectedVariant(variant)}
                      className={`min-w-[48px] h-11 px-4 rounded-xl text-xs font-medium transition-all ${
                        !variant.inStock
                          ? 'border border-[var(--border-hairline)] text-[var(--text-muted)] opacity-45 line-through cursor-not-allowed'
                          : isSelected
                            ? 'border border-[var(--accent-uv)] bg-[var(--accent-uv-glow)] text-[var(--text-primary)] shadow-[0_0_16px_var(--accent-uv-glow)]'
                            : 'border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {variant.size}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quantidade + CTA */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <div className="inline-flex items-center justify-between rounded-full border border-[var(--border-hairline)] bg-[var(--bg-canvas)]/55 px-2 h-12 sm:w-32">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Diminuir quantidade"
                  className="w-8 h-8 inline-flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
                <span className="text-sm font-medium tabular-nums text-[var(--text-primary)]">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  aria-label="Aumentar quantidade"
                  className="w-8 h-8 inline-flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>

              <UltravioletButton
                onClick={handleAddToCart}
                disabled={!selectedVariant || !selectedVariant.inStock}
                size="lg"
                className="flex-1"
              >
                {addedFeedback ? (
                  <span className="inline-flex items-center gap-2">
                    <Check className="w-4 h-4 text-[var(--accent-acid)]" aria-hidden="true" />
                    Adicionado ao carrinho
                  </span>
                ) : (
                  'ADICIONAR AO CARRINHO'
                )}
              </UltravioletButton>
            </div>

            {/* Informações Adicionais */}
            <div className="pt-4 border-t border-[var(--border-hairline)] space-y-2.5">
              {[
                { title: 'Detalhes da peça', body: product.shortDescription },
                { title: 'Composição e cuidados', body: `${product.composition} ${product.careInstructions}` },
                {
                  title: 'Envio e checkout Wix',
                  body: 'Valores, frete e disponibilidade definitivos serão sincronizados diretamente com o catálogo oficial da loja Wix na Fase 02.',
                },
              ].map((section) => (
                <details
                  key={section.title}
                  className="group rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 py-3 text-sm transition-colors hover:border-[var(--border-strong)]"
                >
                  <summary className="flex items-center justify-between cursor-pointer list-none text-xs uppercase tracking-[0.16em] font-medium text-[var(--text-primary)]">
                    <span>{section.title}</span>
                    <ChevronDown
                      className="w-4 h-4 text-[var(--text-muted)] transition-transform duration-200 group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <p className="mt-3 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                    {section.body}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
