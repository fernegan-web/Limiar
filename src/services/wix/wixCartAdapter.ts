import { currentCart } from '@wix/ecom';
import type { CartItem, Product } from '../../types/commerce';
import { initWixVisitorAuth, myWixClient } from './wixClient';
import { createCartLineId } from '../cartService';

/**
 * ID oficial do catálogo Wix Stores para CatalogReference.
 */
export const WIX_STORES_APP_ID = '215238eb-22a5-4c36-9e7b-e7c08025e04e';

/**
 * NOTA ARQUITETURAL (Cart V1 vs Cart V2):
 * Este adaptador isola todas as chamadas ao módulo `@wix/ecom` (`currentCart` V1).
 * A migração direta para `currentCartV2` / `cartV2` não pode ser feita sem suporte
 * compatível em `@wix/redirects`, pois:
 *   1. `currentCartV2` não expõe `createCheckoutFromCurrentCart`;
 *   2. `cartV2.getCheckoutUrl` exige identidade elevada (`@applicableIdentity APP`);
 *   3. `@wix/redirects.createRedirectSession({ ecomCheckout })` exige `checkoutId`.
 * Isolar o uso da V1 neste adaptador permite migrar futuramente em um único ponto
 * sem alterar contextos ou componentes da interface.
 */

export interface WixCartClientLike {
  currentCart: {
    getCurrentCart: () => Promise<currentCart.Cart>;
    addToCurrentCart: (
      options?: Parameters<typeof myWixClient.currentCart.addToCurrentCart>[0]
    ) => Promise<{ cart?: currentCart.Cart | null }>;
    updateCurrentCartLineItemQuantity: (
      lineItems: currentCart.LineItemQuantityUpdate[]
    ) => Promise<{ cart?: currentCart.Cart | null }>;
    removeLineItemsFromCurrentCart: (
      lineItemIds: string[]
    ) => Promise<{ cart?: currentCart.Cart | null }>;
    deleteCurrentCart: () => Promise<void>;
    estimateCurrentCartTotals?: (
      options?: Parameters<typeof myWixClient.currentCart.estimateCurrentCartTotals>[0]
    ) => Promise<{
      priceSummary?: {
        subtotal?: {
          amount?: string;
          formattedAmount?: string;
        };
      };
    }>;
  };
}

export interface WixCartAdapterDeps {
  client?: WixCartClientLike;
  ensureAuth?: () => Promise<unknown>;
}

export interface WixCartEstimate {
  subtotalAmount: number;
  formattedSubtotal?: string;
}

export function extractWixErrorInfo(error: unknown): {
  message: string;
  code?: string;
  status?: number;
} {
  if (!error || typeof error !== 'object') {
    return { message: String(error || '') };
  }
  const obj = error as {
    message?: unknown;
    code?: unknown;
    status?: unknown;
    details?: {
      applicationError?: { code?: unknown; description?: unknown };
      httpStatus?: unknown;
    };
  };

  const code =
    typeof obj.details?.applicationError?.code === 'string'
      ? obj.details.applicationError.code
      : typeof obj.code === 'string'
        ? obj.code
        : undefined;

  const status =
    typeof obj.status === 'number'
      ? obj.status
      : typeof obj.details?.httpStatus === 'number'
        ? obj.details.httpStatus
        : undefined;

  const message =
    typeof obj.details?.applicationError?.description === 'string'
      ? obj.details.applicationError.description
      : typeof obj.message === 'string'
        ? obj.message
        : '';

  return { message, code, status };
}

export function isOwnedCartNotFoundError(error: unknown): boolean {
  const info = extractWixErrorInfo(error);
  const combined = `${info.code ?? ''} ${info.message}`.toUpperCase();
  return (
    info.status === 404 ||
    combined.includes('OWNED_CART_NOT_FOUND') ||
    combined.includes('NO ACTIVE CURRENT CART') ||
    combined.includes('CART_NOT_FOUND')
  );
}

