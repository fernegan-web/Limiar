import type { Category, Collection, Product } from '../types/commerce';

/**
 * REPOSITÓRIO DEMONSTRATIVO ISOLADO
 * ---------------------------------------------------------------------------
 * Estes dados servem exclusivamente para validar a interface e os fluxos
 * visuais enquanto a conexão oficial com a loja Wix (Catalog V3 / Cart V2)
 * ainda não foi ativada. Nenhuma peça, preço ou estoque aqui representa
 * oferta comercial definitiva.
 */

export const DEMO_IMAGES = {
  heroModel: '/src/assets/images/hero_model_limiar_1795475558113.jpg',
  bannerEclipse: '/src/assets/images/banner_singularity_eclipse_1795475559021.jpg',
  tribalTee: '/src/assets/images/product_tribal_tee_1795475558848.jpg',
  voidHoodie: '/src/assets/images/product_void_hoodie_1795475558966.jpg',
  frequencyTee: '/src/assets/images/product_frequency_tee_1795475558648.jpg',
  ritualCargo: '/src/assets/images/product_ritual_cargo_1795475559881.jpg',
} as const;

export const DEMO_CATEGORIES: Category[] = [
  {
    id: 'cat-camisetas',
    slug: 'camisetas',
    name: 'Camisetas',
    description: 'Modelagem boxy oversized em algodão pesado.',
    productCount: 2,
    isDemoData: true,
  },
  {
    id: 'cat-moletons',
    slug: 'moletons',
    name: 'Moletons',
    description: 'Peças estruturadas de gramatura elevada.',
    productCount: 1,
    isDemoData: true,
  },
  {
    id: 'cat-calcas',
    slug: 'calcas',
    name: 'Calças & Cargo',
    description: 'Cortes amplos utilitários e costuras reforçadas.',
    productCount: 1,
    isDemoData: true,
  },
];

export const DEMO_COLLECTIONS: Collection[] = [
  {
    id: 'col-travessia',
    slug: 'travessia',
    name: 'Travessia',
    subtitle: 'Edição 01',
    description:
      'Silhuetas amplas, grafismo neotribal contido e contrastes monocromáticos.',
    image: DEMO_IMAGES.bannerEclipse,
    accentTone: 'uv',
    isDemoData: true,
  },
  {
    id: 'col-singularidade',
    slug: 'singularidade',
    name: 'Singularidade',
    subtitle: 'Edição 02',
    description:
      'Peças concebidas como camada de expressão entre a atmosfera da pista e o cotidiano urbano.',
    image: DEMO_IMAGES.voidHoodie,
    accentTone: 'acid',
    isDemoData: true,
  },
];

