import { currentCart } from '@wix/ecom';
import { products } from '@wix/stores';
import type { CartItem } from '../../types/commerce';
import {
  WIX_STORES_APP_ID,
  buildWixCatalogReferenceOptions,
  createWixCartAdapter,
  defaultWixCartAdapter,
  extractWixErrorInfo,
  isOwnedCartNotFoundError,
  type WixCartClientLike,
} from './wixCartAdapter';
import { initWixVisitorAuth, myWixClient } from './wixClient';

export interface WixCheckoutClientLike extends WixCartClientLike {
  products: {
    getProduct: (id: string) => Promise<{ product?: products.Product }>;
  };
  currentCart: WixCartClientLike['currentCart'] & {
    createCheckoutFromCurrentCart: (
      options?: currentCart.CreateCheckoutFromCurrentCartOptions
    ) => Promise<{ checkoutId?: string | null }>;
  };
  redirects: {
    createRedirectSession: (options: {
      ecomCheckout: { checkoutId: string };
      callbacks?: {
        thankYouPageUrl?: string;
        postFlowUrl?: string;
        cartPageUrl?: string;
      };
    }) => Promise<{
      redirectSession?: { fullUrl?: string | null } | null;
    }>;
  };
}

export interface CheckoutReturnResult {
  handled: boolean;
  status: 'order-recorded' | 'returned-incomplete' | 'none';
  clearLocalCart: boolean;
  message: string;
}

export interface ProceedCheckoutResult {
  success: boolean;
  redirectUrl?: string;
  message?: string;
}

class CheckoutValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CheckoutValidationError';
  }
}

function findMatchingVariant(
  product: products.Product,
  item: CartItem
): products.Variant | undefined {
  const list = product.variants ?? [];
  if (list.length === 0) return undefined;

  const byId = list.find((v) => v._id === item.variantId);
  if (byId) return byId;

  if (item.choices && Object.keys(item.choices).length > 0) {
    const byChoices = list.find((v) => {
      if (!v.choices) return false;
      return Object.entries(item.choices ?? {}).every(
        ([key, val]) => v.choices?.[key] === val
      );
    });
    if (byChoices) return byChoices;
  }

  if (!product.manageVariants && list.length === 1) {
    return list[0];
  }
  return undefined;
}

export function validateProductStockForCartItem(
  product: products.Product | undefined,
  item: CartItem
): {
  options?: Record<string, unknown>;
} {
  if (!product || product.visible === false) {
    throw new CheckoutValidationError(
      `A peça "${item.name}" não está mais disponível no catálogo.`
    );
  }

  const matchedVariant = findMatchingVariant(product, item);
  const requiresVariantChoice =
    Boolean(product.manageVariants) || (product.variants?.length ?? 0) > 1;

  if (requiresVariantChoice && !matchedVariant) {
    throw new CheckoutValidationError(
      `Selecione novamente a variante da peça "${item.name}" antes de finalizar.`
    );
  }

  if (matchedVariant) {
    if (matchedVariant.variant?.visible === false) {
      throw new CheckoutValidationError(
        `A combinação selecionada para "${item.name}" não está mais disponível.`
      );
    }

    const variantInStock = matchedVariant.stock?.inStock ?? true;
    const trackVariantQty = Boolean(matchedVariant.stock?.trackQuantity);
    const availableVariantQty =
      typeof matchedVariant.stock?.quantity === 'number'
        ? matchedVariant.stock.quantity
        : undefined;

    if (!variantInStock || (trackVariantQty && (availableVariantQty ?? 0) <= 0)) {
      throw new CheckoutValidationError(
        `A opção escolhida de "${item.name}" está esgotada no momento.`
      );
    }

    if (
      trackVariantQty &&
      typeof availableVariantQty === 'number' &&
      item.quantity > availableVariantQty
    ) {
      throw new CheckoutValidationError(
        `Estoque insuficiente para "${item.name}" (disponível: ${availableVariantQty}).`
      );
    }
  } else if (product.stock) {
    const productOutOfStock =
      product.stock.inStock === false ||
      product.stock.inventoryStatus === products.InventoryStatus.OUT_OF_STOCK;
    const trackProdQty = Boolean(product.stock.trackInventory);
    const availableProdQty =
      typeof product.stock.quantity === 'number' ? product.stock.quantity : undefined;

    if (productOutOfStock || (trackProdQty && (availableProdQty ?? 0) <= 0)) {
      throw new CheckoutValidationError(`"${item.name}" está esgotado no momento.`);
    }

    if (
      trackProdQty &&
      typeof availableProdQty === 'number' &&
      item.quantity > availableProdQty
    ) {
      throw new CheckoutValidationError(
        `Estoque insuficiente para "${item.name}" (disponível: ${availableProdQty}).`
      );
    }
  }

  const options = buildWixCatalogReferenceOptions({
    productId: item.productId,
    variantId: matchedVariant?._id || item.variantId,
    choices: matchedVariant?.choices ?? item.choices,
    manageVariants: Boolean(product.manageVariants),
  });

  return { options };
}