export function mapWixCartErrorMessage(error: unknown): string {
  const info = extractWixErrorInfo(error);
  const upper = `${info.code ?? ''} ${info.message}`.toUpperCase();

  if (
    upper.includes('OUT_OF_STOCK') ||
    upper.includes('INSUFFICIENT_INVENTORY') ||
    upper.includes('QUANTITY_EXCEEDED') ||
    upper.includes('NOT_ENOUGH_STOCK')
  ) {
    return 'A quantidade solicitada excede o estoque disponível no momento.';
  }
  if (upper.includes('PRODUCT_NOT_FOUND') || upper.includes('ITEM_NOT_AVAILABLE')) {
    return 'Esta peça não está mais disponível no catálogo.';
  }
  if (
    upper.includes('UNAUTHENTICATED') ||
    upper.includes('PERMISSION_DENIED') ||
    upper.includes('FORBIDDEN') ||
    info.status === 401
  ) {
    return 'Sua sessão expirou. Atualize a página e tente novamente.';
  }
  if (
    upper.includes('NETWORK') ||
    upper.includes('FAILED TO FETCH') ||
    upper.includes('TIMEOUT')
  ) {
    return 'Não foi possível conectar ao carrinho. Verifique sua conexão e tente novamente.';
  }
  return 'Não foi possível atualizar seu carrinho no momento. Tente novamente.';
}

export function normalizeWixCartImageUrl(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return trimmed;
  }
  // Converte URI wix:image://v1/<mediaId>/... para URL pública estática
  const wixImageMatch = trimmed.match(/^wix:image:\/\/v1\/([^/]+)/i);
  if (wixImageMatch && wixImageMatch[1]) {
    return `https://static.wixstatic.com/media/${wixImageMatch[1]}`;
  }
  return '';
}

function serializeChoicesKey(choices?: Record<string, string>): string {
  if (!choices) return '';
  const entries = Object.entries(choices)
    .filter(([, val]) => Boolean(val))
    .sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return '';
  return entries.map(([k, v]) => `${k}=${v}`).join('|');
}

function isSyntheticVariantId(variantId: string, productId: string): boolean {
  if (!variantId) return true;
  if (variantId === 'default' || variantId === productId) return true;
  if (variantId.startsWith(`${productId}-var-`)) return true;
  return false;
}

export function buildWixCatalogReferenceOptions(item: {
  productId: string;
  variantId: string;
  choices?: Record<string, string>;
  manageVariants?: boolean;
}): Record<string, unknown> | undefined {
  if (item.manageVariants && !isSyntheticVariantId(item.variantId, item.productId)) {
    return { variantId: item.variantId };
  }
  if (item.choices && Object.keys(item.choices).length > 0) {
    return { options: item.choices };
  }
  if (!isSyntheticVariantId(item.variantId, item.productId)) {
    return { variantId: item.variantId };
  }
  return undefined;
}

function extractSlugFromWixUrl(url?: string | null): string | undefined {
  if (!url || typeof url !== 'string') return undefined;
  const cleaned = url.split('?')[0].split('#')[0].replace(/\/+$/, '');
  const parts = cleaned.split('/').filter(Boolean);
  const last = parts[parts.length - 1];
  if (!last || last === 'product-page' || last === 'produto') return undefined;
  return last;
}

function extractChoicesFromLineItem(line: currentCart.LineItem): {
  choices?: Record<string, string>;
  size?: string;
  colorName?: string;
  variantIdFromOptions?: string;
} {
  const refOptions = line.catalogReference?.options as
    | { variantId?: unknown; options?: unknown }
    | null
    | undefined;

  const variantIdFromOptions =
    typeof refOptions?.variantId === 'string' && refOptions.variantId
      ? refOptions.variantId
      : undefined;

  const rawOptions =
    refOptions?.options && typeof refOptions.options === 'object'
      ? (refOptions.options as Record<string, unknown>)
      : undefined;

  const choices: Record<string, string> = {};
  if (rawOptions) {
    for (const [key, val] of Object.entries(rawOptions)) {
      if (typeof val === 'string' && val.trim()) {
        choices[key] = val.trim();
      }
    }
  }

  let size: string | undefined;
  let colorName: string | undefined;

  for (const desc of line.descriptionLines ?? []) {
    const label = desc.name?.original || desc.name?.translated || '';
    const value =
      desc.colorInfo?.original ||
      desc.colorInfo?.translated ||
      desc.plainText?.original ||
      desc.plainText?.translated ||
      '';
    if (label && value && !choices[label]) {
      choices[label] = value;
    }
    if (!size && /tamanh|size|medid/i.test(label) && value) {
      size = value;
    }
    if (!colorName && /cor|color|acabament/i.test(label) && value) {
      colorName = value;
    }
  }

  for (const [key, value] of Object.entries(choices)) {
    if (!size && /tamanh|size|medid/i.test(key)) {
      size = value;
    }
    if (!colorName && /cor|color|acabament/i.test(key)) {
      colorName = value;
    }
  }

  return {
    choices: Object.keys(choices).length > 0 ? choices : undefined,
    size,
    colorName,
    variantIdFromOptions,
  };
}

