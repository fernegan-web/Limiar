/**
 * Biblioteca de copy e assets da seção institucional "Sobre a Limiar".
 * Todos os caminhos apontam exclusivamente para os arquivos originais em
 * public/assets/universo-limiar/ sem conversão ou modificação.
 */

function encodeAssetPath(path: string): string {
  return encodeURI(path);
}

export interface SobreImageAsset {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export const GRAFISMOS_ASSETS = {
  filigrana01: encodeAssetPath(
    '/assets/universo-limiar/10-grafismos/Filigrana Alienígena Biomecânica Prateada-1.png'
  ),
  filigrana02: encodeAssetPath(
    '/assets/universo-limiar/10-grafismos/Filigrana Espinhosa Abstrata-2.png'
  ),
  filigrana03: encodeAssetPath(
    '/assets/universo-limiar/10-grafismos/Fractal Tribal Espinhoso em Preto e Branco-3.png'
  ),
  filigrana04: encodeAssetPath(
    '/assets/universo-limiar/10-grafismos/Rede Orgânica de Espinhos Monocromáticos-4.png'
  ),
  filigrana05: encodeAssetPath(
    '/assets/universo-limiar/10-grafismos/Filigrana Tribal Biomecânica Abstrata-5.png'
  ),
} as const;

export const BLOCO_01_CONTENT = {
  eyebrow: 'SOBRE A LIMIAR',
  headline: 'Existe um outro lado.',
  paragraphs: [
    'Entre aquilo que somos e aquilo que ainda podemos ser, existe um espaço de transformação.',
    'Limiar nasce nesse espaço. Do encontro entre música, arte, moda e diferentes formas de existir.',
    'Mais do que vestir, expressar. Mais do que pertencer, atravessar.',
  ],
  image: {
    src: encodeAssetPath('/assets/universo-limiar/01-abertura/DARKWING.jpg'),
    alt: 'Colagem visual DARKWING com o logotipo oficial da Limiar ao centro',
    width: 1672,
    height: 941,
  } satisfies SobreImageAsset,
  grafismos: [
    GRAFISMOS_ASSETS.filigrana01,
    GRAFISMOS_ASSETS.filigrana03,
  ] as const,
} as const;

export const BLOCO_02_CONTENT = {
  eyebrow: 'NOSSAS RAÍZES',
  headline: 'Da pista às ruas.',
  paragraphs: [
    'Nascida em Foz do Iguaçu, no Paraná, Limiar tem suas raízes na cena underground e na cultura psicodélica.',
    'Antes de se manifestar através do vestuário, Limiar já existia como ritual: um espaço de encontro entre música, arte, liberdade e expressão coletiva.',
    'Do darkpsy à cultura urbana, carregamos referências que ultrapassam gêneros musicais, estilos e fronteiras.',
  ],
  mainImage: {
    src: encodeAssetPath(
      '/assets/universo-limiar/07-urbano/Skatista no ar entre grafites urbanos-4.png'
    ),
    alt: 'Skatista no ar em pista urbana cercada por muros grafitados',
    width: 1536,
    height: 1024,
  } satisfies SobreImageAsset,
  complementaryImages: [
    {
      src: encodeAssetPath(
        '/assets/universo-limiar/07-urbano/Batalha de Breakdance no Muro Grafitado-5.png'
      ),
      alt: 'Roda noturna de breakdance diante de muro grafitado',
      width: 1536,
      height: 1024,
    },
    {
      src: encodeAssetPath(
        '/assets/universo-limiar/07-urbano/Artista diante do rosto em grafite-6.png'
      ),
      alt: 'Artista urbano pintando mural em preto e branco com latas de spray',
      width: 1536,
      height: 1024,
    },
    {
      src: encodeAssetPath(
        '/assets/universo-limiar/08-ritual/Ritual Neon na Floresta-3.png'
      ),
      alt: 'Cena noturna de música eletrônica em meio à mata com iluminação atmosférica',
      width: 1536,
      height: 1024,
    },
  ] satisfies SobreImageAsset[],
  grafismos: [
    GRAFISMOS_ASSETS.filigrana02,
    GRAFISMOS_ASSETS.filigrana05,
  ] as const,
} as const;

export const BLOCO_03_CONTENT = {
  eyebrow: 'NOSSA VISÃO',
  headline: 'O exterior também é interior.',
  paragraphs: [
    'A maneira como nos vestimos carrega fragmentos de quem somos, do que sentimos e daquilo que nem sempre encontra palavras.',
    'Acreditamos na liberdade estética, na multiplicidade das identidades e na possibilidade de existir sem uma forma definitiva.',
    'Não existe uma única maneira de vestir Limiar. Assim como não existe uma única maneira de ser.',
  ],
  images: [
    {
      src: encodeAssetPath(
        '/assets/universo-limiar/04-editorial/Editorial Gótica em Concreto Brutalista-1.png'
      ),
      alt: 'Retrato editorial com camiseta oversized estonada em arquitetura brutalista de concreto',
      width: 1024,
      height: 1536,
    },
    {
      src: encodeAssetPath(
        '/assets/universo-limiar/04-editorial/Editorial urbano industrial com estilo streetwear-2.png'
      ),
      alt: 'Retrato editorial streetwear com camiseta off-white e calça cargo em cenário industrial',
      width: 1024,
      height: 1536,
    },
    {
      src: encodeAssetPath(
        '/assets/universo-limiar/04-editorial/Retrato Streetwear Gótico Industrial-4.png'
      ),
      alt: 'Retrato streetwear gótico industrial com bolsa tática e sobreposições texturizadas',
      width: 1024,
      height: 1536,
    },
    {
      src: encodeAssetPath(
        '/assets/universo-limiar/04-editorial/Moda Alternativa em Galpão Industrial-6.png'
      ),
      alt: 'Retrato de moda alternativa em galpão industrial com estandarte gráfico ao fundo',
      width: 1024,
      height: 1536,
    },
  ] satisfies SobreImageAsset[],
  grafismos: [
    GRAFISMOS_ASSETS.filigrana03,
    GRAFISMOS_ASSETS.filigrana01,
  ] as const,
} as const;

export const BLOCO_04_CONTENT = {
  eyebrow: 'LINGUAGEM VISUAL',
  headline: 'Frequências tornam-se formas.',
  paragraphs: [
    'Estruturas orgânicas, linhas assimétricas, texturas desgastadas e contrastes entre o natural e o industrial.',
    'Nossa estética nasce da experimentação. Do encontro entre o neotribal, o cybersigilism, o streetwear e as diferentes manifestações da cultura alternativa.',
    'São referências que atravessam a música, encontram forma na arte e se materializam no vestuário.',
  ],
  images: [
    {
      src: encodeAssetPath(
        '/assets/universo-limiar/05-detalhes/Textura Tribal em Tecido Preto-1.png'
      ),
      alt: 'Detalhe de estampa tribal em serigrafia sobre tecido preto pesado',
      width: 1536,
      height: 1024,
    },
    {
      src: encodeAssetPath(
        '/assets/universo-limiar/05-detalhes/Estampa Abstrata Rubra e Turquesa em Tecido Desgastado-2.png'
      ),
      alt: 'Detalhe de estampa orgânica em tons rubros e turquesa sobre algodão texturizado',
      width: 1672,
      height: 941,
    },
    {
      src: encodeAssetPath(
        '/assets/universo-limiar/05-detalhes/Textura de Tecido Desgastado-3.png'
      ),
      alt: 'Macro de trama e desfiado em tecido preto desgastado',
      width: 1536,
      height: 1024,
    },
    {
      src: encodeAssetPath(
        '/assets/universo-limiar/05-detalhes/Zíper e Costuras do Streetwear Desgastado-4.png'
      ),
      alt: 'Detalhe de zíper metálico, ilhoses e costuras reforçadas em peça escura',
      width: 1536,
      height: 1024,
    },
    {
      src: encodeAssetPath(
        '/assets/universo-limiar/05-detalhes/Hardware Gótico em Tecido Desgastado-6.png'
      ),
      alt: 'Mosquetões, fivelas e correntes metálicas em detalhe utilitário',
      width: 1536,
      height: 1024,
    },
    {
      src: encodeAssetPath(
        '/assets/universo-limiar/05-detalhes/Joias Góticas sobre Tecido Desgastado-5.png'
      ),
      alt: 'Pingente orgânico, anel e correntes metálicas sobre tecido preto',
      width: 1672,
      height: 941,
    },
  ] satisfies SobreImageAsset[],
  grafismos: [
    GRAFISMOS_ASSETS.filigrana04,
    GRAFISMOS_ASSETS.filigrana02,
  ] as const,
} as const;

export interface AutoralPiece {
  id: string;
  name: string;
  subtitle: string;
  image: SobreImageAsset;
}

export const BLOCO_05_CONTENT = {
  eyebrow: 'O QUE CRIAMOS',
  headline: 'Entre a descoberta e a criação.',
  paragraphs: [
    'Limiar reúne dois caminhos complementares: a curadoria de peças que dialogam com nosso universo e o desenvolvimento de criações autorais.',
    'Selecionamos vestuários e acessórios que expressam diferentes vertentes da moda underground, enquanto nossas artes próprias exploram símbolos, referências culturais e novas possibilidades estéticas.',
    'Cada criação autoral carrega um fragmento da nossa história.',
  ],
  pieces: [
    {
      id: 'basic',
      name: 'Basic',
      subtitle: 'A assinatura da Limiar.',
      image: {
        src: encodeAssetPath('/assets/universo-limiar/06-autorais/BASIC PNG.png'),
        alt: 'Camiseta autoral Basic com estampa oficial Limiar',
        width: 1080,
        height: 1350,
      },
    },
    {
      id: 'pe-vermeio',
      name: 'Pé Vermeio',
      subtitle: 'Nossas raízes paranaenses.',
      image: {
        src: encodeAssetPath('/assets/universo-limiar/06-autorais/PÉ VERMEIO PNG.png'),
        alt: 'Camiseta autoral Pé Vermeio com arte em vermelho',
        width: 1080,
        height: 1350,
      },
    },
    {
      id: 'urutau',
      name: 'Urutau',
      subtitle: 'Expressão autoral em colaboração com Tajá.',
      image: {
        src: encodeAssetPath('/assets/universo-limiar/06-autorais/URUTAU PNG.png'),
        alt: 'Camiseta autoral Urutau em colaboração com Tajá',
        width: 1080,
        height: 1350,
      },
    },
  ] satisfies AutoralPiece[],
  grafismos: [
    GRAFISMOS_ASSETS.filigrana05,
    GRAFISMOS_ASSETS.filigrana01,
  ] as const,
} as const;

export const BLOCO_06_CONTENT = {
  eyebrow: 'ALÉM DO VESTUÁRIO',
  headline: 'A travessia é coletiva.',
  introParagraphs: [
    'Limiar não termina na roupa.',
    'Existe na música, nas pistas, nas ruas, nas manifestações artísticas e nas conexões construídas entre pessoas que encontram na cultura underground um espaço de expressão.',
    'Somos uma marca em constante construção, atravessada por diferentes histórias, referências e identidades.',
  ],
  closingParagraphs: [
    'Não existe uma versão definitiva de quem somos.',
    'A travessia não acontece duas vezes da mesma forma.',
  ],
  closingStatement: 'Existe um outro lado.',
  ctaLabel: 'ATRAVESSE O LIMIAR.',
  mainImage: {
    src: encodeAssetPath(
      '/assets/universo-limiar/09-comunidade/Imagem do ChatGPT 25 de nov. de 2026, 15_48_59-4.png'
    ),
    alt: 'Coletivo em espaço urbano noturno sob estética underground Limiar',
    width: 1122,
    height: 1402,
  } satisfies SobreImageAsset,
  complementaryImages: [
    {
      src: encodeAssetPath(
        '/assets/universo-limiar/09-comunidade/Imagem do ChatGPT 25 de nov. de 2026, 15_48_57-3.png'
      ),
      alt: 'Grupo reunido em ambiente urbano de concreto e grafite',
      width: 1122,
      height: 1402,
    },
    {
      src: encodeAssetPath(
        '/assets/universo-limiar/09-comunidade/Imagem do ChatGPT 25 de nov. de 2026, 15_49_34-6.png'
      ),
      alt: 'Pessoas celebrando juntas em pista noturna ao ar livre',
      width: 1122,
      height: 1402,
    },
  ] satisfies SobreImageAsset[],
  grafismos: [
    GRAFISMOS_ASSETS.filigrana02,
    GRAFISMOS_ASSETS.filigrana05,
  ] as const,
} as const;

const BLOCK_IMAGE_LISTS: readonly (readonly string[])[] = [
  [BLOCO_01_CONTENT.image.src, ...BLOCO_01_CONTENT.grafismos],
  [
    BLOCO_02_CONTENT.mainImage.src,
    ...BLOCO_02_CONTENT.complementaryImages.map((i) => i.src),
    ...BLOCO_02_CONTENT.grafismos,
  ],
  [...BLOCO_03_CONTENT.images.map((i) => i.src), ...BLOCO_03_CONTENT.grafismos],
  [...BLOCO_04_CONTENT.images.map((i) => i.src), ...BLOCO_04_CONTENT.grafismos],
  [...BLOCO_05_CONTENT.pieces.map((p) => p.image.src), ...BLOCO_05_CONTENT.grafismos],
  [
    BLOCO_06_CONTENT.mainImage.src,
    ...BLOCO_06_CONTENT.complementaryImages.map((i) => i.src),
    ...BLOCO_06_CONTENT.grafismos,
  ],
];

const prefetchedUrls = new Set<string>();

/**
 * Antecipa exclusivamente os assets do bloco alvo (e no máximo 1 bloco adiante),
 * evitando carregar a biblioteca inteira durante o boot do hero.
 */
export function preloadSobreBlockAssets(blockIndex: number): void {
  if (typeof window === 'undefined') return;
  const list = BLOCK_IMAGE_LISTS[blockIndex];
  if (!list) return;

  for (const url of list) {
    if (prefetchedUrls.has(url)) continue;
    prefetchedUrls.add(url);
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
  }
}
