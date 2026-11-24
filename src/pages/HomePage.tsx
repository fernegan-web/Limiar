import React, { useEffect, useState } from 'react';
import { ArrowRight, Compass, Infinity as InfinityIcon, Leaf, RefreshCw, ShieldCheck, Truck } from 'lucide-react';
import { ProductCard } from '../components/commerce/ProductCard';
import { HeroThresholdComposition } from '../components/hero/HeroThresholdComposition';
import {
  CybersigilismCorner,
  CybersigilismDivider,
  CybersigilismWeb,
  EclipseSigil,
  LimiarStar,
} from '../components/ornaments/CybersigilismOrnaments';
import { ResilientImage } from '../components/ui/ResilientImage';
import { Reveal } from '../components/ui/Reveal';
import { UltravioletButton } from '../components/ui/UltravioletButton';
import { useRouter } from '../context/RouterContext';
import {
  ThresholdMagnetic,
  ThresholdScrollParallax,
} from '../motion/ThresholdPrimitives';
import { DEMO_IMAGES } from '../data/demoCatalog';
import { fetchCategories, fetchFeaturedProducts } from '../services/catalogService';
import type { Category, Product } from '../types/commerce';
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
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeSlideIndex] = useState(0);

  // Newsletter state
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterError, setNewsletterError] = useState<string | null>(null);
  const [newsletterNotice, setNewsletterNotice] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([fetchFeaturedProducts(), fetchCategories()]).then(([products, cats]) => {
      if (!mounted) return;
      setFeaturedProducts(products);
      setCategories(cats);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const currentSlide = HERO_SLIDES[activeSlideIndex];

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
      'E-mail validado. O cadastro definitivo será ativado após a integração oficial com o Wix.'
    );
  };

  return (
    <div className="relative overflow-hidden">
      {/* ================================================================
          SEÇÃO 1: HERO EDITORIAL
          ================================================================ */}
      <section className="relative mx-auto max-w-[1360px] px-4 sm:px-8 pt-6 pb-16 sm:pt-10 sm:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-10 lg:gap-6">
          {/* Coluna Esquerda: Texto & CTA */}
          <div className="lg:col-span-6 xl:col-span-6 relative z-30 space-y-6 sm:space-y-8">
            <p
              className="limiar-enter text-[11px] sm:text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]"
              style={{ animationDelay: '0ms' }}
            >
              {currentSlide.eyebrow}
            </p>

            <div
              className="limiar-enter flex items-start gap-4"
              style={{ animationDelay: '45ms' }}
            >
              <h1 className="font-display font-light text-4xl sm:text-6xl xl:text-[64px] leading-[1.03] tracking-[0.03em] text-[var(--text-primary)] uppercase text-balance max-w-xl">
                {currentSlide.title}
              </h1>
              <LimiarStar className="w-7 h-7 sm:w-9 sm:h-9 text-[var(--text-secondary)] shrink-0 mt-2 opacity-80" />
            </div>

            <p
              className="limiar-enter text-base sm:text-lg text-[var(--text-secondary)] max-w-md leading-relaxed"
              style={{ animationDelay: '90ms' }}
            >
              {currentSlide.description}
            </p>

            <div
              className="limiar-enter pt-1"
              style={{ animationDelay: '135ms' }}
            >
              <ThresholdMagnetic maxPull={4}>
                <UltravioletButton href={currentSlide.ctaHref} size="lg">
                  {currentSlide.ctaLabel}
                </UltravioletButton>
              </ThresholdMagnetic>
            </div>

            {/* Indicador preparado para futuros slides */}
            <div
              className="limiar-enter pt-6 flex items-center gap-4 text-[11px] tracking-[0.2em] text-[var(--text-muted)] tabular-nums"
              style={{ animationDelay: '180ms' }}
            >
              <span>0{activeSlideIndex + 1}</span>
              <span className="w-16 h-[1px] bg-[var(--border-strong)] relative overflow-hidden">
                <span className="absolute inset-y-0 left-0 w-full bg-[var(--text-primary)] opacity-75" />
              </span>
              <span>0{HERO_SLIDES.length}</span>
            </div>
          </div>

          {/* Coluna Direita: Composição Tridimensional Oficial (Buraco Negro + Cybersigilism + Modelo) */}
          <div className="lg:col-span-6 xl:col-span-6 relative flex items-end justify-center xl:pr-10">
            <HeroThresholdComposition modelAlt={currentSlide.imageAlt} />

            {/* Rail lateral discreto */}
            <div
              aria-hidden="true"
              className="hidden xl:flex flex-col items-center gap-3 absolute right-0 top-1/2 -translate-y-1/2 z-30 text-[var(--text-muted)]"
            >
              <span className="w-[1px] h-10 bg-[var(--border-hairline)]" />
              <EclipseSigil className="w-5 h-5 text-[var(--text-secondary)]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-primary)]" />
              <span className="w-1 h-1 rounded-full bg-[var(--border-strong)]" />
              <span className="w-[1px] h-10 bg-[var(--border-hairline)]" />
            </div>
          </div>
        </div>
      </section>

      {/* Divisor Neotribal Sutil entre Hero e Destaque */}
      <div className="mx-auto max-w-[1360px] px-4 sm:px-8">
        <CybersigilismDivider className="w-full max-w-2xl mx-auto opacity-75" />
      </div>

      {/* ================================================================
          SEÇÃO 2: COLEÇÕES EM DESTAQUE (PRODUTOS)
          ================================================================ */}
      <section className="relative mx-auto max-w-[1360px] px-4 sm:px-8 py-12 sm:py-16">
        <Reveal>
          <div className="flex items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <LimiarStar className="w-4 h-4 text-[var(--accent-uv)] shrink-0 opacity-80" />
              <h2 className="font-display text-xs sm:text-[13px] uppercase tracking-[0.22em] font-medium text-[var(--text-primary)] whitespace-nowrap">
                COLEÇÕES EM DESTAQUE
              </h2>
              <div className="hidden sm:block h-[1px] flex-1 bg-[var(--border-hairline)]" />
            </div>
            <a
              href="/loja"
              onClick={(e) => {
                e.preventDefault();
                navigate('/loja');
              }}
              className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] whitespace-nowrap shrink-0 transition-colors"
            >
              <span>VER TODAS</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {featuredProducts.map((product, index) => (
            <Reveal key={product.id} delayMs={index * 80}>
              <ProductCard product={product} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ================================================================
          SEÇÃO 3: CATEGORIAS (DEMONSTRATIVO)
          ================================================================ */}
      <section className="relative mx-auto max-w-[1360px] px-4 sm:px-8 py-8">
        <Reveal>
          <div className="glass-surface rounded-[22px] p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-center gap-3">
              <EclipseSigil className="w-5 h-5 text-[var(--text-secondary)] shrink-0" />
              <div>
                <span className="block text-[11px] uppercase tracking-[0.2em] text-[var(--text-primary)] font-medium">
                  Navegue por categorias
                </span>
                <span className="block text-xs text-[var(--text-muted)]">
                  Estrutura demonstrativa preparada para sincronização Wix
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
        </Reveal>
      </section>

      {/* ================================================================
          SEÇÃO 4: BANNER INSTITUCIONAL
          ================================================================ */}
      <section className="relative mx-auto max-w-[1360px] px-4 sm:px-8 py-10 sm:py-14">
        <Reveal>
          <div className="relative overflow-hidden rounded-[28px] glass-card min-h-[360px] sm:min-h-[400px] flex items-center">
            {/* Imagem atmosférica de fundo com parallax no scroll */}
            <ThresholdScrollParallax offsetY={20} scaleRange={[1.07, 1.01]} className="absolute inset-0">
              <ResilientImage
                src={DEMO_IMAGES.bannerEclipse}
                alt="Eclipse sobre atmosfera underground Limiar"
                className="w-full h-full object-cover object-[65%_22%] opacity-78 dark:opacity-85"
              />
            </ThresholdScrollParallax>
            {/* Scrim controlado para legibilidade garantida nos dois temas */}
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
        </Reveal>
      </section>

      {/* ================================================================
          SEÇÃO 5: PILARES INFORMATIVOS
          ================================================================ */}
      <section className="relative mx-auto max-w-[1360px] px-4 sm:px-8 py-8">
        <Reveal>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 py-8 border-y border-[var(--border-hairline)]">
            {[
              { icon: Truck, label: 'Envio para todo o Brasil' },
              { icon: ShieldCheck, label: 'Checkout oficial via Wix' },
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
        </Reveal>
      </section>

      {/* ================================================================
          SEÇÃO 6: NEWSLETTER
          ================================================================ */}
      <section className="relative mx-auto max-w-[1360px] px-4 sm:px-8 py-10">
        <Reveal>
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
                  <UltravioletButton type="submit" size="sm" className="justify-center sm:justify-between">
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
        </Reveal>
      </section>
    </div>
  );
}
