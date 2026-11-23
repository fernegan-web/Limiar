import type { WixIntegrationStatus } from '../../types/commerce';

/**
 * WIX HEADLESS ADAPTER BOUNDARY
 * ---------------------------------------------------------------------------
 * Referência oficial:
 * - https://dev.wix.com/docs/go-headless
 * - https://dev.wix.com/docs/go-headless/authentication/visitors/authenticate-visitors-js-sdk
 * - https://dev.wix.com/docs/api-reference/business-solutions/e-commerce/purchase-flow/introduction
 *
 * IMPORTANTE:
 * Nunca armazene API Keys administrativas no frontend.
 * Apenas o Client ID público OAuth (VITE_WIX_CLIENT_ID) deverá ser informado
 * quando a loja Wix for conectada nesta camada.
 *
 * Nesta Fase 01, a conexão real permanece desativada de forma intencional,
 * utilizando o repositório demonstrativo isolado.
 */

export function getWixClientId(): string | undefined {
  try {
    // Suporte seguro para Vite (browser) e Node (testes unitários via tsx)
    const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
    const raw = metaEnv?.VITE_WIX_CLIENT_ID?.trim();
    return raw ? raw : undefined;
  } catch {
    return undefined;
  }
}

export function getWixIntegrationStatus(): WixIntegrationStatus {
  const clientId = getWixClientId();
  const missingEnvKeys: string[] = [];

  if (!clientId) {
    missingEnvKeys.push('VITE_WIX_CLIENT_ID');
  }

  return {
    configured: false, // Ativar na Fase 02 após instalar @wix/sdk, @wix/stores (Catalog V3) e @wix/ecom (Cart V2)
    mode: 'demo-isolated',
    catalogVersion: 'V3',
    cartVersion: 'V2',
    visitorAuthReady: Boolean(clientId),
    checkoutEnabled: false,
    missingEnvKeys,
  };
}
