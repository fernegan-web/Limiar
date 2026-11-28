export type AccentTone = 'acid' | 'uv' | 'terracotta' | 'mineral' | 'neutral';

export type ProductSize = 'P' | 'M' | 'G' | 'GG' | 'XG' | 'Único';

export type SortOption =
  | 'featured'
  | 'discount-desc'
  | 'price-asc'
  | 'price-desc'
  | 'name-asc'
  | 'newest';

export interface ProductOptionChoice {
  value: string;
  description: string;
  inStock: boolean;
  visible: boolean;
  mediaUrl?: string;
}

export interface ProductOption {
  name: string;
  optionType: string;
  choices: ProductOptionChoice[];
}

export interface ProductVariant {
  id: string;
  size: ProductSize | string;
  colorName: string;
  colorHex: string;
  choices?: Record<string, string>;
  price?: number;
  formattedPrice?: string;
  originalPrice?: number;
  formattedOriginalPrice?: string;
  discountPercentage?: number;
  imageUrl?: string;
  inStock: boolean;
  trackQuantity?: boolean;
  stockCount?: number;
  sku?: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  price: number;
  currency: string;
  formattedPrice: string;
  originalPrice?: number;
  formattedOriginalPrice?: string;
  discountAmount?: number;
  discountPercentage?: number;
  minPrice?: number;
  maxPrice?: number;
  hasVariablePrice?: boolean;
  ribbon?: string;
  sku?: string;
  numericId?: string;
  freeShippingEligible?: boolean;
  lastUpdated?: string;
  categoryId: string;
  categoryName: string;
  collectionSlug: string;
  collectionName: string;
  collectionIds?: string[];
  collectionSlugs?: string[];
  shortDescription: string;
  description: string;
  composition: string;
  careInstructions: string;
  accentTone: AccentTone;
  statusTag?: string;
  images: string[];
  options?: ProductOption[];
  variants: ProductVariant[];
  manageVariants?: boolean;
  availableSizes?: string[];
  availableColors?: string[];
  inStock?: boolean;
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
  productCount?: number;
  accentTone: AccentTone;
  isDemoData: boolean;
}

export interface CatalogQuery {
  category?: string;
  collection?: string;
  search?: string;
  size?: string;
  minPrice?: number;
  maxPrice?: number;
  onlyOffers?: boolean;
  freeShippingOnly?: boolean;
  inStockOnly?: boolean;
  sort?: SortOption;
}

export interface CatalogFacetMetadata {
  availableSizes: string[];
  minPriceBound: number;
  maxPriceBound: number;
  offersCount: number;
  freeShippingCount: number;
  totalCount: number;
}

export interface CartItem {
  lineId: string;
  wixLineItemId?: string;
  productId: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  formattedPrice?: string;
  size: ProductSize | string;
  colorName: string;
  variantId: string;
  choices?: Record<string, string>;
  manageVariants?: boolean;
  quantity: number;
  inStock?: boolean;
  stockCount?: number;
  sku?: string;
  categoryName?: string;
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
