import {
  createClient,
  EMPTY_TOKENS,
  OAuthStrategy,
  TokenRole,
  type TokenStorage,
  type Tokens,
} from '@wix/sdk';
import { products, collections } from '@wix/stores';
import { currentCart } from '@wix/ecom';
import { redirects } from '@wix/redirects';
import { members } from '@wix/members';
import type { WixIntegrationStatus } from '../../types/commerce';

/**
 * WIX HEADLESS CLIENT CONFIGURATION
 * ---------------------------------------------------------------------------
 * Configuração centralizada do Wix Headless SDK utilizando OAuthStrategy oficial
 * com tokenStorage persistente e inicialização protegida por singleton.
 */
export const WIX_CLIENT_ID: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_WIX_CLIENT_ID) ||
  'e0c0f89b-7467-4c6e-aa21-b9a76203c387';

export const WIX_TOKENS_STORAGE_KEY = 'limiar_wix_visitor_tokens';

const ACCESS_TOKEN_LEEWAY_SECONDS = 30;

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function getBrowserStorage(): StorageAdapter | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isValidTokenRole(role: unknown): role is TokenRole {
  return (
    role === TokenRole.NONE ||
    role === TokenRole.VISITOR ||
    role === TokenRole.MEMBER
  );
}

/**
 * Valida e normaliza tokens serializados, retornando EMPTY_TOKENS em qualquer caso inválido.
 */
export function parseStoredTokens(raw: string | null): Tokens {
  if (!raw) return cloneEmptyTokens();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return cloneEmptyTokens();
    }
    const candidate = parsed as Partial<Tokens>;
    const accessValue =
      typeof candidate.accessToken?.value === 'string' ? candidate.accessToken.value : '';
    const accessExpiresAt =
      typeof candidate.accessToken?.expiresAt === 'number' &&
      Number.isFinite(candidate.accessToken.expiresAt)
        ? candidate.accessToken.expiresAt
        : 0;
    const refreshValue =
      typeof candidate.refreshToken?.value === 'string' ? candidate.refreshToken.value : '';
    const refreshRole = isValidTokenRole(candidate.refreshToken?.role)
      ? candidate.refreshToken.role
      : TokenRole.NONE;

    if (!refreshValue && !accessValue) {
      return cloneEmptyTokens();
    }

    return {
      accessToken: {
        value: accessValue,
        expiresAt: accessExpiresAt,
      },
      refreshToken: {
        value: refreshValue,
        role: refreshRole,
      },
    };
  } catch {
    return cloneEmptyTokens();
  }
}

export function cloneEmptyTokens(): Tokens {
  return {
    accessToken: { ...EMPTY_TOKENS.accessToken },
    refreshToken: { ...EMPTY_TOKENS.refreshToken },
  };
}

export function isAccessTokenValid(tokens: Tokens, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  return Boolean(
    tokens.accessToken?.value &&
      typeof tokens.accessToken.expiresAt === 'number' &&
      tokens.accessToken.expiresAt > nowSeconds + ACCESS_TOKEN_LEEWAY_SECONDS
  );
}

export function hasActiveSessionTokens(tokens: Tokens): boolean {
  return Boolean(
    tokens.refreshToken?.value &&
      tokens.refreshToken.role !== TokenRole.NONE
  );
}

export function isMemberSessionTokens(tokens: Tokens): boolean {
  return Boolean(
    tokens.refreshToken?.value &&
      tokens.refreshToken.role === TokenRole.MEMBER
  );
}

/**
 * Cria um TokenStorage compatível com OAuthStrategy do @wix/sdk.
 * Mantém espelho em memória e persiste renovações automáticas no storage.
 */
