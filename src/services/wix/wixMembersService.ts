import { getWixIntegrationStatus } from './wixClient';

/**
 * WIX HEADLESS MEMBERS ADAPTER BOUNDARY
 * ---------------------------------------------------------------------------
 * Camada preparada para autenticação real de membros via Wix Headless
 * (@wix/sdk + @wix/members / OAuth Member Authentication).
 *
 * REGRAS DE SEGURANÇA:
 * - Nunca armazene senhas em localStorage/sessionStorage.
 * - Nunca simule sessão autenticada enquanto VITE_WIX_CLIENT_ID e o fluxo OAuth
 *   real da loja não estiverem conectados.
 */

export type AuthProviderResult =
  | { connected: true; ok: true }
  | { connected: false; ok: false }
  | { connected: true; ok: false; message: string };

export function isMemberAuthConnected(): boolean {
  const status = getWixIntegrationStatus();
  return status.configured && status.visitorAuthReady;
}

export async function loginWixMember(_params: {
  email: string;
  password: string;
}): Promise<AuthProviderResult> {
  if (!isMemberAuthConnected()) {
    return { connected: false, ok: false };
  }
  return { connected: false, ok: false };
}

export async function registerWixMember(_params: {
  fullName: string;
  email: string;
  password: string;
}): Promise<AuthProviderResult> {
  if (!isMemberAuthConnected()) {
    return { connected: false, ok: false };
  }
  return { connected: false, ok: false };
}

export async function requestWixPasswordReset(_email: string): Promise<AuthProviderResult> {
  if (!isMemberAuthConnected()) {
    return { connected: false, ok: false };
  }
  return { connected: false, ok: false };
}
