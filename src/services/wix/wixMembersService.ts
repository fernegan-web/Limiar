import { myWixClient, initWixVisitorAuth, saveTokens, getWixIntegrationStatus } from './wixClient';

export type AuthProviderResult =
  | { connected: true; ok: true }
  | { connected: false; ok: false }
  | { connected: true; ok: false; message: string };

export function isMemberAuthConnected(): boolean {
  const status = getWixIntegrationStatus();
  return status.configured && status.visitorAuthReady;
}

export async function loginWixMember(params: {
  email: string;
  password: string;
}): Promise<AuthProviderResult> {
  if (!isMemberAuthConnected()) {
    return { connected: false, ok: false };
  }
  try {
    await initWixVisitorAuth();
    const response: any = await myWixClient.auth.login({
      email: params.email,
      password: params.password,
    });
    if (response?.tokens || response?.sessionToken || response?.accessToken) {
      const tokens = response.tokens || response;
      myWixClient.auth.setTokens(tokens);
      saveTokens(tokens);
      return { connected: true, ok: true };
    }
    return { connected: true, ok: false, message: 'Credenciais inválidas.' };
  } catch (error: any) {
    console.error('[Wix Auth] Erro no login:', error);
    return {
      connected: true,
      ok: false,
      message: error?.message || 'E-mail ou senha incorretos.',
    };
  }
}

export async function registerWixMember(params: {
  fullName: string;
  email: string;
  password: string;
}): Promise<AuthProviderResult> {
  if (!isMemberAuthConnected()) {
    return { connected: false, ok: false };
  }
  try {
    await initWixVisitorAuth();
    const response: any = await myWixClient.auth.register({
      email: params.email,
      password: params.password,
      profile: { nickname: params.fullName },
    });
    if (response?.tokens || response?.sessionToken || response?.accessToken) {
      const tokens = response.tokens || response;
      myWixClient.auth.setTokens(tokens);
      saveTokens(tokens);
      return { connected: true, ok: true };
    }
    return { connected: true, ok: false, message: 'Falha ao registrar membro.' };
  } catch (error: any) {
    console.error('[Wix Auth] Erro no registro:', error);
    return {
      connected: true,
      ok: false,
      message: error?.message || 'Este e-mail já pode estar cadastrado.',
    };
  }
}

export async function requestWixPasswordReset(email: string): Promise<AuthProviderResult> {
  if (!isMemberAuthConnected()) {
    return { connected: false, ok: false };
  }
  try {
    await initWixVisitorAuth();
    await (myWixClient.auth as any).sendPasswordResetEmail(email);
    return { connected: true, ok: true };
  } catch (error: any) {
    console.error('[Wix Auth] Erro na recuperação de senha:', error);
    return {
      connected: true,
      ok: false,
      message: error?.message || 'Erro ao enviar e-mail de recuperação.',
    };
  }
}

export async function logoutWixMember(): Promise<void> {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('limiar_wix_visitor_tokens');
    }
  } catch (err) {
    console.error('[Wix Auth] Erro no logout:', err);
  }
}