function stableOptionsSignature(options?: Record<string, unknown> | null): string {
  if (!options) return '';
  if (typeof options.variantId === 'string' && options.variantId) {
    return `v:${options.variantId}`;
  }
  if (options.options && typeof options.options === 'object') {
    const entries = Object.entries(options.options as Record<string, unknown>)
      .map(([k, v]) => `${k}=${String(v ?? '')}`)
      .sort();
    return `o:${entries.join('|')}`;
  }
  return '';
}

function cartMatchesExpectedItems(
  cart: currentCart.Cart | null,
  expectedItems: Array<{
    productId: string;
    quantity: number;
    options?: Record<string, unknown>;
  }>
): boolean {
  const actualLines = cart?.lineItems ?? [];
  if (actualLines.length !== expectedItems.length) return false;

  const actualCounts = new Map<string, number>();
  for (const line of actualLines) {
    const itemId = line.catalogReference?.catalogItemId ?? '';
    const sig = `${itemId}::${stableOptionsSignature(line.catalogReference?.options)}`;
    actualCounts.set(sig, (actualCounts.get(sig) ?? 0) + (line.quantity ?? 0));
  }

  const expectedCounts = new Map<string, number>();
  for (const exp of expectedItems) {
    const sig = `${exp.productId}::${stableOptionsSignature(exp.options)}`;
    expectedCounts.set(sig, (expectedCounts.get(sig) ?? 0) + exp.quantity);
  }

  if (actualCounts.size !== expectedCounts.size) return false;
  for (const [key, qty] of expectedCounts.entries()) {
    if (actualCounts.get(key) !== qty) return false;
  }
  return true;
}

export function isAllowedRedirectUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function buildCheckoutCallbacks(origin: string): {
  thankYouPageUrl: string;
  postFlowUrl: string;
  cartPageUrl: string;
} {
  const normalizedOrigin = origin.replace(/\/+$/, '');
  return {
    thankYouPageUrl: `${normalizedOrigin}/?checkout=retorno`,
    postFlowUrl: `${normalizedOrigin}/loja`,
    cartPageUrl: `${normalizedOrigin}/loja`,
  };
}

/**
 * Avalia o retorno do checkout sem confiar cegamente em parâmetros da URL:
 * apenas confirma registro de pedido quando o currentCart real da Wix foi limpo pela conclusão.
 */
export function evaluateCheckoutReturn(
  search: string,
  wixCart: currentCart.Cart | null
): CheckoutReturnResult {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const hasReturnFlag =
    params.get('checkout') === 'retorno' ||
    Boolean(params.get('orderId')) ||
    Boolean(params.get('checkoutId'));

  if (!hasReturnFlag) {
    return {
      handled: false,
      status: 'none',
      clearLocalCart: false,
      message: '',
    };
  }

  const hasRemainingItems = Boolean(wixCart?.lineItems && wixCart.lineItems.length > 0);
  if (hasRemainingItems) {
    return {
      handled: true,
      status: 'returned-incomplete',
      clearLocalCart: false,
      message:
        'Você retornou antes de concluir o pagamento. Seus itens continuam salvos no carrinho.',
    };
  }

  return {
    handled: true,
    status: 'order-recorded',
    clearLocalCart: true,
    message:
      'Pedido registrado. A confirmação final do pagamento (Cartão, Pix ou Boleto) e o acompanhamento serão enviados pela Wix para o seu e-mail.',
  };
}

