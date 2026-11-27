import {
  LoginState,
  type OauthData,
  type StateMachine,
  type Tokens,
} from '@wix/sdk';
import {
  clearStoredTokens,
  getWixIntegrationStatus,
  initWixVisitorAuth,
  isMemberSessionTokens,
  myWixClient,
  resetToVisitorSession,
  type StorageAdapter,
} from './wixClient';

export const WIX_OAUTH_DATA_STORAGE_KEY = 'limiar_wix_oauth_pkce_data';
export const WIX_MEMBER_ORDERS_URL = 'https://checkout.limiarritual.com/account/my-orders';

export interface MemberAddressSummary {
  street?: string;
  city?: string;
  subdivision?: string;
  postalCode?: string;
  country?: string;
}

export interface MemberProfileSummary {
  id: string;
  name: string;
  email: string;
  phone?: string;
  addresses: MemberAddressSummary[];
}

export type WixAuthActionResult =
  | {
      ok: true;
      status: 'authenticated';
      member: MemberProfileSummary | null;
    }
  | {
      ok: false;
      status: 'email_verification_required';
      pendingState: StateMachine;
      message: string;
    }
  | {
      ok: false;
      status: 'owner_approval_required';
      message: string;
    }
  | {
      ok: false;
      status: 'captcha_required';
      message: string;
    }
  | {
      ok: false;
      status: 'failure';
      message: string;
    };

export interface WixOAuthCallbackResult {
  ok: boolean;
  returnPath: string;
  message?: string;
}

export interface WixAuthAdapter {
  getTokens: () => Tokens;
  setTokens: (tokens: Tokens) => void;
  generateOAuthData: (redirectUri: string, originalUri?: string) => OauthData;
  getAuthUrl: (
    oauthData: OauthData,
    opts?: { prompt?: 'login' | 'none'; responseMode?: 'fragment' | 'web_message' | 'query' }
  ) => Promise<{ authUrl: string }>;
  parseFromUrl: (
    url?: string,
    responseMode?: 'query' | 'fragment'
  ) => {
    code: string | null;
    state: string | null;
    error?: string;
    errorDescription?: string;
  };
  getMemberTokens: (code: string, state: string, oauthData: OauthData) => Promise<Tokens>;
  getMemberTokensForDirectLogin: (sessionToken: string) => Promise<Tokens>;
  login: (params: { email: string; password: string }) => Promise<StateMachine>;
  register: (params: {
    email: string;
    password: string;
    profile?: { nickname?: string };
  }) => Promise<StateMachine>;
  processVerification: (
    nextInputs: { verificationCode: string },
    state?: StateMachine
  ) => Promise<StateMachine>;
  sendPasswordResetEmail: (email: string, redirectUri: string) => Promise<void>;
  logout: (originalUrl: string) => Promise<{ logoutUrl: string }>;
}

function getSessionStorageAdapter(): StorageAdapter | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function getWindowOrigin(): string {
  if (typeof window === 'undefined') return 'https://limiarritual.com';
  return window.location.origin;
}

export function isMemberAuthConnected(): boolean {
  const status = getWixIntegrationStatus();
  return status.configured && status.visitorAuthReady;
}

/**
 * Garante que retornos pós-OAuth permaneçam exclusivamente dentro da mesma origem (anti-Open Redirect).
 */
export function sanitizeReturnPath(
  rawPath: string | null | undefined,
  currentOrigin: string = getWindowOrigin()
): string {
  if (!rawPath || typeof rawPath !== 'string') return '/';
  const trimmed = rawPath.trim();
  if (!trimmed) return '/';

  // Bloqueia URLs protocol-relative (//evil.com), backslashes ou esquemas arbitrários (javascript:, data:, etc.)
  if (trimmed.startsWith('/')) {
    if (trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
      return '/';
    }
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed, currentOrigin);
    if (parsed.origin !== currentOrigin) {
      return '/';
    }
    const normalized = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    return normalized.startsWith('/') && !normalized.startsWith('//') ? normalized : '/';
  } catch {
    return '/';
  }
}

