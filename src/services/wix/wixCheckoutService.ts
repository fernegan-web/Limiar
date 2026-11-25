import { myWixClient, initWixVisitorAuth } from './wixClient';

/**
 * Serviço de Checkout utilizando Wix Headless SDK (@wix/ecom + @wix/redirects)
 */
export async function proceedToWixCheckout(): Promise<{ success: boolean; message?: string }> {
  try {
    await initWixVisitorAuth();

    const checkoutResponse: any = await myWixClient.currentCart.createCheckoutFromCurrentCart({});
    const checkoutId = checkoutResponse?.checkout?._id || checkoutResponse?._id;

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
    return { success: false, message: error?.message || 'Falha ao conectar com o checkout Wix.' };
  }
}
