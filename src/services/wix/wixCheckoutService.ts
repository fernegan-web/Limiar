import { myWixClient, initWixVisitorAuth } from './wixClient';
import type { CartItem } from '../../types/commerce';

/**
 * Serviço de Checkout utilizando Wix Headless SDK (@wix/ecom + @wix/redirects)
 */
export async function proceedToWixCheckout(items: CartItem[]): Promise<{ success: boolean; message?: string }> {
  try {
    await initWixVisitorAuth();

    if (!items.length) throw new Error('Seu carrinho está vazio.');
    const lineItems = await Promise.all(items.map(async (item) => {
      const response = await myWixClient.products.getProduct(item.productId);
      const product = response.product;
      if (!product) throw new Error('Produto indisponível.');
      const variant = product.variants?.find(v => v._id === item.variantId);
      if (product.variants?.length && !variant) throw new Error('Selecione novamente a variante do produto.');
      const options = variant ? (product.manageVariants ? { variantId: variant._id } : { options: variant.choices }) : undefined;
      return { quantity: item.quantity, catalogReference: {
        appId: '215238eb-22a5-4c36-9e7b-e7c08025e04e',
        catalogItemId: item.productId,
        ...(options ? { options } : {}),
      }};
    }));
    // Rebuild from the local selection on each attempt, avoiding duplicate items.
    try {
      await myWixClient.currentCart.deleteCurrentCart();
    } catch (error: any) {
      if (!JSON.stringify(error).includes('OWNED_CART_NOT_FOUND') && !String(error?.message).includes('OWNED_CART_NOT_FOUND') && !String(error?.message).includes('No active current cart')) throw error;
    }
    await myWixClient.currentCart.addToCurrentCart({ lineItems });
    const checkoutResponse: any = await myWixClient.currentCart.createCheckoutFromCurrentCart({ channelType: 'WEB' as any });
    const checkoutId = checkoutResponse?.checkoutId || checkoutResponse?.checkout?._id || checkoutResponse?._id;

    if (!checkoutId) {
      throw new Error('Não foi possível gerar a sessão de checkout na Wix.');
    }

    const redirectResponse: any = await myWixClient.redirects.createRedirectSession({
      ecomCheckout: { checkoutId },
    });

    const fullUrl = redirectResponse?.redirectSession?.fullUrl || redirectResponse?.fullUrl;
    if (fullUrl) {
      window.location.href = fullUrl;
      return { success: true };
    } else {
      throw new Error('URL de redirecionamento de checkout não retornada.');
    }
  } catch (error: any) {
    console.error('[Wix Checkout] Falha ao iniciar checkout hospedado:', error);
    return { success: false, message: 'Não foi possível iniciar o checkout. Confira os produtos e tente novamente.' };
  }
}