export function mapAuthErrorCode(
  errorCode?: string,
  rawMessage?: string
): { captchaRequired: boolean; message: string } {
  switch (errorCode) {
    case 'invalidEmail':
      return {
        captchaRequired: false,
        message: 'E-mail ou senha inválidos. Verifique os dados informados.',
      };
    case 'invalidPassword':
      return {
        captchaRequired: false,
        message: 'A senha informada está incorreta.',
      };
    case 'resetPassword':
      return {
        captchaRequired: false,
        message: 'É necessário redefinir sua senha antes de acessar a conta.',
      };
    case 'emailAlreadyExists':
      return {
        captchaRequired: false,
        message: 'Já existe uma conta cadastrada com este endereço de e-mail.',
      };
    case 'missingCaptchaToken':
    case 'invalidCaptchaToken':
      return {
        captchaRequired: true,
        message: 'Esta verificação exige confirmação adicional no login oficial Limiar.',
      };
    default:
      return {
        captchaRequired: false,
        message:
          rawMessage && !rawMessage.startsWith('{')
            ? 'Não foi possível concluir a autenticação. Tente novamente.'
            : 'Não foi possível concluir a autenticação. Tente novamente.',
      };
  }
}

async function resolveStateMachineResponse(
  state: StateMachine,
  authAdapter: WixAuthAdapter,
  fetchProfile: () => Promise<MemberProfileSummary | null>
): Promise<WixAuthActionResult> {
  if (state.loginState === LoginState.SUCCESS) {
    try {
      const memberTokens = await authAdapter.getMemberTokensForDirectLogin(
        state.data.sessionToken
      );
      authAdapter.setTokens(memberTokens);
      const member = await fetchProfile();
      return {
        ok: true,
        status: 'authenticated',
        member,
      };
    } catch (error) {
      console.warn('[Wix Auth] Falha ao concluir troca direta de sessão:', error);
      return {
        ok: false,
        status: 'captcha_required',
        message:
          'Seu navegador bloqueou a troca direta de sessão. Utilize o botão de login oficial Limiar abaixo.',
      };
    }
  }

  if (state.loginState === LoginState.EMAIL_VERIFICATION_REQUIRED) {
    return {
      ok: false,
      status: 'email_verification_required',
      pendingState: state,
      message:
        'Enviamos um código de verificação para o seu e-mail. Informe o código abaixo para concluir o acesso.',
    };
  }

  if (state.loginState === LoginState.OWNER_APPROVAL_REQUIRED) {
    return {
      ok: false,
      status: 'owner_approval_required',
      message: 'Sua conta foi criada e aguarda aprovação do responsável pela loja.',
    };
  }

  if (
    state.loginState === LoginState.SILENT_CAPTCHA_REQUIRED ||
    state.loginState === LoginState.USER_CAPTCHA_REQUIRED
  ) {
    return {
      ok: false,
      status: 'captcha_required',
      message: 'Por segurança, conclua a verificação pelo login oficial da Limiar.',
    };
  }

  if (state.loginState === LoginState.FAILURE) {
    const mapped = mapAuthErrorCode(state.errorCode, state.error);
    return {
      ok: false,
      status: mapped.captchaRequired ? 'captcha_required' : 'failure',
      message: mapped.message,
    };
  }

  return {
    ok: false,
    status: 'failure',
    message: 'Estado de autenticação inesperado. Tente novamente.',
  };
}

export async function resolveAuthStateMachineForTest(
  state: StateMachine,
  authAdapter: WixAuthAdapter,
  fetchProfile: () => Promise<MemberProfileSummary | null>
): Promise<WixAuthActionResult> {
  return resolveStateMachineResponse(state, authAdapter, fetchProfile);
}

export async function getCurrentWixMember(): Promise<MemberProfileSummary | null> {
  const tokens = myWixClient.auth.getTokens();
  if (!isMemberSessionTokens(tokens)) {
    return null;
  }

  try {
    const response = await myWixClient.members.getCurrentMember({
      fieldsets: ['FULL'],
    });
    const member = response.member;
    if (!member?._id) return null;

    const firstName = member.contact?.firstName?.trim() || '';
    const lastName = member.contact?.lastName?.trim() || '';
    const fullName = `${firstName} ${lastName}`.trim();
    const displayName =
      member.profile?.nickname?.trim() ||
      fullName ||
      member.loginEmail?.split('@')[0] ||
      'Membro Limiar';

    const addresses: MemberAddressSummary[] = (member.contact?.addresses ?? []).map((addr) => ({
      street: addr.addressLine || undefined,
      city: addr.city || undefined,
      subdivision: addr.subdivision || undefined,
      postalCode: addr.postalCode || undefined,
      country: addr.country || undefined,
    }));

    return {
      id: member._id,
      name: displayName,
      email: member.loginEmail || member.contact?.emails?.[0] || '',
      phone: member.contact?.phones?.[0] || undefined,
      addresses,
    };
  } catch (error) {
    console.warn('[Wix Auth] Não foi possível carregar o perfil do membro:', error);
    return null;
  }
}

