import type { CartItem } from '../types/commerce';

export const LIMIAR_CHANNELS = {
  email: 'contato@limiarritual.com',
  whatsappNumberDisplay: '+55 (45) 99979-5093',
  whatsappNumberE164: '5545999795093',
  whatsappBaseUrl: 'https://wa.me/5545999795093',
  instagramHandle: '@limiar.ritual',
  instagramUrl: 'https://instagram.com/limiar.ritual',
} as const;

export function buildWhatsAppUrl(message?: string): string {
  if (!message || !message.trim()) {
    return LIMIAR_CHANNELS.whatsappBaseUrl;
  }
  return `${LIMIAR_CHANNELS.whatsappBaseUrl}?text=${encodeURIComponent(message.trim())}`;
}

export function buildContactWhatsAppUrl(customMessage?: string): string {
  const defaultMsg = 'Olá, Limiar! Gostaria de tirar algumas dúvidas.';
  return buildWhatsAppUrl(customMessage?.trim() || defaultMsg);
}

export interface ProductWhatsAppParams {
  productName: string;
  variantLabel?: string;
  quantity?: number;
  productUrl?: string;
}

export function buildProductWhatsAppMessage({
  productName,
  variantLabel,
  quantity,
  productUrl,
}: ProductWhatsAppParams): string {
  const cleanName = productName.trim();
  const cleanVariant = variantLabel?.trim();
  const qtyPrefix = typeof quantity === 'number' && quantity > 1 ? `${quantity}x ` : '';
  const itemDescriptor = cleanVariant
    ? `${qtyPrefix}${cleanName} (${cleanVariant})`
    : `${qtyPrefix}${cleanName}`;
  const baseText = `Olá, Limiar! Tenho interesse nesta peça: ${itemDescriptor}. Gostaria de saber mais sobre ela.`;

  if (productUrl && productUrl.trim()) {
    return `${baseText}\n${productUrl.trim()}`;
  }
  return baseText;
}

export function buildProductWhatsAppUrl(params: ProductWhatsAppParams): string {
  return buildWhatsAppUrl(buildProductWhatsAppMessage(params));
}

export function buildCartWhatsAppMessage(items: CartItem[], formattedSubtotal: string): string {
  if (items.length === 0) {
    return 'Olá, Limiar! Gostaria de realizar um pedido ou tirar dúvidas sobre as peças.';
  }

  const lines = items.map(
    (item) => `• ${item.quantity}x ${item.name} (${item.size} · ${item.colorName})`
  );

  return [
    'Olá, Limiar! Gostaria de concluir um pedido com as seguintes peças:',
    ...lines,
    `Subtotal estimado: ${formattedSubtotal}`,
  ].join('\n');
}

export function buildCartWhatsAppUrl(items: CartItem[], formattedSubtotal: string): string {
  return buildWhatsAppUrl(buildCartWhatsAppMessage(items, formattedSubtotal));
}

export function buildMailtoUrl({
  to = LIMIAR_CHANNELS.email,
  subject,
  body,
}: {
  to?: string;
  subject?: string;
  body?: string;
}): string {
  const params = new URLSearchParams();
  if (subject?.trim()) params.set('subject', subject.trim());
  if (body?.trim()) params.set('body', body.trim());
  const qs = params.toString();
  return qs ? `mailto:${to}?${qs}` : `mailto:${to}`;
}
