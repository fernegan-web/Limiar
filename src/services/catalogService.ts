import { DEMO_CATEGORIES, DEMO_COLLECTIONS, DEMO_PRODUCTS } from '../data/demoCatalog';
import type { CatalogQuery, Category, Collection, Product } from '../types/commerce';
import { getWixIntegrationStatus } from './wix/wixClient';

/**
 * Filtragem pura de produtos — desacoplada de UI para facilitar testes unitários
 * e futura adaptação de respostas do Wix Stores Catalog V3.
 */
export function filterAndSortProducts(products: Product[], query: CatalogQuery = {}): Product[] {
  let result = [...products];

  if (query.category && query.category !== 'todas') {
    result = result.filter(
      (p) => p.categoryId === query.category || p.categoryName.toLowerCase() === query.category?.toLowerCase()
    );
  }

  if (query.collection && query.collection !== 'todas') {
    result = result.filter((p) => p.collectionSlug === query.collection);
  }

  if (query.size) {
    result = result.filter((p) =>
      p.variants.some((variant) => variant.size === query.size && variant.inStock)
    );
  }

  if (query.search && query.search.trim().length > 0) {
    const term = query.search.trim().toLowerCase();
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.categoryName.toLowerCase().includes(term) ||
        p.collectionName.toLowerCase().includes(term) ||
        p.shortDescription.toLowerCase().includes(term)
    );
  }

  switch (query.sort) {
    case 'price-asc':
      result.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      result.sort((a, b) => b.price - a.price);
      break;
    case 'name-asc':
      result.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      break;
    case 'featured':
    default:
      result.sort((a, b) => Number(b.featured) - Number(a.featured));
      break;
  }

  return result;
}

export async function fetchProducts(query: CatalogQuery = {}): Promise<Product[]> {
  const status = getWixIntegrationStatus();
  if (status.configured) {
    // Ponto de extensão reservado para Wix Catalog V3 (queryProducts)
    return filterAndSortProducts(DEMO_PRODUCTS, query);
  }
  return filterAndSortProducts(DEMO_PRODUCTS, query);
}

export async function fetchFeaturedProducts(): Promise<Product[]> {
  const all = await fetchProducts({ sort: 'featured' });
  return all.filter((p) => p.featured);
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const products = await fetchProducts();
  return products.find((p) => p.slug === slug) ?? null;
}

export async function fetchCategories(): Promise<Category[]> {
  return [...DEMO_CATEGORIES];
}

export async function fetchCollections(): Promise<Collection[]> {
  return [...DEMO_COLLECTIONS];
}
