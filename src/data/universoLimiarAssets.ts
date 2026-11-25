/**
 * REGISTRO CENTRALIZADO DE ASSETS — UNIVERSO LIMIAR
 * ---------------------------------------------------------------------------
 * Todos os ativos fotográficos, recortes com transparência, cenas culturais,
 * detalhes têxteis e grafismos usados no capítulo "Universo Limiar" ficam
 * reunidos neste arquivo para substituição direta pelos assets definitivos.
 *
 * Observação editorial: as imagens abaixo atuam como base visual temporária
 * para coreografia e enquadramento; nenhuma é apresentada como registro
 * documental definitivo de eventos reais.
 */

export interface UniversoAssetEntry {
  id: string;
  src: string;
  alt: string;
  aspectRatio: string;
  objectPosition?: string;
  transparent?: boolean;
  isTemporaryPlaceholder: boolean;
}

export const UNIVERSO_ASSETS = {
  editorial: {
    identityPortrait: {
      id: 'universo-editorial-portrait',
      src: '/src/assets/images/universo_editorial_portrait_1795614254409.jpg',
      alt: 'Retrato editorial em concreto bruto com silhueta oversized escura',
      aspectRatio: '3 / 4',
      objectPosition: '50% 24%',
      isTemporaryPlaceholder: true,
    },
    monolithHero: {
      id: 'universo-editorial-monolith',
      src: '/src/assets/images/hero_model_limiar_1795475558113.jpg',
      alt: 'Composição editorial com estampa Limiar em contraste monocromático',
      aspectRatio: '4 / 5',
      objectPosition: '50% 20%',
      isTemporaryPlaceholder: false,
    },
    eclipseHorizon: {
      id: 'universo-editorial-eclipse',
      src: '/src/assets/images/banner_singularity_eclipse_1795475559021.jpg',
      alt: 'Atmosfera editorial com iluminação difusa e silhueta escura',
      aspectRatio: '16 / 9',
      objectPosition: '62% 28%',
      isTemporaryPlaceholder: true,
    },
  },

  modelCutouts: {
    officialModel: {
      id: 'universo-cutout-official-model',
      src: '/assets/hero-model-1080.webp',
      alt: 'Recorte da modelo oficial Limiar com camiseta oversized estampada',
      aspectRatio: '1312 / 1199',
      objectPosition: '50% 18%',
      transparent: true,
      isTemporaryPlaceholder: false,
    },
  },

  cultural: {
    darkpsyStage: {
      id: 'universo-culture-darkpsy',
      src: '/src/assets/images/universo_darkpsy_stage_1795614255847.jpg',
      alt: 'Pista noturna sob estrutura brutalista e névoa com feixes ultravioleta e verde sálvia',
      aspectRatio: '16 / 9',
      objectPosition: '50% 45%',
      isTemporaryPlaceholder: true,
    },
    skateUrban: {
      id: 'universo-culture-skate',
      src: '/src/assets/images/universo_skate_urban_1795614256314.jpg',
      alt: 'Skatista em concreto urbano brutalista ao entardecer',
      aspectRatio: '4 / 3',
      objectPosition: '50% 35%',
      isTemporaryPlaceholder: true,
    },
  },

  textileDetails: {
    fabricMacro: {
      id: 'universo-textile-macro',
      src: '/src/assets/images/universo_fabric_macro_1795614256236.jpg',
      alt: 'Detalhe macro de algodão pesado 260g/m² com costura dupla e serigrafia orgânica',
      aspectRatio: '4 / 3',
      objectPosition: '50% 50%',
      isTemporaryPlaceholder: true,
    },
    tribalPrint: {
      id: 'universo-textile-tribal',
      src: '/src/assets/images/product_tribal_tee_1795475558848.jpg',
      alt: 'Detalhe de estampa cybersigilism aplicada em malha preta',
      aspectRatio: '4 / 5',
      objectPosition: '50% 35%',
      isTemporaryPlaceholder: true,
    },
    voidStitch: {
      id: 'universo-textile-hoodie',
      src: '/src/assets/images/product_void_hoodie_1795475558966.jpg',
      alt: 'Moletom pesado estruturado com bordado simétrico discreto',
      aspectRatio: '4 / 5',
      objectPosition: '50% 30%',
      isTemporaryPlaceholder: true,
    },
    frequencyPrint: {
      id: 'universo-textile-frequency',
      src: '/src/assets/images/product_frequency_tee_1795475558648.jpg',
      alt: 'Camiseta off-white mineral com grafismo radial',
      aspectRatio: '4 / 5',
      objectPosition: '50% 30%',
      isTemporaryPlaceholder: true,
    },
    cargoUtility: {
      id: 'universo-textile-cargo',
      src: '/src/assets/images/product_ritual_cargo_1795475559881.jpg',
      alt: 'Sarja estruturada com pesponto mineral contrastante',
      aspectRatio: '4 / 5',
      objectPosition: '50% 42%',
      isTemporaryPlaceholder: true,
    },
  },

  graphics: {
    cybersigilismOverlay: {
      id: 'universo-graphic-cybersigilism',
      src: '/assets/hero-cybersigilism.webp',
      alt: 'Grafismo neotribal cybersigilism Limiar',
      aspectRatio: '1 / 1',
      transparent: true,
      isTemporaryPlaceholder: false,
    },
  },
} as const satisfies Record<string, Record<string, UniversoAssetEntry>>;
