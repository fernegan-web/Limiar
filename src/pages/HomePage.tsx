import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Compass, Infinity as InfinityIcon, Leaf, RefreshCw, ShieldCheck, Truck } from 'lucide-react';
import { AuthorialBanner } from '../components/commerce/AuthorialBanner';
import { CatalogExplorer } from '../components/commerce/CatalogExplorer';
import { ProductCarousel } from '../components/commerce/ProductCarousel';
import { HeroTraversalStage } from '../components/hero/HeroTraversalStage';
import { Footer } from '../components/layout/Footer';
import { SobreLimiarSection } from '../components/sobre/SobreLimiarSection';
import {
  CybersigilismCorner,
  CybersigilismDivider,
  CybersigilismWeb,
  EclipseSigil,
  LimiarStar,
} from '../components/ornaments/CybersigilismOrnaments';
import { CinematicScrollReveal } from '../components/ui/CinematicScrollReveal';
import { ResilientImage } from '../components/ui/ResilientImage';
import { UltravioletButton } from '../components/ui/UltravioletButton';
import { useFavorites } from '../context/FavoritesContext';
import { usePersonalization } from '../context/PersonalizationContext';
import { useRouter } from '../context/RouterContext';
import { AUTHORIAL_BANNERS } from '../data/authorialBanners';
import { DEMO_IMAGES } from '../data/demoCatalog';
import { scrollToWithPhysics } from '../motion/scrollPhysics';
import { ThresholdScrollParallax } from '../motion/ThresholdPrimitives';
import {
  fetchCatalogSnapshot,
  filterAndSortProducts,
  invalidateCatalogCache,
} from '../services/catalogService';
import type { Category, Collection, Product } from '../types/commerce';
import { validateEmail } from '../utils/validation';

interface HeroSlide {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  image: string;
  imageAlt: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'slide-travessia',
    eyebrow: 'LIMIAR — UNDERGROUND APPAREL',
    title: 'ATRAVESSE O LIMIAR.',
    description: 'Algumas coisas só podem ser compreendidas depois da travessia.',
    ctaLabel: 'EXPLORAR COLEÇÃO',
    ctaHref: '/loja',
    image: '/assets/hero-model.png',
    imageAlt:
      'Modelo oficial Limiar com dreadlocks, piercings, tatuagens e camiseta oversized preta estampada com a logo oficial',
  },
];