export async function loginWixMember(params: {
  email: string;
  password: string;
}): Promise<WixAuthActionResult> {
  if (!isMemberAuthConnected()) {
    return {
      ok: false,
      status: 'failure',
      message: 'Serviço de autenticação indisponível no momento.',
    };
  }

  try {
    await initWixVisitorAuth();
    const state = await myWixClient.auth.login({
      email: params.email.trim(),
      password: params.password,
    });
    return await resolveStateMachineResponse(state, myWixClient.auth, getCurrentWixMember);
  } catch (error) {
    console.error('[Wix Auth] Erro no login:', error);
    return {
      ok: false,
      status: 'failure',
      message: 'Não foi possível validar suas credenciais. Tente novamente.',
    };
  }
}

export async function registerWixMember(params: {
  fullName: string;
  email: string;
  password: string;
}): Promise<WixAuthActionResult> {
  if (!isMemberAuthConnected()) {
    return {
      ok: false,
      status: 'failure',
      message: 'Serviço de cadastro indisponível no momento.',
    };
  }

  try {
    await initWixVisitorAuth();
    const state = await myWixClient.auth.register({
      email: params.email.trim(),
      password: params.password,
      profile: { nickname: params.fullName.trim() },
    });
    return await resolveStateMachineResponse(state, myWixClient.auth, getCurrentWixMember);
  } catch (error) {
    console.error('[Wix Auth] Erro no cadastro:', error);
    return {
      ok: false,
      status: 'failure',
      message: 'Não foi possível criar a conta. Verifique os dados ou use o login oficial.',
    };
  }
}

export async function verifyWixMemberCode(params: {
  verificationCode: string;
  pendingState: StateMachine;
}): Promise<WixAuthActionResult> {
  const code = params.verificationCode.trim();
  if (!code) {
    return {
      ok: false,
      status: 'failure',
      message: 'Informe o código de verificação enviado para o seu e-mail.',
    };
  }

  try {
    if (params.pendingState.loginState !== LoginState.EMAIL_VERIFICATION_REQUIRED) {
      return {
        ok: false,
        status: 'failure',
        message: 'A verificação de e-mail expirou. Tente entrar novamente.',
      };
    }

    const nextState = await myWixClient.auth.processVerification(
      { verificationCode: code },
      params.pendingState
    );
    return await resolveStateMachineResponse(nextState, myWixClient.auth, getCurrentWixMember);
  } catch (error) {
    console.error('[Wix Auth] Código de verificação inválido:', error);
    return {
      ok: false,
      status: 'failure',
      message: 'Código de verificação inválido ou expirado.',
    };
  }
}

export async function startWixHostedAuth(params?: {
  returnPath?: string;
  prompt?: 'login' | 'none';
  origin?: string;
  storage?: StorageAdapter | null;
  authAdapter?: Pick<WixAuthAdapter, 'generateOAuthData' | 'getAuthUrl'>;
}): Promise<{ authUrl: string }> {
  const origin = params?.origin ?? getWindowOrigin();
  const storage = params?.storage !== undefined ? params.storage : getSessionStorageAdapter();
  const authAdapter = params?.authAdapter ?? myWixClient.auth;
  const safeReturnPath = sanitizeReturnPath(params?.returnPath, origin);
  const redirectUri = `${origin}/auth/callback`;

  await initWixVisitorAuth();
  const oauthData = authAdapter.generateOAuthData(redirectUri, safeReturnPath);

  if (storage) {
    storage.setItem(WIX_OAUTH_DATA_STORAGE_KEY, JSON.stringify(oauthData));
  }

  const { authUrl } = await authAdapter.getAuthUrl(oauthData, {
    prompt: params?.prompt ?? 'login',
    responseMode: 'fragment',
  });

  if (!authUrl) {
    throw new Error('Wix não retornou URL de autenticação.');
  }

  return { authUrl };
}

function parseStoredOauthData(raw: string | null): OauthData | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const candidate = parsed as Partial<OauthData>;
    if (
      typeof candidate.codeVerifier !== 'string' ||
      typeof candidate.codeChallenge !== 'string' ||
      typeof candidate.state !== 'string' ||
      typeof candidate.redirectUri !== 'string'
    ) {
      return null;
    }
    return {
      codeVerifier: candidate.codeVerifier,
      codeChallenge: candidate.codeChallenge,
      state: candidate.state,
      redirectUri: candidate.redirectUri,
      originalUri: typeof candidate.originalUri === 'string' ? candidate.originalUri : '/',
    };
  } catch {
    return null;
  }
}

