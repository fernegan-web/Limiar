export type AdPlatform = 'meta' | 'tiktok';

export type AdCatalogIdMode = 'wix-product-id' | 'wix-variant-id' | 'sku';

export type StandardAdEventName =
  | 'PageView'
  | 'ViewContent'
  | 'Search'
  | 'AddToWishlist'
  | 'AddToCart'
  | 'InitiateCheckout'
  | 'Purchase';

export interface AdLineContent {
  id: string;
  quantity: number;
  item_price: number;
  content_name?: string;
  content_category?: string;
}

export interface AdTrackingEventPayload {
  eventId: string;
  eventName: StandardAdEventName;
  eventTime: number;
  eventSourceUrl: string;
  currency: 'BRL';
  value?: number;
  contentType?: 'product' | 'product_group';
  contentIds?: string[];
  contents?: AdLineContent[];
  searchString?: string;
  numItems?: number;
  orderReference?: string;
}

export interface PendingCheckoutSnapshot {
  snapshotId: string;
  createdAt: number;
  currency: 'BRL';
  value: number;
  numItems: number;
  items: Array<{
    productId: string;
    variantId: string;
    sku?: string;
    name: string;
    categoryName?: string;
    price: number;
    quantity: number;
  }>;
}