export function HomePage() {
  const { navigate } = useRouter();
  const { favoriteIds } = useFavorites();
  const { getRecommendations } = usePersonalization();

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [activeSlideIndex] = useState(0);
  const [freeNavUnlocked, setFreeNavUnlocked] = useState(false);

  // Newsletter state
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterError, setNewsletterError] = useState<string | null>(null);
  const [newsletterNotice, setNewsletterNotice] = useState<string | null>(null);

  const loadHomeCatalog = useCallback(async (forceRefresh = false) => {
    setCatalogLoading(true);
    setCatalogError(null);
    if (forceRefresh) {
      invalidateCatalogCache();
    }
    try {
      const snapshot = await fetchCatalogSnapshot();
      setAllProducts(snapshot.products);
      setCategories(snapshot.categories);
      setCollections(snapshot.collections);
    } catch {
      setCatalogError('Não foi possível carregar o catálogo oficial no momento.');
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHomeCatalog();
  }, [loadHomeCatalog]);

  const offerProducts = useMemo(
    () =>
      filterAndSortProducts(allProducts, {
        onlyOffers: true,
        inStockOnly: true,
        sort: 'discount-desc',
      }).slice(0, 10),
    [allProducts]
  );

  const recommendationResult = useMemo(() => {
    if (allProducts.length === 0) {
      return { items: [], isPersonalized: false, recentlyViewed: [] };
    }
    const leadOfferIds = offerProducts.slice(0, 6).map((p) => p.id);
    const primary = getRecommendations(allProducts, {
      favoriteIds,
      excludeIds: leadOfferIds,
      limit: 10,
    });
    if (primary.items.length >= 3) {
      return primary;
    }
    return getRecommendations(allProducts, {
      favoriteIds,
      limit: 10,
    });
  }, [allProducts, favoriteIds, getRecommendations, offerProducts]);

  const freeShippingProducts = useMemo(
    () =>
      filterAndSortProducts(allProducts, {
        freeShippingOnly: true,
        inStockOnly: true,
        sort: 'featured',
      }).slice(0, 10),
    [allProducts]
  );

  const currentSlide = HERO_SLIDES[activeSlideIndex];

  const handleScrollToAllProducts = useCallback(() => {
    const target = document.getElementById('todos-os-produtos');
    if (!target) return;
    scrollToWithPhysics(target, { duration: 1.15, offset: -88 });
  }, []);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNewsletterNotice(null);
    const check = validateEmail(newsletterEmail);
    if (!check.valid) {
      setNewsletterError(check.error ?? 'E-mail inválido.');
      return;
    }
    setNewsletterError(null);
    setNewsletterNotice(
      'Lista de lançamentos em preparação. Acompanhe novidades pelo Instagram @limiar.ritual ou WhatsApp.'
    );
  };

  const postCollectionsContent = (
    <>
      {/* 1. Divisor Neotribal Sutil entre Coleções e Área Comercial */}
      <CinematicScrollReveal
        startY={22}
        startScale={0.97}
        startBlur={6}
        className="mx-auto max-w-[1440px] px-4 sm:px-8 pt-6"
      >
        <CybersigilismDivider className="w-full max-w-2xl mx-auto opacity-75" />
      </CinematicScrollReveal>

      {/* 2. CARROSSÉIS ESTRATÉGICOS (mínimo de 3 itens elegíveis cada; sem poluição) */}
      {!catalogLoading && !catalogError && (
        <>
          <ProductCarousel
            id="carrossel-ofertas"
            title="Ofertas"
            subtitle="Peças com desconto ativo no catálogo oficial"
            products={offerProducts}
            ctaLabel="Ver ofertas"
            ctaHref="/loja?ofertas=1&sort=discount-desc"
          />

          <ProductCarousel
            id="carrossel-recomendados"
            title="Recomendados para você"
            subtitle={
              recommendationResult.isPersonalized
                ? 'Selecionados conforme sua navegação e peças salvas'
                : 'Destaques e lançamentos em evidência na travessia'
            }
            products={recommendationResult.items}
            ctaLabel="Explorar loja"
            ctaHref="/loja"
          />

          <ProductCarousel
            id="carrossel-frete-gratis"
            title="Frete grátis"
            subtitle="Peças elegíveis com benefício de entrega gratuita na Wix"
            products={freeShippingProducts}
            ctaLabel="Ver elegíveis"
            ctaHref="/loja?fretegratis=1"
          />
        </>
      )}

      {/* 3. BANNERS AUTORAIS (exibidos somente quando houver artes configuradas) */}
      {AUTHORIAL_BANNERS.map((banner) => (
        <AuthorialBanner key={banner.id} banner={banner} />
      ))}

      {/* 4. CATÁLOGO PRINCIPAL UNIFICADO — BUSCA, FILTROS REAIS E GRADE 4-5 COLUNAS / 2 MOBILE */}
      <CatalogExplorer
        id="todos-os-produtos"
        heading="TODOS OS PRODUTOS"
        ctaLink={{ label: 'VER TODAS NA LOJA', href: '/loja' }}
        allProducts={allProducts}
        categories={categories}
        collections={collections}
        loading={catalogLoading}
        error={catalogError}
        onRetry={() => loadHomeCatalog(true)}
        pageSize={15}
      />

      {/* 5. NAVEGAÇÃO RÁPIDA POR CATEGORIAS */}
      <section className="relative mx-auto max-w-[1440px] px-4 sm:px-8 py-6">
        <CinematicScrollReveal startY={34} startScale={0.95} startBlur={8}>
          <div className="glass-surface rounded-[22px] p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-center gap-3">
              <EclipseSigil className="w-5 h-5 text-[var(--text-secondary)] shrink-0" />
              <div>
                <span className="block text-[11px] uppercase tracking-[0.2em] text-[var(--text-primary)] font-medium">
                  Navegue por categorias
                </span>
                <span className="block text-xs text-[var(--text-muted)]">
                  Explore por silhueta e categoria
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              {categories.map((cat) => (
                <a
                  key={cat.id}
                  href={`/loja?categoria=${cat.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/loja?categoria=${cat.id}`);
                  }}
                  className="group glass-card px-4 py-2.5 rounded-full inline-flex items-center gap-2.5 text-xs uppercase tracking-[0.14em] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-uv-edge)] whitespace-nowrap shrink-0"
                >
                  <span>{cat.name}</span>
                  <span className="text-[10px] text-[var(--text-muted)] tabular-nums">
                    {cat.productCount}
                  </span>
                  <ArrowRight
                    className="w-3 h-3 text-[var(--text-muted)] group-hover:text-[var(--accent-uv)] group-hover:translate-x-0.5 transition-all"
                    aria-hidden="true"
                  />
                </a>
              ))}
            </div>
          </div>
        </CinematicScrollReveal>
      </section>

      {/* 6. BANNER INSTITUCIONAL */}
      <section className="relative mx-auto max-w-[1440px] px-4 sm:px-8 py-10 sm:py-12">
        <CinematicScrollReveal startY={38} startScale={0.94} startBlur={10}>
          <div className="relative overflow-hidden rounded-[28px] glass-card min-h-[360px] sm:min-h-[400px] flex items-center">
            <ThresholdScrollParallax offsetY={20} scaleRange={[1.07, 1.01]} className="absolute inset-0">
              <ResilientImage
                src={DEMO_IMAGES.bannerEclipse}
                alt="Eclipse sobre atmosfera underground Limiar"
                sizes="(max-width: 1024px) 100vw, 1440px"
                loading="lazy"
                className="w-full h-full object-cover object-[65%_22%] opacity-78 dark:opacity-85"
              />
            </ThresholdScrollParallax>
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-r from-[var(--bg-elevated)] via-[var(--bg-elevated)]/88 to-[var(--bg-elevated)]/22 dark:from-[#080909] dark:via-[#080909]/84 dark:to-transparent"
            />

            <CybersigilismWeb
              tone="uv"
              className="hidden sm:block absolute -right-10 -bottom-12 w-72 h-72 opacity-65"
            />
            <CybersigilismCorner className="hidden sm:block absolute top-4 right-4 w-12 h-12 opacity-60" />

            <div className="relative z-10 max-w-xl p-7 sm:p-12 space-y-5">
              <LimiarStar className="w-6 h-6 text-[var(--text-secondary)]" />
              <h2 className="font-display font-light text-3xl sm:text-4xl lg:text-[42px] leading-[1.08] tracking-[0.03em] uppercase text-[var(--text-primary)] text-balance">
                VISTA-SE SEM MODERAÇÃO.
              </h2>
              <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed max-w-md">
                Entre o que você acredita ser e aquilo que ainda não descobriu sobre si mesmo.
              </p>
              <div className="pt-2">
                <UltravioletButton href="/sobre" variant="secondary" size="md">
                  SOBRE LIMIAR
                </UltravioletButton>
              </div>
            </div>
          </div>
        </CinematicScrollReveal>
      </section>

      {/* 7. BENEFÍCIOS DA LOJA */}
      <section className="relative mx-auto max-w-[1440px] px-4 sm:px-8 py-8">
        <CinematicScrollReveal startY={32} startScale={0.96} startBlur={8}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 py-8 border-y border-[var(--border-hairline)]">
            {[
              { icon: Truck, label: 'Envio para todo o Brasil' },
              { icon: ShieldCheck, label: 'Compra segura' },
              { icon: RefreshCw, label: 'Troca facilitada' },
              { icon: Leaf, label: 'Produção consciente' },
              { icon: InfinityIcon, label: 'Cultura independente' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex flex-col items-center text-center gap-3 px-2"
                >
                  <Icon
                    className="w-5 h-5 text-[var(--text-secondary)] stroke-[1.35]"
                    aria-hidden="true"
                  />
                  <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)] leading-relaxed">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </CinematicScrollReveal>
      </section>

      {/* 8. NEWSLETTER */}
      <section className="relative mx-auto max-w-[1440px] px-4 sm:px-8 py-10">
        <CinematicScrollReveal
          startY={34}
          startScale={0.95}
          startBlur={8}
          scrollOffset={['start 96%', 'end 90%']}
        >
          <div className="relative overflow-hidden rounded-[28px] glass-surface-strong p-6 sm:p-10">
            <CybersigilismWeb
              tone="uv"
              className="pointer-events-none absolute -left-16 -top-16 w-64 h-64 opacity-45"
            />
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-start sm:items-center gap-4">
                <LimiarStar className="w-6 h-6 text-[var(--text-secondary)] shrink-0" />
                <div className="space-y-1">
                  <h2 className="font-display text-sm sm:text-base uppercase tracking-[0.18em] font-medium text-[var(--text-primary)]">
                    FAÇA PARTE DO LIMIAR
                  </h2>
                  <p className="text-xs sm:text-sm text-[var(--text-muted)]">
                    Receba novidades, lançamentos e eventos.
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleNewsletterSubmit}
                noValidate
                className="w-full lg:w-auto lg:min-w-[440px]"
              >
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 p-1.5 rounded-2xl sm:rounded-full border border-[var(--border-hairline)] bg-[var(--bg-canvas)]/65 focus-within:border-[var(--accent-uv-edge)] transition-colors">
                  <label htmlFor="newsletter-email" className="sr-only">
                    Seu e-mail
                  </label>
                  <input
                    id="newsletter-email"
                    type="email"
                    value={newsletterEmail}
                    onChange={(e) => {
                      setNewsletterEmail(e.target.value);
                      if (newsletterError) setNewsletterError(null);
                    }}
                    placeholder="Seu e-mail"
                    aria-invalid={Boolean(newsletterError)}
                    className="flex-1 bg-transparent px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
                  />
                  <UltravioletButton
                    type="submit"
                    variant="secondary"
                    size="sm"
                    className="justify-center sm:justify-between"
                  >
                    INSCREVER-SE
                  </UltravioletButton>
                </div>

                {newsletterError && (
                  <p role="alert" className="mt-2.5 px-3 text-xs text-[var(--accent-terracotta)]">
                    {newsletterError}
                  </p>
                )}
                {newsletterNotice && (
                  <p className="mt-2.5 px-3 text-xs text-[var(--accent-uv)] flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{newsletterNotice}</span>
                  </p>
                )}
              </form>
            </div>
          </div>
        </CinematicScrollReveal>
      </section>
    </>
  );

  return (
    <div className="relative overflow-x-clip">
      <HeroTraversalStage
        slide={currentSlide}
        activeSlideIndex={activeSlideIndex}
        totalSlides={HERO_SLIDES.length}
        collections={collections}
        onViewAllProducts={handleScrollToAllProducts}
        onFreeNavigationChange={setFreeNavUnlocked}
        postCollectionsContent={postCollectionsContent}
      />

      <div className={freeNavUnlocked ? 'block' : 'hidden'}>
        <SobreLimiarSection />

        <CinematicScrollReveal
          startY={28}
          startScale={0.97}
          startBlur={6}
          scrollOffset={['start 98%', 'end 99%']}
        >
          <Footer embeddedInReveal />
        </CinematicScrollReveal>
      </div>
    </div>
  );
}