export async function completeWixOAuthCallback(params?: {
  url?: string;
  origin?: string;
  storage?: StorageAdapter | null;
  authAdapter?: Pick<WixAuthAdapter, 'parseFromUrl' | 'getMemberTokens' | 'setTokens'>;
}): Promise<WixOAuthCallbackResult> {
  const origin = params?.origin ?? getWindowOrigin();
  const storage = params?.storage !== undefined ? params.storage : getSessionStorageAdapter();
  const authAdapter = params?.authAdapter ?? myWixClient.auth;
  const targetUrl =
    params?.url ?? (typeof window !== 'undefined' ? window.location.href : `${origin}/auth/callback`);

  const storedOauthData = storage
    ? parseStoredOauthData(storage.getItem(WIX_OAUTH_DATA_STORAGE_KEY))
    : null;

  if (storage) {
    storage.removeItem(WIX_OAUTH_DATA_STORAGE_KEY);
  }

  const safeReturnPath = sanitizeReturnPath(storedOauthData?.originalUri, origin);

  try {
    let parsed = authAdapter.parseFromUrl(targetUrl, 'fragment');
    if (!parsed.code && !parsed.error) {
      parsed = authAdapter.parseFromUrl(targetUrl, 'query');
    }

    if (parsed.error) {
      return {
        ok: false,
        returnPath: safeReturnPath,
        message: 'A autenticação foi cancelada ou recusada pelo provedor.',
      };
    }

    if (!storedOauthData) {
      return {
        ok: false,
        returnPath: '/',
        message: 'Sessão de login expirada ou não encontrada neste navegador.',
      };
    }

    if (!parsed.code || !parsed.state || parsed.state !== storedOauthData.state) {
      return {
        ok: false,
        returnPath: safeReturnPath,
        message: 'Falha na validação de segurança (OAuth state inválido).',
      };
    }

    const memberTokens = await authAdapter.getMemberTokens(
      parsed.code,
      parsed.state,
      storedOauthData
    );
    authAdapter.setTokens(memberTokens);

    return {
      ok: true,
      returnPath: safeReturnPath,
    };
  } catch (error) {
    console.error('[Wix Auth] Erro ao concluir callback OAuth:', error);
    return {
      ok: false,
      returnPath: safeReturnPath,
      message: 'Não foi possível concluir seu acesso. Tente novamente.',
    };
  }
}

export async function requestWixPasswordReset(
  email: string
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  if (!isMemberAuthConnected()) {
    return {
      ok: false,
      message: 'Serviço de redefinição de senha indisponível no momento.',
    };
  }
  try {
    await initWixVisitorAuth();
    const redirectUri = `${getWindowOrigin()}/`;
    await myWixClient.auth.sendPasswordResetEmail(email.trim(), redirectUri);
    return {
      ok: true,
      message:
        'Se este e-mail estiver cadastrado, enviaremos as instruções para redefinir sua senha.',
    };
  } catch (error) {
    console.error('[Wix Auth] Erro na recuperação de senha:', error);
    return {
      ok: false,
      message: 'Não foi possível solicitar a redefinição agora. Tente novamente em instantes.',
    };
  }
}

export async function getWixMemberOrdersUrl(): Promise<string> {
  try {
    await initWixVisitorAuth();
    if (
      typeof window !== 'undefined' &&
      !myWixClient.auth.sessions.isSessionSynced()
    ) {
      await myWixClient.auth.sessions.syncToWixPages({});
    }
  } catch {
    // Mesmo sem pré-aquecimento de cookie, o portal oficial da Wix solicita login se necessário
  }
  return WIX_MEMBER_ORDERS_URL;
}

export async function logoutWixMember(): Promise<{ ok: true; logoutUrl?: string }> {
  const origin = getWindowOrigin();
  clearStoredTokens();

  let logoutUrl: string | undefined;
  try {
    const result = await myWixClient.auth.logout(origin);
    logoutUrl = result?.logoutUrl;
  } catch (error) {
    console.warn('[Wix Auth] Erro ao solicitar logout remoto na Wix:', error);
  }

  try {
    await resetToVisitorSession();
  } catch (error) {
    console.warn('[Wix Auth] Não foi possível regenerar sessão de visitante após logout:', error);
  }

  return { ok: true, logoutUrl };
}
