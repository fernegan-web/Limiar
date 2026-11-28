import type { CartItem, Product, ProductVariant } from '../../types/commerce';
import type { AdCatalogIdMode, AdLineContent } from '../../types/tracking';

export function resolveConfiguredAdCatalogIdMode(
  rawMode?: string | null
): AdCatalogIdMode {
  if (rawMode === 'sku' || rawMode === 'wix-variant-id' || rawMode === 'wix-product-id') {
    return rawMode;
  }
  return 'wix-product-id';
}

/**
 * Resolve o ID canônico de catálogo para Meta Ads (content_ids) e TikTok Ads (content_id)
 * preservando correspondência com o feed oficial da Wix Stores.
 */
export function resolveAdCatalogContentId(
  product: Pick<Product, 'id' | 'sku' | 'numericId'>,
  variant?: Pick<ProductVariant, 'id' | 'sku'> | null,
  mode: AdCatalogIdMode = 'wix-product-id'
): string {
  if (mode === 'sku') {
    return (variant?.sku || product.sku || variant?.id || product.id || '').trim();
  }
  if (mode === 'wix-variant-id') {
    return (variant?.id || product.id || '').trim();
  }
  return (product.id || variant?.sku || product.sku || '').trim();
}

export function resolveAdCartItemContentId(
  item: Pick<CartItem, 'productId' | 'variantId' | 'sku'>,
  mode: AdCatalogIdMode = 'wix-product-id'
): string {
  if (mode === 'sku') {
    return (item.sku || item.variantId || item.productId || '').trim();
  }
  if (mode === 'wix-variant-id') {
    return (item.variantId || item.productId || '').trim();
  }
  return (item.productId || item.sku || '').trim();
}

export function buildAdContentsFromCartItems(
  items: Array<Pick<CartItem, 'productId' | 'variantId' | 'sku' | 'name' | 'categoryName' | 'price' | 'quantity'>>,
  mode: AdCatalogIdMode = 'wix-product-id'
): { contentIds: string[]; contents: AdLineContent[]; totalValue: number; numItems: number } {
  const contentIds: string[] = [];
  const contents: AdLineContent[] = [];
  let totalValue = 0;
  let numItems = 0;

  for (const item of items) {
    const id = resolveAdCartItemContentId(item, mode);
    const qty = Math.max(1, Math.floor(item.quantity || 1));
    const unitPrice = Number.isFinite(item.price) && item.price >= 0 ? item.price : 0;

    if (id && !contentIds.includes(id)) {
      contentIds.push(id);
    }
    if (id) {
      contents.push({
        id,
        quantity: qty,
        item_price: Number(unitPrice.toFixed(2)),
        content_name: item.name,
        content_category: item.categoryName,
      });
    }
    totalValue += unitPrice * qty;
    numItems += qty;
  }

  return {
    contentIds,
    contents,
    totalValue: Number(totalValue.toFixed(2)),
    numItems,
  };
}