export function createWixTokenStorage(
  storage: StorageAdapter | null = getBrowserStorage(),
  storageKey: string = WIX_TOKENS_STORAGE_KEY
): TokenStorage & { clearTokens: () => void } {
  let memoryTokens: Tokens = cloneEmptyTokens();
  let hydrated = false;

  const hydrate = (): Tokens => {
    if (hydrated) return memoryTokens;
    hydrated = true;
    if (!storage) return memoryTokens;
    try {
      const raw = storage.getItem(storageKey);
      const parsed = parseStoredTokens(raw);
      if (raw && !parsed.refreshToken.value && !parsed.accessToken.value) {
        storage.removeItem(storageKey);
      }
      memoryTokens = parsed;
    } catch {
      memoryTokens = cloneEmptyTokens();
    }
    return memoryTokens;
  };

  return {
    getTokens(): Tokens {
      return hydrate();
    },
    setTokens(tokens: Tokens): void {
      const normalized = parseStoredTokens(JSON.stringify(tokens));
      memoryTokens = normalized;
      hydrated = true;
      if (!storage) return;
      try {
        if (!normalized.refreshToken.value && !normalized.accessToken.value) {
          storage.removeItem(storageKey);
        } else {
          storage.setItem(storageKey, JSON.stringify(normalized));
        }
      } catch {
        // Ignora indisponibilidade de storage mantendo estado em memória
      }
    },
    clearTokens(): void {
      memoryTokens = cloneEmptyTokens();
      hydrated = true;
      if (!storage) return;
      try {
        storage.removeItem(storageKey);
      } catch {
        // Ignora erro de remoção no storage
      }
    },
  };
}

export const wixTokenStorage = createWixTokenStorage();

/**
 * Instância oficial centralizada do cliente Wix Headless
 */
export const myWixClient = createClient({
  modules: { products, collections, currentCart, redirects, members },
  auth: OAuthStrategy({
    clientId: WIX_CLIENT_ID,
    tokenStorage: wixTokenStorage,
  }),
});

export const wixClient = myWixClient;

export function getWixClient() {
  return myWixClient;
}

export function getWixClientId(): string {
  return WIX_CLIENT_ID;
}

export function saveTokens(tokens: Tokens): void {
  myWixClient.auth.setTokens(tokens);
}

export function clearStoredTokens(): void {
  wixTokenStorage.clearTokens();
}

export interface VisitorAuthClientLike {
  auth: {
    getTokens(): Tokens;
    setTokens(tokens: Tokens): void;
    generateVisitorTokens(tokens?: {
      refreshToken?: Tokens['refreshToken'];
      accessToken?: Tokens['accessToken'];
    }): Promise<Tokens>;
  };
}

const inFlightVisitorInitByClient = new WeakMap<object, Promise<Tokens>>();

/**
 * Garante autenticação OAuth ativa (visitante ou membro existente).
 * Protegido contra chamadas concorrentes por singleton por cliente e preserva
 * sessões de membro quando o accessToken expira e precisa ser renovado.
 */
export async function initWixVisitorAuth(
  client: VisitorAuthClientLike = myWixClient
): Promise<Tokens> {
  const currentTokens = client.auth.getTokens();
  if (hasActiveSessionTokens(currentTokens) && isAccessTokenValid(currentTokens)) {
    return currentTokens;
  }

  const existingPromise = inFlightVisitorInitByClient.get(client);
  if (existingPromise) {
    return existingPromise;
  }

  const initPromise = (async () => {
    try {
      const latest = client.auth.getTokens();
      if (hasActiveSessionTokens(latest) && isAccessTokenValid(latest)) {
        return latest;
      }

      const tokensInput = hasActiveSessionTokens(latest)
        ? { refreshToken: latest.refreshToken }
        : undefined;

      const resolvedTokens = await client.auth.generateVisitorTokens(tokensInput);
      client.auth.setTokens(resolvedTokens);
      return resolvedTokens;
    } catch (error) {
      console.error('[Wix Headless] Falha ao inicializar sessão OAuth:', error);
      throw error;
    } finally {
      inFlightVisitorInitByClient.delete(client);
    }
  })();

  inFlightVisitorInitByClient.set(client, initPromise);
  return initPromise;
}

/**
 * Reinicia a sessão para uma nova identidade anônima de visitante.
 */
export async function resetToVisitorSession(
  client: VisitorAuthClientLike = myWixClient
): Promise<Tokens> {
  inFlightVisitorInitByClient.delete(client);
  client.auth.setTokens(cloneEmptyTokens());
  const visitorTokens = await client.auth.generateVisitorTokens();
  client.auth.setTokens(visitorTokens);
  return visitorTokens;
}

/**
 * Retorna o status de integração atual com o Wix Headless
 */
export function getWixIntegrationStatus(): WixIntegrationStatus {
  const clientId = getWixClientId();
  const currentTokens = myWixClient.auth.getTokens();
  const hasTokens = hasActiveSessionTokens(currentTokens);

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
