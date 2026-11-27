import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, ArrowLeft, Check, ChevronDown, MessageCircle, Minus, Plus } from 'lucide-react';
import DOMPurify from 'dompurify';
import {
  CybersigilismCorner,
  LimiarStar,
} from '../components/ornaments/CybersigilismOrnaments';
import { ResilientImage } from '../components/ui/ResilientImage';
import { UltravioletButton } from '../components/ui/UltravioletButton';
import { THRESHOLD_EASE } from '../motion/thresholdConfig';
import { useCart } from '../context/CartContext';
import { useRouter } from '../context/RouterContext';
import {
  fetchProductBySlug,
  isOptionChoiceCompatibleWithSelection,
  isOptionChoiceGloballyInStock,
  resolveProductVariant,
  selectProductOptionWithReconciliation,
} from '../services/catalogService';
import type { Product, ProductOption, ProductVariant } from '../types/commerce';
import { buildProductWhatsAppUrl } from '../utils/whatsapp';

interface ProductDetailPageProps {
  slug: string;
}

function buildFallbackOptions(product: Product): ProductOption[] {
  if (product.options && product.options.length > 0) {
    return product.options;
  }
  if (product.variants.length <= 1) return [];

  const options: ProductOption[] = [];
  const sizes = Array.from(new Set(product.variants.map((v) => String(v.size)))).filter(
    (s) => s && s !== 'Único'
  );
  if (sizes.length > 0) {
    options.push({
      name: 'Tamanho',
      optionType: 'drop_down',
      choices: sizes.map((s) => ({
        value: s,
        description: s,
        inStock: product.variants.some((v) => String(v.size) === s && v.inStock),
        visible: true,
      })),
    });
  }

  const colors = Array.from(new Set(product.variants.map((v) => v.colorName))).filter(
    (c) => c && c !== 'Padrão'
  );
  if (colors.length > 0) {
    options.push({
      name: 'Cor',
      optionType: 'color',
      choices: colors.map((c) => ({
        value: c,
        description: c,
        inStock: product.variants.some((v) => v.colorName === c && v.inStock),
        visible: true,
      })),
    });
  }

  return options;
}

function getInitialChoices(product: Product, displayOptions: ProductOption[]): Record<string, string> {
  const firstInStock = product.variants.find((v) => v.inStock) ?? product.variants[0];
  if (!firstInStock) return {};
  if (firstInStock.choices && Object.keys(firstInStock.choices).length > 0) {
    return { ...firstInStock.choices };
  }
  const derived: Record<string, string> = {};
  for (const opt of displayOptions) {
    if (/tamanh|size/i.test(opt.name)) {
      derived[opt.name] = String(firstInStock.size);
    } else if (/cor|color/i.test(opt.name)) {
      derived[opt.name] = firstInStock.colorName;
    } else if (opt.choices[0]) {
      derived[opt.name] = opt.choices[0].value;
    }
  }
  return derived;
}