export const DEMO_PRODUCTS: Product[] = [
  {
    id: 'demo-tribal-tee',
    slug: 'tribal-tee',
    name: 'Tribal Tee',
    price: 129.9,
    currency: 'BRL',
    formattedPrice: 'R$ 129,90',
    categoryId: 'cat-camisetas',
    categoryName: 'Camisetas',
    collectionSlug: 'travessia',
    collectionName: 'Travessia',
    shortDescription: 'Camiseta oversized em algodão pesado com grafismo orgânico em serigrafia.',
    description:
      'Modelagem ampla com ombros deslocados, gola canelada estruturada e aplicação gráfica de linguagem cybersigilism em contraste prateado suave.',
    composition: '100% Algodão penteado 260g/m².',
    careInstructions: 'Lavar do avesso com água fria. Não passar ferro diretamente sobre a estampa.',
    accentTone: 'acid',
    images: [DEMO_IMAGES.tribalTee, DEMO_IMAGES.heroModel],
    variants: [
      { id: 'tt-p', size: 'P', colorName: 'Preto Estonado', colorHex: '#17191A', inStock: true, stockCount: 4, sku: 'LM-TT-P' },
      { id: 'tt-m', size: 'M', colorName: 'Preto Estonado', colorHex: '#17191A', inStock: true, stockCount: 8, sku: 'LM-TT-M' },
      { id: 'tt-g', size: 'G', colorName: 'Preto Estonado', colorHex: '#17191A', inStock: true, stockCount: 6, sku: 'LM-TT-G' },
      { id: 'tt-gg', size: 'GG', colorName: 'Preto Estonado', colorHex: '#17191A', inStock: true, stockCount: 3, sku: 'LM-TT-GG' },
    ],
    featured: true,
    isDemoData: true,
  },
  {
    id: 'demo-void-hoodie',
    slug: 'void-hoodie',
    name: 'Void Hoodie',
    price: 249.9,
    currency: 'BRL',
    formattedPrice: 'R$ 249,90',
    categoryId: 'cat-moletons',
    categoryName: 'Moletons',
    collectionSlug: 'singularidade',
    collectionName: 'Singularidade',
    shortDescription: 'Moletom oversized estruturado com bordado neotribal frontal.',
    description:
      'Capuz duplo estruturado sem ponteiras metálicas aparentes, bolso embutido nas costuras laterais e bordado simétrico em tom prata fosco.',
    composition: 'Moletom peluciado 380g/m², 85% algodão e 15% poliéster.',
    careInstructions: 'Secagem à sombra em superfície plana. Não utilizar alvejantes.',
    accentTone: 'uv',
    images: [DEMO_IMAGES.voidHoodie, DEMO_IMAGES.bannerEclipse],
    variants: [
      { id: 'vh-p', size: 'P', colorName: 'Preto Profundo', colorHex: '#080909', inStock: true, stockCount: 2, sku: 'LM-VH-P' },
      { id: 'vh-m', size: 'M', colorName: 'Preto Profundo', colorHex: '#080909', inStock: true, stockCount: 5, sku: 'LM-VH-M' },
      { id: 'vh-g', size: 'G', colorName: 'Preto Profundo', colorHex: '#080909', inStock: true, stockCount: 5, sku: 'LM-VH-G' },
      { id: 'vh-gg', size: 'GG', colorName: 'Preto Profundo', colorHex: '#080909', inStock: false, stockCount: 0, sku: 'LM-VH-GG' },
    ],
    featured: true,
    isDemoData: true,
  },
  {
    id: 'demo-frequency-tee',
    slug: 'frequency-tee',
    name: 'Frequency Tee',
    price: 129.9,
    currency: 'BRL',
    formattedPrice: 'R$ 129,90',
    categoryId: 'cat-camisetas',
    categoryName: 'Camisetas',
    collectionSlug: 'travessia',
    collectionName: 'Travessia',
    shortDescription: 'Camiseta off-white mineral com estampa radial orgânica.',
    description:
      'Algodão lavado em tom off-white mineral com estampa radial orgânica em grafite escuro, equilibrando leveza e presença visual.',
    composition: '100% Algodão 240g/m² pré-encolhido.',
    careInstructions: 'Lavar separadamente das peças escuras em ciclo delicado.',
    accentTone: 'terracotta',
    images: [DEMO_IMAGES.frequencyTee, DEMO_IMAGES.tribalTee],
    variants: [
      { id: 'ft-p', size: 'P', colorName: 'Off-White Mineral', colorHex: '#C9C7BF', inStock: true, stockCount: 7, sku: 'LM-FT-P' },
      { id: 'ft-m', size: 'M', colorName: 'Off-White Mineral', colorHex: '#C9C7BF', inStock: true, stockCount: 9, sku: 'LM-FT-M' },
      { id: 'ft-g', size: 'G', colorName: 'Off-White Mineral', colorHex: '#C9C7BF', inStock: true, stockCount: 4, sku: 'LM-FT-G' },
      { id: 'ft-xg', size: 'XG', colorName: 'Off-White Mineral', colorHex: '#C9C7BF', inStock: true, stockCount: 2, sku: 'LM-FT-XG' },
    ],
    featured: true,
    isDemoData: true,
  },
  {
    id: 'demo-ritual-cargo',
    slug: 'ritual-cargo',
    name: 'Ritual Cargo',
    price: 299.9,
    currency: 'BRL',
    formattedPrice: 'R$ 299,90',
    categoryId: 'cat-calcas',
    categoryName: 'Calças & Cargo',
    collectionSlug: 'singularidade',
    collectionName: 'Singularidade',
    shortDescription: 'Calça cargo wide-leg com pesponto contrastante.',
    description:
      'Alfaiataria utilitária underground com modelagem reta ampla, bolsos cargo foleados com fecho discreto e pespontos em fio prata mineral.',
    composition: 'Sarja encorpada 100% algodão com acabamento hidro-repelente.',
    careInstructions: 'Lavar com zíperes e fechos fechados. Não usar secadora.',
    accentTone: 'mineral',
    images: [DEMO_IMAGES.ritualCargo, DEMO_IMAGES.bannerEclipse],
    variants: [
      { id: 'rc-p', size: 'P', colorName: 'Chumbo Escuro', colorHex: '#17191A', inStock: true, stockCount: 3, sku: 'LM-RC-P' },
      { id: 'rc-m', size: 'M', colorName: 'Chumbo Escuro', colorHex: '#17191A', inStock: true, stockCount: 6, sku: 'LM-RC-M' },
      { id: 'rc-g', size: 'G', colorName: 'Chumbo Escuro', colorHex: '#17191A', inStock: true, stockCount: 4, sku: 'LM-RC-G' },
      { id: 'rc-gg', size: 'GG', colorName: 'Chumbo Escuro', colorHex: '#17191A', inStock: true, stockCount: 2, sku: 'LM-RC-GG' },
    ],
    featured: true,
    isDemoData: true,
  },
];
