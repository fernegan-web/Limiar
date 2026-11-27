import test from 'node:test';
import assert from 'node:assert/strict';
import { currentCart } from '@wix/ecom';
import { products } from '@wix/stores';
import type { CartItem } from '../../types/commerce';
import {
  WIX_STORES_APP_ID,
  createWixCartAdapter,
  isOwnedCartNotFoundError,
  mapWixCartErrorMessage,
  mapWixCartToCartItems,
  normalizeWixCartImageUrl,
  type WixCartClientLike,
} from './wixCartAdapter';
import {
  buildCheckoutCallbacks,
  evaluateCheckoutReturn,
  isAllowedRedirectUrl,
  proceedToWixCheckout,
  validateProductStockForCartItem,
  verifyWixCheckoutReturn,
  type WixCheckoutClientLike,
} from './wixCheckoutService';

function sampleCartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    lineId: 'prod-1__var-1',
    wixLineItemId: 'line-1',
    productId: 'prod-1',
    slug: 'camiseta-sigil',
    name: 'Camiseta Sigil',
    image: 'https://static.wixstatic.com/media/abc.jpg',
    price: 189.9,
    size: 'G',
    colorName: 'Preto',
    variantId: 'var-1',
    choices: { Tamanho: 'G', Cor: 'Preto' },
    manageVariants: true,
    quantity: 1,
    inStock: true,
    ...overrides,
  };
}

test('wixCartAdapter treats OWNED_CART_NOT_FOUND gracefully and maps Wix line items cleanly', async () => {
  const notFoundErr = {
    message: 'OWNED_CART_NOT_FOUND: No active current cart found',
    details: { applicationError: { code: 'OWNED_CART_NOT_FOUND' } },
  };
  assert.equal(isOwnedCartNotFoundError(notFoundErr), true);

  const mockClient: WixCartClientLike = {
    currentCart: {
      getCurrentCart: async () => {
        throw notFoundErr;
      },
      addToCurrentCart: async () => ({ cart: null }),
      updateCurrentCartLineItemQuantity: async () => ({ cart: null }),
      removeLineItemsFromCurrentCart: async () => ({ cart: null }),
      deleteCurrentCart: async () => undefined,
    },
  };

  const adapter = createWixCartAdapter({
    client: mockClient,
    ensureAuth: async () => undefined,
  });

  const emptyCart = await adapter.getCurrentCartSafe();
  assert.equal(emptyCart, null);

  assert.equal(
    normalizeWixCartImageUrl('wix:image://v1/deadbeef_123.png/shirt.png#originWidth=800'),
    'https://static.wixstatic.com/media/deadbeef_123.png'
  );

  const mapped = mapWixCartToCartItems({
    lineItems: [
      {
        _id: 'wix-line-99',
        quantity: 2,
        image: 'wix:image://v1/media_99.jpg/tee.jpg',
        url: 'https://checkout.limiarritual.com/product-page/camiseta-sigil',
        productName: { original: 'Camiseta Sigil' },
        price: { amount: '169.90', formattedAmount: 'R$ 169,90' },
        catalogReference: {
          appId: WIX_STORES_APP_ID,
          catalogItemId: 'prod-1',
          options: { variantId: 'var-1' },
        },
        descriptionLines: [
          { name: { original: 'Tamanho' }, plainText: { original: 'G' } },
          { name: { original: 'Cor' }, colorInfo: { original: 'Preto' } },
        ],
      },
    ],
  });

  assert.equal(mapped.length, 1);
  assert.equal(mapped[0].wixLineItemId, 'wix-line-99');
  assert.equal(mapped[0].price, 169.9);
  assert.equal(mapped[0].slug, 'camiseta-sigil');
  assert.equal(mapped[0].image, 'https://static.wixstatic.com/media/media_99.jpg');
  assert.deepEqual(mapped[0].choices, { Tamanho: 'G', Cor: 'Preto' });
});

test('wixCartAdapter serializes concurrent mutations in strict FIFO order and formats PT-BR errors', async () => {
  const events: string[] = [];
  const mockClient: WixCartClientLike = {
    currentCart: {
      getCurrentCart: async () => ({ lineItems: [] }),
      addToCurrentCart: async () => ({ cart: null }),
      updateCurrentCartLineItemQuantity: async () => ({ cart: null }),
      removeLineItemsFromCurrentCart: async () => ({ cart: null }),
      deleteCurrentCart: async () => undefined,
    },
  };

  const adapter = createWixCartAdapter({
    client: mockClient,
    ensureAuth: async () => undefined,
  });

  await Promise.all([
    adapter.enqueue(async () => {
      events.push('start-1');
      await new Promise((r) => setTimeout(r, 15));
      events.push('end-1');
    }),
    adapter.enqueue(async () => {
      events.push('start-2');
      events.push('end-2');
    }),
  ]);

  assert.deepEqual(events, ['start-1', 'end-1', 'start-2', 'end-2']);
  assert.ok(
    mapWixCartErrorMessage({ details: { applicationError: { code: 'OUT_OF_STOCK' } } }).includes(
      'estoque'
    )
  );
  assert.equal(mapWixCartErrorMessage(new Error('raw {"json":true}')).includes('{'), false);
});