export function mapWixCartToCartItems(
  wixCart: currentCart.Cart | null | undefined,
  options?: {
    catalogProducts?: Product[];
    previousItems?: CartItem[];
  }
): CartItem[] {
  if (!wixCart?.lineItems || wixCart.lineItems.length === 0) {
    return [];
  }

  const catalogById = new Map<string, Product>();
  for (const p of options?.catalogProducts ?? []) {
    catalogById.set(p.id, p);
  }

  const prevByWixLineId = new Map<string, CartItem>();
  const prevByProductAndVariant = new Map<string, CartItem>();
  for (const prev of options?.previousItems ?? []) {
    if (prev.wixLineItemId) {
      prevByWixLineId.set(prev.wixLineItemId, prev);
    }
    prevByProductAndVariant.set(`${prev.productId}__${prev.variantId}`, prev);
  }

  return wixCart.lineItems
    .filter((line) => Boolean(line.catalogReference?.catalogItemId))
    .map((line, index) => {
      const productId = line.catalogReference?.catalogItemId ?? '';
      const wixLineItemId = line._id || undefined;
      const extracted = extractChoicesFromLineItem(line);

      const knownProduct = catalogById.get(productId);
      const prevByLine = wixLineItemId ? prevByWixLineId.get(wixLineItemId) : undefined;
      const variantCandidateId =
        extracted.variantIdFromOptions || prevByLine?.variantId || '';
      const prevByCombo = variantCandidateId
        ? prevByProductAndVariant.get(`${productId}__${variantCandidateId}`)
        : undefined;
      const prevMatch = prevByLine ?? prevByCombo;

      const knownVariant = knownProduct?.variants.find((v) => {
        if (extracted.variantIdFromOptions && v.id === extracted.variantIdFromOptions) {
          return true;
        }
        if (extracted.choices && v.choices) {
          const entries = Object.entries(extracted.choices);
          if (entries.length > 0 && entries.every(([k, val]) => v.choices?.[k] === val)) {
            return true;
          }
        }
        return false;
      });

      const resolvedVariantId =
        extracted.variantIdFromOptions ||
        knownVariant?.id ||
        prevMatch?.variantId ||
        (serializeChoicesKey(extracted.choices) || wixLineItemId || `line-${index}`);

      const resolvedSize =
        extracted.size || knownVariant?.size || prevMatch?.size || 'Único';
      const resolvedColorName =
        extracted.colorName || knownVariant?.colorName || prevMatch?.colorName || 'Padrão';

      const parsedAmount = Number.parseFloat(
        line.price?.amount ?? line.priceBeforeDiscounts?.amount ?? ''
      );
      const price =
        Number.isFinite(parsedAmount) && parsedAmount >= 0
          ? parsedAmount
          : knownVariant?.price ?? knownProduct?.price ?? prevMatch?.price ?? 0;

      const formattedPrice =
        line.price?.formattedAmount ||
        line.priceBeforeDiscounts?.formattedAmount ||
        knownVariant?.formattedPrice ||
        prevMatch?.formattedPrice;

      const resolvedImage =
        normalizeWixCartImageUrl(line.image) ||
        knownVariant?.imageUrl ||
        knownProduct?.images[0] ||
        prevMatch?.image ||
        '';

      const slug =
        extractSlugFromWixUrl(line.url) ||
        knownProduct?.slug ||
        prevMatch?.slug ||
        productId;

      const lineId = createCartLineId(productId, resolvedVariantId);

      const stockCount = knownVariant?.stockCount ?? prevMatch?.stockCount;
      const inStock =
        line.availability?.status === currentCart.ItemAvailabilityStatus.NOT_AVAILABLE
          ? false
          : knownVariant?.inStock ?? prevMatch?.inStock ?? true;

      return {
        lineId,
        wixLineItemId,
        productId,
        slug,
        name:
          line.productName?.translated ||
          line.productName?.original ||
          knownProduct?.name ||
          prevMatch?.name ||
          'Peça Limiar',
        image: resolvedImage,
        price,
        formattedPrice,
        size: resolvedSize,
        colorName: resolvedColorName,
        variantId: resolvedVariantId,
        choices: extracted.choices ?? knownVariant?.choices ?? prevMatch?.choices,
        manageVariants: knownProduct?.manageVariants ?? prevMatch?.manageVariants,
        quantity: Math.max(1, Math.floor(line.quantity ?? 1)),
        inStock,
        stockCount,
      };
    });
}

