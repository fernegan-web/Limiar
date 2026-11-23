import type { CartItem, Product, ProductVariant } from '../types/commerce';

export const CART_STORAGE_KEY = 'limiar-demo-cart-v1';

export function createCartLineId(productId: string, variantId: string): string {
  return `${productId}__${variantId}`;
}

export function addItemToCartList(
  items: CartItem[],
  product: Product,
  variant: ProductVariant,
  quantity = 1
): CartItem[] {
  const safeQty = Math.max(1, Math.floor(quantity));
  const lineId = createCartLineId(product.id, variant.id);
  const existing = items.find((item) => item.lineId === lineId);

  if (existing) {
    return items.map((item) =>
      item.lineId === lineId ? { ...item, quantity: item.quantity + safeQty } : item
    );
  }

  return [
    ...items,
    {
      lineId,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.images[0] ?? '',
      price: product.price,
      size: variant.size,
      colorName: variant.colorName,
      variantId: variant.id,
      quantity: safeQty,
    },
  ];
}

export function updateCartItemQuantity(
  items: CartItem[],
  lineId: string,
  nextQuantity: number
): CartItem[] {
  if (nextQuantity <= 0) {
    return items.filter((item) => item.lineId !== lineId);
  }
  return items.map((item) =>
    item.lineId === lineId ? { ...item, quantity: Math.floor(nextQuantity) } : item
  );
}

export function removeCartItem(items: CartItem[], lineId: string): CartItem[] {
  return items.filter((item) => item.lineId !== lineId);
}

export function calculateCartTotals(items: CartItem[]): {
  subtotal: number;
  totalItems: number;
} {
  return items.reduce(
    (acc, item) => ({
      subtotal: Number((acc.subtotal + item.price * item.quantity).toFixed(2)),
      totalItems: acc.totalItems + item.quantity,
    }),
    { subtotal: 0, totalItems: 0 }
  );
}