test('wixCheckoutService validates stock limits and avoids redundant cart deletion when synced', async () => {
  const outOfStockProduct: products.Product = {
    _id: 'prod-1',
    visible: true,
    manageVariants: true,
    variants: [
      {
        _id: 'var-1',
        variant: { visible: true },
        stock: { inStock: true, trackQuantity: true, quantity: 1 },
      },
    ],
  };

  assert.throws(
    () =>
      validateProductStockForCartItem(outOfStockProduct, sampleCartItem({ quantity: 3 })),
    /Estoque insuficiente/
  );

  let deleteCalls = 0;
  let capturedChannel: currentCart.ChannelTypeWithLiterals | undefined;
  let capturedRedirectUrl = '';

  const matchingWixCart: currentCart.Cart = {
    lineItems: [
      {
        _id: 'line-1',
        quantity: 1,
        catalogReference: {
          appId: WIX_STORES_APP_ID,
          catalogItemId: 'prod-1',
          options: { variantId: 'var-1' },
        },
      },
    ],
  };

  const checkoutClient: WixCheckoutClientLike = {
    products: {
      getProduct: async () => ({
        product: {
          _id: 'prod-1',
          visible: true,
          manageVariants: true,
          variants: [
            {
              _id: 'var-1',
              variant: { visible: true },
              stock: { inStock: true, trackQuantity: true, quantity: 5 },
            },
          ],
        },
      }),
    },
    currentCart: {
      getCurrentCart: async () => matchingWixCart,
      addToCurrentCart: async () => ({ cart: matchingWixCart }),
      updateCurrentCartLineItemQuantity: async () => ({ cart: matchingWixCart }),
      removeLineItemsFromCurrentCart: async () => ({ cart: matchingWixCart }),
      deleteCurrentCart: async () => {
        deleteCalls += 1;
      },
      createCheckoutFromCurrentCart: async (opts) => {
        capturedChannel = opts?.channelType;
        return { checkoutId: 'chk-123' };
      },
    },
    redirects: {
      createRedirectSession: async () => ({
        redirectSession: {
          fullUrl: 'https://checkout.limiarritual.com/checkout/chk-123',
        },
      }),
    },
  };

  const res = await proceedToWixCheckout([sampleCartItem()], {
    client: checkoutClient,
    ensureAuth: async () => undefined,
    origin: 'https://limiarritual.com',
    onNavigate: (url) => {
      capturedRedirectUrl = url;
    },
  });

  assert.equal(res.success, true);
  assert.equal(deleteCalls, 0);
  assert.equal(capturedChannel, currentCart.ChannelType.WEB);
  assert.equal(capturedRedirectUrl, 'https://checkout.limiarritual.com/checkout/chk-123');
  assert.equal(isAllowedRedirectUrl('javascript:alert(1)'), false);
  assert.deepEqual(buildCheckoutCallbacks('https://limiarritual.com/'), {
    thankYouPageUrl: 'https://limiarritual.com/?checkout=retorno',
    postFlowUrl: 'https://limiarritual.com/loja',
    cartPageUrl: 'https://limiarritual.com/loja',
  });
});

test('verifyWixCheckoutReturn never confirms order from URL params while cart still contains items', async () => {
  const stillHasCart = await verifyWixCheckoutReturn('?checkout=retorno&orderId=fake-123', {
    getCart: async () => ({
      lineItems: [{ _id: 'line-1', quantity: 1 }],
    }),
  });
  assert.equal(stillHasCart.handled, true);
  assert.equal(stillHasCart.status, 'returned-incomplete');
  assert.equal(stillHasCart.clearLocalCart, false);

  const clearedByWix = evaluateCheckoutReturn('?checkout=retorno', null);
  assert.equal(clearedByWix.handled, true);
  assert.equal(clearedByWix.status, 'order-recorded');
  assert.equal(clearedByWix.clearLocalCart, true);
  assert.equal(clearedByWix.message.includes('aprovado'), false);

  const ignored = evaluateCheckoutReturn('?categoria=camisetas', null);
  assert.equal(ignored.handled, false);
  assert.equal(ignored.status, 'none');
});