/**
 * Cria uma instância serializada do adaptador de carrinho para uso em produção ou testes.
 */
export function createWixCartAdapter(deps: WixCartAdapterDeps = {}) {
  const getClient = (): WixCartClientLike => deps.client ?? myWixClient;
  const ensureAuth = deps.ensureAuth ?? initWixVisitorAuth;

  let operationQueue: Promise<unknown> = Promise.resolve();

  const enqueue = <T>(fn: () => Promise<T>): Promise<T> => {
    const run = operationQueue.then(fn, fn);
    operationQueue = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  };

  return {
    enqueue,

    async getCurrentCartSafe(): Promise<currentCart.Cart | null> {
      await ensureAuth();
      try {
        return await getClient().currentCart.getCurrentCart();
      } catch (error) {
        if (isOwnedCartNotFoundError(error)) {
          return null;
        }
        throw error;
      }
    },

    async addItems(
      items: Array<{
        productId: string;
        variantId: string;
        choices?: Record<string, string>;
        manageVariants?: boolean;
        quantity: number;
      }>
    ): Promise<currentCart.Cart | null> {
      if (items.length === 0) {
        return this.getCurrentCartSafe();
      }
      await ensureAuth();
      const lineItems = items.map((item) => {
        const options = buildWixCatalogReferenceOptions(item);
        return {
          quantity: Math.max(1, Math.floor(item.quantity)),
          catalogReference: {
            appId: WIX_STORES_APP_ID,
            catalogItemId: item.productId,
            ...(options ? { options } : {}),
          },
        };
      });

      const response = await getClient().currentCart.addToCurrentCart({ lineItems });
      return response.cart ?? null;
    },

    async updateLineItemQuantity(
      wixLineItemId: string,
      quantity: number
    ): Promise<currentCart.Cart | null> {
      await ensureAuth();
      const safeQty = Math.max(1, Math.floor(quantity));
      const response = await getClient().currentCart.updateCurrentCartLineItemQuantity([
        { _id: wixLineItemId, quantity: safeQty },
      ]);
      return response.cart ?? null;
    },

    async removeLineItems(wixLineItemIds: string[]): Promise<currentCart.Cart | null> {
      if (wixLineItemIds.length === 0) {
        return this.getCurrentCartSafe();
      }
      await ensureAuth();
      const response = await getClient().currentCart.removeLineItemsFromCurrentCart(
        wixLineItemIds
      );
      return response.cart ?? null;
    },

    async clearCurrentCartSafe(): Promise<void> {
      await ensureAuth();
      try {
        await getClient().currentCart.deleteCurrentCart();
      } catch (error) {
        if (isOwnedCartNotFoundError(error)) {
          return;
        }
        throw error;
      }
    },

    async estimateTotalsSafe(): Promise<WixCartEstimate | null> {
      const client = getClient();
      if (!client.currentCart.estimateCurrentCartTotals) {
        return null;
      }
      await ensureAuth();
      try {
        const result = await client.currentCart.estimateCurrentCartTotals();
        const rawAmount = result.priceSummary?.subtotal?.amount;
        const parsed = rawAmount ? Number.parseFloat(rawAmount) : Number.NaN;
        if (!Number.isFinite(parsed)) {
          return null;
        }
        return {
          subtotalAmount: parsed,
          formattedSubtotal: result.priceSummary?.subtotal?.formattedAmount,
        };
      } catch (error) {
        if (isOwnedCartNotFoundError(error)) {
          return { subtotalAmount: 0 };
        }
        return null;
      }
    },
  };
}

export const defaultWixCartAdapter = createWixCartAdapter();
