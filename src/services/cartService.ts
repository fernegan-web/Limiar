import type { CartItem, Product, ProductVariant } from '../types/commerce';

export const CART_STORAGE_KEY = 'limiar-demo-cart-v1';

export interface CartStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function createCartLineId(productId: string, variantId: string): string {
  return `${productId}__${variantId}`;
}

export function clampQuantityToStock(quantity: number, stockCount?: number): number {
  const safeQty = Math.max(1, Math.floor(quantity));
  if (typeof stockCount === 'number' && Number.isFinite(stockCount) && stockCount > 0) {
    return Math.min(safeQty, Math.floor(stockCount));
  }
  return safeQty;
}

export function addItemToCartList(
  items: CartItem[],
  product: Product,
  variant: ProductVariant,
  quantity = 1
): CartItem[] {
  const stockCap =
    variant.trackQuantity && typeof variant.stockCount === 'number'
      ? variant.stockCount
      : undefined;
  const safeQty = clampQuantityToStock(quantity, stockCap);
  const lineId = createCartLineId(product.id, variant.id);
  const existing = items.find((item) => item.lineId === lineId);

  if (existing) {
    return items.map((item) =>
      item.lineId === lineId
        ? {
            ...item,
            quantity: clampQuantityToStock(
              item.quantity + safeQty,
              stockCap ?? item.stockCount
            ),
            stockCount: stockCap ?? item.stockCount,
            inStock: variant.inStock,
          }
        : item
    );
  }

  return [
    ...items,
    {
      lineId,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: variant.imageUrl || product.images[0] || '',
      price: variant.price ?? product.price,
      formattedPrice: variant.formattedPrice ?? product.formattedPrice,
      size: variant.size,
      colorName: variant.colorName,
      variantId: variant.id,
      choices: variant.choices,
      manageVariants: product.manageVariants,
      quantity: safeQty,
      inStock: variant.inStock,
      stockCount: stockCap,
      sku: variant.sku || product.sku,
      categoryName: product.categoryName,
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
    item.lineId === lineId
      ? {
          ...item,
          quantity: clampQuantityToStock(nextQuantity, item.stockCount),
        }
      : item
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

export function loadStoredCart(storage?: CartStorageLike | null): CartItem[] {
  const target =
    storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
  if (!target) return [];
  try {
    const raw = target.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is CartItem =>
        Boolean(
          entry &&
            typeof entry === 'object' &&
            typeof (entry as CartItem).productId === 'string' &&
            typeof (entry as CartItem).lineId === 'string' &&
            typeof (entry as CartItem).quantity === 'number' &&
            (entry as CartItem).quantity > 0
        )
    );
  } catch {
    return [];
  }
}

export function saveStoredCart(
  items: CartItem[],
  storage?: CartStorageLike | null
): void {
  const target =
    storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
  if (!target) return;
  try {
    if (items.length === 0) {
      target.removeItem(CART_STORAGE_KEY);
    } else {
      target.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    }
  } catch {
    // ignore storage quota errors
  }
}

export function clearStoredCart(storage?: CartStorageLike | null): void {
  const target =
    storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
  if (!target) return;
  try {
    target.removeItem(CART_STORAGE_KEY);
  } catch {
    // ignore storage removal errors
  }
}

/**
 * Retorna itens da sessão de visitante que ainda não existem no carrinho Wix do membro autenticado.
 */
export function findMissingGuestItemsForCart(
  guestItems: CartItem[],
  wixItems: CartItem[]
): CartItem[] {
  if (guestItems.length === 0) return [];
  const existingKeys = new Set(
    wixItems.map((item) => createCartLineId(item.productId, item.variantId))
  );
  return guestItems.filter(
    (item) => !existingKeys.has(createCartLineId(item.productId, item.variantId))
  );
}

export function formatCartVariantLabel(item: CartItem): string {
  if (item.choices && Object.keys(item.choices).length > 0) {
    return Object.entries(item.choices)
      .filter(([, value]) => Boolean(value))
      .map(([key, value]) => `${key}: ${value}`)
      .join(' · ');
  }
  const parts: string[] = [];
  if (item.size && item.size !== 'Único') {
    parts.push(`Tam. ${item.size}`);
  }
  if (item.colorName && item.colorName !== 'Padrão') {
    parts.push(item.colorName);
  }
  return parts.length > 0 ? parts.join(' · ') : 'Edição única';
}