export async function verifyWixCheckoutReturn(
  search: string,
  deps?: {
    getCart?: () => Promise<currentCart.Cart | null>;
  }
): Promise<CheckoutReturnResult> {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const hasReturnFlag =
    params.get('checkout') === 'retorno' ||
    Boolean(params.get('orderId')) ||
    Boolean(params.get('checkoutId'));

  if (!hasReturnFlag) {
    return {
      handled: false,
      status: 'none',
      clearLocalCart: false,
      message: '',
    };
  }

  const getCart = deps?.getCart ?? (() => defaultWixCartAdapter.getCurrentCartSafe());
  const wixCart = await getCart();
  return evaluateCheckoutReturn(search, wixCart);
}

/**
 * Serviço de Checkout utilizando Wix Headless SDK (@wix/ecom + @wix/redirects).
 * Valida catálogo/estoque em tempo real e preserva a sessão e o carrinho ativos.
 */
export async function proceedToWixCheckout(
  items: CartItem[],
  deps?: {
    client?: WixCheckoutClientLike;
    ensureAuth?: () => Promise<unknown>;
    origin?: string;
    onNavigate?: (url: string) => void;
  }
): Promise<ProceedCheckoutResult> {
  const client: WixCheckoutClientLike = deps?.client ?? myWixClient;
  const ensureAuth = deps?.ensureAuth ?? initWixVisitorAuth;
  const adapter = deps?.client
    ? createWixCartAdapter({ client: deps.client, ensureAuth })
    : defaultWixCartAdapter;

  try {
    await ensureAuth();

    if (items.length === 0) {
      throw new CheckoutValidationError('Seu carrinho está vazio.');
    }

    const validatedEntries = await Promise.all(
      items.map(async (item) => {
        const response = await client.products.getProduct(item.productId);
        const { options } = validateProductStockForCartItem(response.product, item);
        return {
          productId: item.productId,
          quantity: Math.max(1, Math.floor(item.quantity)),
          options,
        };
      })
    );

    await adapter.enqueue(async () => {
      const activeCart = await adapter.getCurrentCartSafe();
      if (!cartMatchesExpectedItems(activeCart, validatedEntries)) {
        if (activeCart?.lineItems && activeCart.lineItems.length > 0) {
          try {
            await client.currentCart.deleteCurrentCart();
          } catch (delError) {
            if (!isOwnedCartNotFoundError(delError)) {
              throw delError;
            }
          }
        }
        await client.currentCart.addToCurrentCart({
          lineItems: validatedEntries.map((entry) => ({
            quantity: entry.quantity,
            catalogReference: {
              appId: WIX_STORES_APP_ID,
              catalogItemId: entry.productId,
              ...(entry.options ? { options: entry.options } : {}),
            },
          })),
        });
      }
    });

    const checkoutResponse = await client.currentCart.createCheckoutFromCurrentCart({
      channelType: currentCart.ChannelType.WEB,
    });
    const checkoutId = checkoutResponse.checkoutId;

    if (!checkoutId) {
      throw new CheckoutValidationError(
        'Não foi possível gerar a sessão de checkout na Wix.'
      );
    }

    const origin =
      deps?.origin ??
      (typeof window !== 'undefined' ? window.location.origin : 'https://limiarritual.com');

    const redirectResponse = await client.redirects.createRedirectSession({
      ecomCheckout: { checkoutId },
      callbacks: buildCheckoutCallbacks(origin),
    });

    const fullUrl = redirectResponse.redirectSession?.fullUrl;
    if (!fullUrl || !isAllowedRedirectUrl(fullUrl)) {
      throw new CheckoutValidationError(
        'URL de redirecionamento de checkout inválida ou não retornada pela Wix.'
      );
    }

    if (deps?.onNavigate) {
      deps.onNavigate(fullUrl);
    } else if (typeof window !== 'undefined') {
      window.location.assign(fullUrl);
    }

    return { success: true, redirectUrl: fullUrl };
  } catch (error) {
    if (error instanceof CheckoutValidationError) {
      return { success: false, message: error.message };
    }
    const info = extractWixErrorInfo(error);
    const upper = `${info.code ?? ''} ${info.message}`.toUpperCase();
    console.error('[Wix Checkout] Falha ao iniciar checkout hospedado:', info.code || 'ERROR');

    if (
      upper.includes('OUT_OF_STOCK') ||
      upper.includes('INSUFFICIENT_INVENTORY') ||
      upper.includes('NOT_ENOUGH_STOCK')
    ) {
      return {
        success: false,
        message: 'Um ou mais itens do carrinho ficaram sem estoque suficiente.',
      };
    }

    return {
      success: false,
      message:
        'Não foi possível iniciar o checkout no momento. Confira os itens e tente novamente.',
    };
  }
}
