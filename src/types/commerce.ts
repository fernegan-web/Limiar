export type AccentTone = 'acid' | 'uv' | 'terracotta' | 'mineral' | 'neutral';

export type ProductSize = 'P' | 'M' | 'G' | 'GG' | 'XG' | 'Único';

export type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'name-asc';

export interface ProductVariant {
  id: string;
  size: ProductSize;
  colorName: string;
  colorHex: string;
  inStock: boolean;
  stockCount?: number;
  sku?: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  price: number;
  currency: 'BRL';
  formattedPrice: string;
  categoryId: string;
  categoryName: string;
  collectionSlug: string;
  collectionName: string;
  shortDescription: string;
  description: string;
  composition: string;
  careInstructions: string;
  accentTone: AccentTone;
  statusTag?: string;
  images: string[];
  variants: ProductVariant[];
  availableSizes?: string[];
  availableColors?: string[];
  featured: boolean;
  isDemoData: boolean;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  productCount: number;
  isDemoData: boolean;
}

export interface Collection {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  image: string;
  accentTone: AccentTone;
  isDemoData: boolean;
}

export interface CatalogQuery {
  category?: string;
  collection?: string;
  search?: string;
  size?: ProductSize | '';
  sort?: SortOption;
}

export interface CartItem {
  lineId: string;
  productId: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  size: ProductSize;
  colorName: string;
  variantId: string;
  quantity: number;
}

export interface CartState {
  items: CartItem[];
  source: 'demo' | 'wix-cart-v2';
}

export interface WixIntegrationStatus {
  configured: boolean;
  mode: 'demo-isolated' | 'wix-headless';
  catalogVersion: 'V3';
  cartVersion: 'V2';
  visitorAuthReady: boolean;
  checkoutEnabled: boolean;
  missingEnvKeys: string[];
}
