import { createClient, OAuthStrategy, type Tokens } from '@wix/sdk';
import { products, collections } from '@wix/stores';
import { currentCart } from '@wix/ecom';
import { redirects } from '@wix/redirects';
import { members } from '@wix/members';
import type { WixIntegrationStatus } from '../../types/commerce';

/**
 * WIX HEADLESS CLIENT CONFIGURATION
 * ---------------------------------------------------------------------------
 * Configuração centralizada do Wix Headless SDK utilizando OAuthStrategy oficial.
 *
 * Utiliza VITE_WIX_CLIENT_ID com fallback para o Client ID da Limiar:
 * 'e0c0f89b-7467-4c6e-aa21-b9a76203c387'
 */
export const WIX_CLIENT_ID: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_WIX_CLIENT_ID) ||
  'e0c0f89b-7467-4c6e-aa21-b9a76203c387';

const TOKENS_STORAGE_KEY = 'limiar_wix_visitor_tokens';

/**
 * Recupera tokens salvos do localStorage para preservar sessões de visitantes
 */
function getStoredTokens(): Tokens | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = window.localStorage.getItem(TOKENS_STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    if (parsed && (parsed.refreshToken?.value || parsed.accessToken?.value)) {
      return parsed as Tokens;
    }
  } catch (err) {
    console.warn('[Wix Headless] Erro ao ler tokens do storage:', err);
  }
  return undefined;
}

/**
 * Salva tokens de sessão no localStorage
 */
export function saveTokens(tokens: Tokens): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TOKENS_STORAGE_KEY, JSON.stringify(tokens));
  } catch (err) {
    console.warn('[Wix Headless] Erro ao persistir tokens no storage:', err);
  }
}

/**
 * Instância oficial centralizada do cliente Wix Headless
 */
export const myWixClient = createClient({
  modules: { products, collections, currentCart, redirects, members },
  auth: OAuthStrategy({
    clientId: WIX_CLIENT_ID,
    tokens: getStoredTokens(),
  }),
});

// Alias export para conveniência
export const wixClient = myWixClient;

export function getWixClient() {
  return myWixClient;
}

export function getWixClientId(): string {
  return WIX_CLIENT_ID;
}

/**
 * Autenticação de visitante utilizando o SDK oficial do Wix Headless.
 * Gera e armazena tokens de visitante caso ainda não existam.
 */
export async function initWixVisitorAuth(client = myWixClient): Promise<Tokens> {
  const currentTokens = client.auth.getTokens();
  if (currentTokens?.refreshToken?.value && currentTokens.refreshToken.role !== 'none') {
    return currentTokens;
  }

  try {
    const visitorTokens = await client.auth.generateVisitorTokens();
    client.auth.setTokens(visitorTokens);
    saveTokens(visitorTokens);
    return visitorTokens;
  } catch (error) {
    console.error('[Wix Headless] Falha ao autenticar visitante via OAuth:', error);
    throw error;
  }
}

/**
 * Retorna o status de integração atual com o Wix Headless
 */
export function getWixIntegrationStatus(): WixIntegrationStatus {
  const clientId = getWixClientId();
  const currentTokens = myWixClient.auth.getTokens();
  const hasTokens = Boolean(currentTokens?.refreshToken?.value);

  return {
    configured: Boolean(clientId),
    mode: 'wix-headless',
    catalogVersion: 'V3',
    cartVersion: 'V2',
    visitorAuthReady: hasTokens || Boolean(clientId),
    checkoutEnabled: true,
    missingEnvKeys: [],
  };
}