export function ProductDetailPage({ slug }: ProductDetailPageProps) {
  const { navigate } = useRouter();
  const { addItem } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [selectedChoices, setSelectedChoices] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [addedFeedback, setAddedFeedback] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    setActiveImageIdx(0);
    setQuantity(1);
    fetchProductBySlug(slug)
      .then((found) => {
        if (!active) return;
        setProduct(found);
        if (found) {
          const opts = buildFallbackOptions(found);
          setSelectedChoices(getInitialChoices(found, opts));
        }
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setLoadError('Não foi possível carregar os detalhes desta peça.');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  const displayOptions = useMemo(
    () => (product ? buildFallbackOptions(product) : []),
    [product]
  );

  const selectedVariant: ProductVariant | null = useMemo(() => {
    if (!product) return null;
    if (displayOptions.length === 0 || product.variants.length <= 1) {
      return product.variants[0] ?? null;
    }
    const syntheticProduct: Product =
      product.options && product.options.length > 0
        ? product
        : {
            ...product,
            options: displayOptions,
            variants: product.variants.map((v) => ({
              ...v,
              choices:
                v.choices && Object.keys(v.choices).length > 0
                  ? v.choices
                  : {
                      ...(v.size && v.size !== 'Único' ? { Tamanho: String(v.size) } : {}),
                      ...(v.colorName && v.colorName !== 'Padrão' ? { Cor: v.colorName } : {}),
                    },
            })),
          };
    return resolveProductVariant(syntheticProduct, selectedChoices);
  }, [product, displayOptions, selectedChoices]);

  useEffect(() => {
    if (!product || !selectedVariant) return;
    if (
      selectedVariant.trackQuantity &&
      typeof selectedVariant.stockCount === 'number' &&
      selectedVariant.stockCount > 0 &&
      quantity > selectedVariant.stockCount
    ) {
      setQuantity(selectedVariant.stockCount);
    }
    if (selectedVariant.imageUrl) {
      const idx = product.images.findIndex((url) => url === selectedVariant.imageUrl);
      if (idx >= 0) {
        setActiveImageIdx(idx);
      }
    }
  }, [product, selectedVariant, quantity]);

  const handleSelectOption = (optionName: string, choiceValue: string) => {
    if (!product) return;
    const syntheticProduct: Product =
      product.options && product.options.length > 0
        ? product
        : {
            ...product,
            options: displayOptions,
            variants: product.variants.map((v) => ({
              ...v,
              choices:
                v.choices && Object.keys(v.choices).length > 0
                  ? v.choices
                  : {
                      ...(v.size && v.size !== 'Único' ? { Tamanho: String(v.size) } : {}),
                      ...(v.colorName && v.colorName !== 'Padrão' ? { Cor: v.colorName } : {}),
                    },
            })),
          };
    setSelectedChoices((prev) =>
      selectProductOptionWithReconciliation(syntheticProduct, prev, optionName, choiceValue)
    );
  };

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

  if (loadError) {
    return (
      <div className="mx-auto max-w-[1360px] px-4 sm:px-8 py-24 text-center space-y-5">
        <AlertCircle className="w-8 h-8 mx-auto text-[var(--accent-terracotta)]" aria-hidden="true" />
        <h1 className="font-display text-2xl uppercase tracking-[0.06em] text-[var(--text-primary)]">
          Erro ao carregar produto
        </h1>
        <p className="text-sm text-[var(--text-muted)]">{loadError}</p>
        <UltravioletButton href="/loja" variant="secondary">
          Voltar à loja
        </UltravioletButton>
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
          Esta peça não está disponível no catálogo atual.
        </p>
        <UltravioletButton href="/loja" variant="secondary">
          Voltar à loja
        </UltravioletButton>
      </div>
    );
  }

  const maxStock =
    selectedVariant?.trackQuantity && typeof selectedVariant.stockCount === 'number'
      ? Math.max(1, selectedVariant.stockCount)
      : undefined;

  const canPurchase = Boolean(
    selectedVariant &&
      selectedVariant.inStock &&
      displayOptions.every((opt) => Boolean(selectedChoices[opt.name]))
  );

  const handleAddToCart = () => {
    if (!canPurchase || !selectedVariant) return;
    addItem(product, selectedVariant, quantity);
    setAddedFeedback(true);
    window.setTimeout(() => setAddedFeedback(false), 1800);
  };

  const productPageUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/produto/${product.slug}`
      : `/produto/${product.slug}`;

  const variantParts = displayOptions
    .map((opt) => (selectedChoices[opt.name] ? `${opt.name}: ${selectedChoices[opt.name]}` : null))
    .filter((v): v is string => Boolean(v));

  const variantSummary =
    variantParts.length > 0
      ? variantParts.join(' · ')
      : selectedVariant && (selectedVariant.size !== 'Único' || selectedVariant.colorName !== 'Padrão')
        ? `${selectedVariant.size} · ${selectedVariant.colorName}`
        : undefined;

  const whatsappBuyHref = buildProductWhatsAppUrl({
    productName: product.name,
    variantLabel: variantSummary,
    quantity,
    productUrl: productPageUrl,
  });

  const displayedPrice = selectedVariant?.formattedPrice || product.formattedPrice;
  const displayedOriginalPrice =
    selectedVariant?.formattedOriginalPrice || product.formattedOriginalPrice;

  const sanitizedDescriptionHtml = DOMPurify.sanitize(
    product.description || product.shortDescription,
    {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ['style', 'iframe', 'form', 'script', 'object', 'embed'],
      FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick'],
    }
  );

  return (
    <div className="relative overflow-x-clip">
      <div className="relative mx-auto max-w-[1360px] px-4 sm:px-8 pt-10 sm:pt-12 pb-20 space-y-8">
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
          <div className="lg:col-span-7 flex flex-col-reverse sm:flex-row gap-4 lg:sticky lg:top-28">
            {product.images.length > 1 && (
              <div className="flex sm:flex-col gap-3 shrink-0 overflow-x-auto sm:overflow-visible">
                {product.images.map((img, idx) => (
                  <button
                    key={`${img}-${idx}`}
                    type="button"
                    onClick={() => setActiveImageIdx(idx)}
                    aria-label={`Ver imagem ${idx + 1} de ${product.name}`}
                    className={`w-16 h-20 sm:w-20 sm:h-24 shrink-0 rounded-xl overflow-hidden border transition-all bg-[var(--bg-card-media)] ${
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
                  key={product.images[activeImageIdx] ?? product.images[0] ?? 'placeholder'}
                  initial={{ opacity: 0.2, scale: 1.015 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0.2 }}
                  transition={{ duration: 0.3, ease: THRESHOLD_EASE }}
                  className="w-full h-full"
                >
                  <ResilientImage
                    src={product.images[activeImageIdx] ?? product.images[0] ?? ''}
                    alt={product.name}
                    fallbackTitle={product.name}
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
          <div className="lg:col-span-5 glass-surface-strong rounded-[28px] p-6 sm:p-8 space-y-6 lg:sticky lg:top-28">
            <div className="space-y-2 border-b border-[var(--border-hairline)] pb-5">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                {product.collectionName}
              </p>
              <h1 className="font-display font-light text-3xl sm:text-4xl uppercase tracking-[0.03em] text-[var(--text-primary)]">
                {product.name}
              </h1>
              <div className="flex items-baseline gap-3 tabular-nums pt-1">
                <span className="text-xl font-medium text-[var(--text-primary)]">
                  {displayedPrice}
                </span>
                {displayedOriginalPrice && (
                  <span className="text-sm text-[var(--text-muted)] line-through">
                    {displayedOriginalPrice}
                  </span>
                )}
              </div>
              {selectedVariant && !selectedVariant.inStock && (
                <p className="text-xs text-[var(--accent-terracotta)]">
                  Combinação indisponível no momento.
                </p>
              )}
              {selectedVariant?.inStock &&
                selectedVariant.trackQuantity &&
                typeof selectedVariant.stockCount === 'number' &&
                selectedVariant.stockCount <= 5 && (
                  <p className="text-xs text-[var(--text-muted)]">
                    Restam {selectedVariant.stockCount}{' '}
                    {selectedVariant.stockCount === 1 ? 'unidade' : 'unidades'} nesta variante.
                  </p>
                )}
            </div>

            <div
              className="wix-description text-sm text-[var(--text-secondary)] leading-relaxed"
              dangerouslySetInnerHTML={{ __html: sanitizedDescriptionHtml }}
            />

            {/* Seletores Dinâmicos de Opções (Tamanho, Cor e demais atributos da Wix) */}
            {displayOptions.map((option) => {
              const currentSelection = selectedChoices[option.name] || '';
              return (
                <div key={option.name} className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="uppercase tracking-[0.16em] text-[var(--text-muted)]">
                      {option.name}
                    </span>
                    <span className="text-[var(--text-secondary)]">
                      {option.choices.find((c) => c.value === currentSelection)?.description ||
                        currentSelection}
                    </span>
                  </div>

                  <div
                    className="flex flex-wrap gap-2.5"
                    role="radiogroup"
                    aria-label={`Selecionar ${option.name}`}
                  >
                    {option.choices.map((choice) => {
                      const isSelected = currentSelection === choice.value;
                      const syntheticProduct: Product =
                        product.options && product.options.length > 0
                          ? product
                          : { ...product, options: displayOptions };
                      const hasAnyStock = isOptionChoiceGloballyInStock(
                        syntheticProduct,
                        option.name,
                        choice.value
                      );
                      const isCompatibleNow = isOptionChoiceCompatibleWithSelection(
                        syntheticProduct,
                        option.name,
                        choice.value,
                        selectedChoices
                      );
                      const disabled = !hasAnyStock || !choice.visible;

                      return (
                        <button
                          key={choice.value}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          disabled={disabled}
                          onClick={() => handleSelectOption(option.name, choice.value)}
                          className={`min-w-[48px] h-11 px-4 rounded-xl text-xs font-medium transition-all ${
                            disabled
                              ? 'border border-[var(--border-hairline)] text-[var(--text-muted)] opacity-35 line-through cursor-not-allowed'
                              : isSelected
                                ? 'border border-[var(--accent-uv)] bg-[var(--accent-uv-glow)] text-[var(--text-primary)] shadow-[0_0_16px_var(--accent-uv-glow)]'
                                : !isCompatibleNow
                                  ? 'border border-dashed border-[var(--border-hairline)] text-[var(--text-muted)] opacity-70 hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                                  : 'border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {choice.description || choice.value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Quantidade + CTAs */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="inline-flex items-center justify-between rounded-full border border-[var(--border-hairline)] bg-[var(--bg-canvas)]/55 px-2 h-12 sm:w-32">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    aria-label="Diminuir quantidade"
                    className="w-8 h-8 inline-flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-40 transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                  <span className="text-sm font-medium tabular-nums text-[var(--text-primary)]">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((q) => (maxStock ? Math.min(maxStock, q + 1) : q + 1))
                    }
                    disabled={Boolean(maxStock && quantity >= maxStock) || !canPurchase}
                    aria-label="Aumentar quantidade"
                    className="w-8 h-8 inline-flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-40 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>

                <UltravioletButton
                  onClick={handleAddToCart}
                  disabled={!canPurchase}
                  variant="primary"
                  size="lg"
                  className="flex-1"
                >
                  {addedFeedback ? (
                    <span className="inline-flex items-center gap-2">
                      <Check className="w-4 h-4" aria-hidden="true" />
                      Adicionado ao carrinho
                    </span>
                  ) : !canPurchase ? (
                    'INDISPONÍVEL'
                  ) : (
                    'ADICIONAR AO CARRINHO'
                  )}
                </UltravioletButton>
              </div>

              <UltravioletButton
                href={whatsappBuyHref}
                target="_blank"
                rel="noopener noreferrer"
                variant="secondary"
                size="md"
                icon={<MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />}
                className="w-full"
              >
                Comprar pelo WhatsApp
              </UltravioletButton>
            </div>

            {/* Informações Adicionais */}
            <div className="pt-4 border-t border-[var(--border-hairline)] space-y-2.5">
              {[
                { title: 'Detalhes da peça', body: product.shortDescription },
                { title: 'Composição e cuidados', body: `${product.composition} ${product.careInstructions}` },
                {
                  title: 'Envio e atendimento',
                  body: 'Envios para todo o Brasil. Em caso de dúvida sobre modelagem, medidas ou disponibilidade, fale diretamente com nossa equipe pelo WhatsApp.',
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
