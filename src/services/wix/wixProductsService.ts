import { products } from '@wix/stores';
import { initWixVisitorAuth, myWixClient } from './wixClient';

export interface QueryWixProductsOptions {
  limit?: number;
  skip?: number;
  sort?: 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'newest';
  collectionId?: string;
  hasSomeCollectionIds?: string[];
  searchTerm?: string;
}

export interface FormattedWixProductSummary {
  id: string;
  name: string;
  price: string;
  imageUrl: string;
  inStock: boolean;
  slug: string;
}

/**
 * Extrai a URL da imagem principal do produto Wix
 */
export function extractWixProductImageUrl(product: products.Product): string {
  const directMain = (product as unknown as { mainMedia?: { image?: { url?: string }; thumbnail?: { url?: string } } }).mainMedia;
  if (directMain?.image?.url) {
    return directMain.image.url;
  }
  if (directMain?.thumbnail?.url) {
    return directMain.thumbnail.url;
  }

  if (product.media?.mainMedia?.image?.url) {
    return product.media.mainMedia.image.url;
  }
  if (product.media?.mainMedia?.thumbnail?.url) {
    return product.media.mainMedia.thumbnail.url;
  }
  if (product.media?.items && product.media.items.length > 0) {
    const firstImg = product.media.items.find((m) => m.image?.url);
    if (firstImg?.image?.url) {
      return firstImg.image.url;
    }
  }
  return '';
}

/**
 * Extrai o preço formatado do produto Wix
 */
export function extractWixProductPrice(product: products.Product): string {
  if (product.priceData?.formatted?.discountedPrice) {
    return product.priceData.formatted.discountedPrice;
  }
  if (product.priceData?.formatted?.price) {
    return product.priceData.formatted.price;
  }
  if (typeof product.priceData?.price === 'number') {
    return `R$ ${product.priceData.price.toFixed(2).replace('.', ',')}`;
  }
  if (typeof product.price?.price === 'number') {
    return `R$ ${product.price.price.toFixed(2).replace('.', ',')}`;
  }
  return 'Preço sob consulta';
}

/**
 * Formata um produto do Wix Stores em um sumário limpo para exibição e logs
 */
export function formatWixProductSummary(product: products.Product): FormattedWixProductSummary {
  return {
    id: product._id || '',
    name: product.name || 'Sem título',
    price: extractWixProductPrice(product),
    imageUrl: extractWixProductImageUrl(product),
    inStock: product.stock?.inStock ?? true,
    slug: product.slug || '',
  };
}

/**
 * Consulta o catálogo de produtos do Wix Stores com suporte à paginação, filtros e tratamento de erros.
 */
export async function queryWixProducts(
  options: QueryWixProductsOptions = {}
): Promise<products.ProductsQueryResult> {
  try {
    // Garante que o visitante possui credenciais OAuth ativas
    await initWixVisitorAuth();

    let query = myWixClient.products.queryProducts();

    if (typeof options.limit === 'number' && options.limit > 0) {
      query = query.limit(options.limit);
    }
    if (typeof options.skip === 'number' && options.skip >= 0) {
      query = query.skip(options.skip);
    }

    if (options.collectionId) {
      query = query.hasSome('collectionIds', [options.collectionId]);
    } else if (options.hasSomeCollectionIds && options.hasSomeCollectionIds.length > 0) {
      query = query.hasSome('collectionIds', options.hasSomeCollectionIds);
    }

    if (options.searchTerm && options.searchTerm.trim().length > 0) {
      query = query.startsWith('name', options.searchTerm.trim());
    }

    if (options.sort) {
      switch (options.sort) {
        case 'name-asc':
          query = query.ascending('name');
          break;
        case 'name-desc':
          query = query.descending('name');
          break;
        case 'price-asc':
          query = query.ascending('price');
          break;
        case 'price-desc':
          query = query.descending('price');
          break;
        case 'newest':
          query = query.descending('lastUpdated');
          break;
      }
    }

    const result = await query.find();
    return result;
  } catch (error) {
    console.error('[Wix Headless] Erro na consulta de produtos:', error);
    throw error;
  }
}

/**
 * Consulta um produto específico pelo seu ID no Wix Stores.
 */
export async function getWixProductById(id: string): Promise<products.Product | null> {
  try {
    await initWixVisitorAuth();
    const response = await myWixClient.products.getProduct(id);
    return response.product || null;
  } catch (error) {
    console.error(`[Wix Headless] Erro ao buscar produto com ID ${id}:`, error);
    return null;
  }
}

/**
 * Consulta um produto específico pelo slug (URL amigável) no Wix Stores.
 */
export async function getWixProductBySlug(slug: string): Promise<products.Product | null> {
  try {
    await initWixVisitorAuth();
    const result = await myWixClient.products.queryProducts().eq('slug', slug).limit(1).find();
    return result.items[0] || null;
  } catch (error) {
    console.error(`[Wix Headless] Erro ao buscar produto com slug ${slug}:`, error);
    return null;
  }
}

/**
 * Estabelece a conexão real com o catálogo Wix Stores, realiza a consulta
 * exigida e imprime detalhadamente no console:
 * - Status da conexão.
 * - Quantidade total de produtos encontrados.
 * - Nomes dos produtos.
 * - IDs dos produtos.
 * - Preços.
 * - URLs das imagens.
 */
export async function validateAndLogWixCatalogConnection(): Promise<products.ProductsQueryResult> {
  console.group('⚡ [Wix Headless] Validação da Conexão com o Catálogo Wix');
  try {
    console.log('🔗 Status da conexão: Iniciando autenticação de visitante OAuth...');
    await initWixVisitorAuth();
    console.log('✅ Status da conexão: Conectado com sucesso ao Wix Headless (OAuth Ativo).');

    console.log('📦 Executando consulta: myWixClient.products.queryProducts().find()');
    const productList = await myWixClient.products.queryProducts().find();

    const totalCount = productList.totalCount ?? productList.items.length;
    console.log(`📊 Status da conexão: Sucesso (HTTP 200 OK)`);
    console.log(`📈 Quantidade total de produtos encontrados: ${totalCount}`);
    console.log(`📦 Produtos recebidos nesta página: ${productList.items.length}`);

    console.log('\n--- DETALHES DOS PRODUTOS REAIS DO WIX STORES ---');
    productList.items.forEach((item, index) => {
      const id = item._id || 'N/A';
      const name = item.name || 'Sem título';
      const price = extractWixProductPrice(item);
      const imageUrl = extractWixProductImageUrl(item) || 'Sem imagem cadastrada';

      console.log(
        `[#${index + 1}] ID: ${id}\n` +
        `  • Nome: ${name}\n` +
        `  • Preço: ${price}\n` +
        `  • Imagem: ${imageUrl}`
      );
    });

    if (console.table && productList.items.length > 0) {
      console.table(
        productList.items.map((item, idx) => ({
          '#': idx + 1,
          ID: item._id,
          Nome: item.name,
          Preço: extractWixProductPrice(item),
          'URL da Imagem': extractWixProductImageUrl(item),
        }))
      );
    }

    console.groupEnd();
    return productList;
  } catch (error) {
    console.error('❌ Status da conexão: Falha ao conectar ao backend Wix Stores:', error);
    console.groupEnd();
    throw error;
  }
}
