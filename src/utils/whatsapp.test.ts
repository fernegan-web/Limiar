import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LIMIAR_CHANNELS,
  buildCartWhatsAppMessage,
  buildContactWhatsAppUrl,
  buildMailtoUrl,
  buildProductWhatsAppMessage,
  buildProductWhatsAppUrl,
  buildWhatsAppUrl,
} from './whatsapp';

test('buildWhatsAppUrl encodes messages and falls back to base URL cleanly', () => {
  assert.equal(buildWhatsAppUrl(), LIMIAR_CHANNELS.whatsappBaseUrl);
  assert.equal(buildWhatsAppUrl('   '), LIMIAR_CHANNELS.whatsappBaseUrl);

  const contactUrl = buildContactWhatsAppUrl();
  assert.ok(contactUrl.startsWith(`${LIMIAR_CHANNELS.whatsappBaseUrl}?text=`));
  assert.ok(
    decodeURIComponent(contactUrl.split('?text=')[1]).includes(
      'Olá, Limiar! Gostaria de tirar algumas dúvidas.'
    )
  );
});

test('buildProductWhatsAppMessage includes product name, selected variant, and link dynamically', () => {
  const withoutVariant = buildProductWhatsAppMessage({ productName: 'Tribal Tee' });
  assert.equal(
    withoutVariant,
    'Olá, Limiar! Tenho interesse nesta peça: Tribal Tee. Gostaria de saber mais sobre ela.'
  );

  const withVariant = buildProductWhatsAppMessage({
    productName: 'Tribal Tee',
    variantLabel: 'Tam. G · Preto Estonado',
    productUrl: 'https://limiarritual.com/produto/tribal-tee',
  });
  assert.ok(withVariant.includes('Tribal Tee (Tam. G · Preto Estonado)'));
  assert.ok(withVariant.includes('https://limiarritual.com/produto/tribal-tee'));

  const withQtyOne = buildProductWhatsAppMessage({
    productName: 'Tribal Tee',
    variantLabel: 'Tam. G',
    quantity: 1,
  });
  assert.ok(withQtyOne.includes('Tribal Tee (Tam. G)'));
  assert.equal(withQtyOne.includes('1x '), false);

  const withQtyThree = buildProductWhatsAppMessage({
    productName: 'Tribal Tee',
    variantLabel: 'Tam. G',
    quantity: 3,
  });
  assert.ok(withQtyThree.includes('3x Tribal Tee (Tam. G)'));

  const encoded = buildProductWhatsAppUrl({
    productName: 'Void Hoodie',
    variantLabel: 'Tam. M',
  });
  assert.ok(encoded.includes('Void%20Hoodie'));
});

test('buildCartWhatsAppMessage and buildMailtoUrl format clean strings', () => {
  const cartMsg = buildCartWhatsAppMessage(
    [
      {
        lineId: '1',
        productId: 'p1',
        slug: 'tribal-tee',
        name: 'Tribal Tee',
        image: '/img.jpg',
        price: 129.9,
        size: 'M',
        colorName: 'Preto Estonado',
        variantId: 'v1',
        quantity: 2,
      },
    ],
    'R$ 259,80'
  );
  assert.ok(cartMsg.includes('2x Tribal Tee (M · Preto Estonado)'));
  assert.ok(cartMsg.includes('R$ 259,80'));

  const mailUrl = buildMailtoUrl({ subject: 'Dúvida', body: 'Olá' });
  assert.ok(mailUrl.startsWith('mailto:contato@limiarritual.com?'));
});
