import test from 'node:test';
import assert from 'node:assert/strict';
import { LoginState, TokenRole, type OauthData, type Tokens } from '@wix/sdk';
import {
  WIX_OAUTH_DATA_STORAGE_KEY,
  completeWixOAuthCallback,
  mapAuthErrorCode,
  resolveAuthStateMachineForTest,
  sanitizeReturnPath,
  type WixAuthAdapter,
} from './wixMembersService';
import type { StorageAdapter } from './wixClient';

function createMemoryStorage(initial: Record<string, string> = {}): StorageAdapter & {
  store: Map<string, string>;
} {
  const store = new Map<string, string>(Object.entries(initial));
  return {
    store,
    getItem(key) {
      return store.get(key) ?? null;
    },
    setItem(key, value) {
      store.set(key, value);
    },
    removeItem(key) {
      store.delete(key);
    },
  };
}

test('sanitizeReturnPath blocks external URLs, protocol-relative URLs, and javascript schemes', () => {
  const origin = 'https://limiarritual.com';
  assert.equal(sanitizeReturnPath('/loja?categoria=camisetas', origin), '/loja?categoria=camisetas');
  assert.equal(sanitizeReturnPath('https://limiarritual.com/colecoes#topo', origin), '/colecoes#topo');
  assert.equal(sanitizeReturnPath('https://evil.com/phish', origin), '/');
  assert.equal(sanitizeReturnPath('//evil.com/phish', origin), '/');
  assert.equal(sanitizeReturnPath('/\\evil.com', origin), '/');
  assert.equal(sanitizeReturnPath('javascript:alert(1)', origin), '/');
  assert.equal(sanitizeReturnPath('', origin), '/');
});

test('mapAuthErrorCode maps Wix error codes to clear Portuguese messages and captcha flags', () => {
  assert.equal(mapAuthErrorCode('invalidPassword').message, 'A senha informada está incorreta.');
  assert.equal(mapAuthErrorCode('emailAlreadyExists').captchaRequired, false);
  assert.equal(mapAuthErrorCode('missingCaptchaToken').captchaRequired, true);
  assert.equal(mapAuthErrorCode('invalidCaptchaToken').captchaRequired, true);
});

test('resolveAuthStateMachineForTest handles SUCCESS, EMAIL_VERIFICATION_REQUIRED, OWNER_APPROVAL_REQUIRED, and CAPTCHA states', async () => {
  const tokenBox: { current: Tokens | null } = { current: null };
  const mockTokens: Tokens = {
    accessToken: { value: 'member-access', expiresAt: 9999999999 },
    refreshToken: { value: 'member-refresh', role: TokenRole.MEMBER },
  };

  const mockAdapter = {
    getMemberTokensForDirectLogin: async (sessionToken: string) => {
      assert.equal(sessionToken, 'session-abc');
      return mockTokens;
    },
    setTokens: (t: Tokens) => {
      tokenBox.current = t;
    },
  } as unknown as WixAuthAdapter;

  const success = await resolveAuthStateMachineForTest(
    { loginState: LoginState.SUCCESS, data: { sessionToken: 'session-abc' } },
    mockAdapter,
    async () => ({ id: 'm1', name: 'Aline', email: 'aline@limiarritual.com', addresses: [] })
  );
  assert.equal(success.ok, true);
  assert.equal(tokenBox.current?.refreshToken.role, TokenRole.MEMBER);

  const verify = await resolveAuthStateMachineForTest(
    { loginState: LoginState.EMAIL_VERIFICATION_REQUIRED, data: { stateToken: 'st-1' } },
    mockAdapter,
    async () => null
  );
  assert.equal(verify.ok, false);
  assert.equal(verify.status, 'email_verification_required');

  const approval = await resolveAuthStateMachineForTest(
    { loginState: LoginState.OWNER_APPROVAL_REQUIRED },
    mockAdapter,
    async () => null
  );
  assert.equal(approval.ok, false);
  assert.equal(approval.status, 'owner_approval_required');

  const captcha = await resolveAuthStateMachineForTest(
    { loginState: LoginState.USER_CAPTCHA_REQUIRED, data: { stateToken: 'cap-1' } },
    mockAdapter,
    async () => null
  );
  assert.equal(captcha.ok, false);
  assert.equal(captcha.status, 'captcha_required');
});

test('completeWixOAuthCallback exchanges valid code/state and blocks mismatched state or open redirect', async () => {
  const oauthData: OauthData = {
    codeVerifier: 'verifier-123',
    codeChallenge: 'challenge-123',
    state: 'expected-state',
    redirectUri: 'https://limiarritual.com/auth/callback',
    originalUri: 'https://evil.com/steal',
  };

  const storage = createMemoryStorage({
    [WIX_OAUTH_DATA_STORAGE_KEY]: JSON.stringify(oauthData),
  });

  const storedBox: { current: Tokens | null } = { current: null };

  const result = await completeWixOAuthCallback({
    url: 'https://limiarritual.com/auth/callback#code=auth-code&state=expected-state',
    origin: 'https://limiarritual.com',
    storage,
    authAdapter: {
      parseFromUrl: () => ({ code: 'auth-code', state: 'expected-state' }),
      getMemberTokens: async (code, state, data) => {
        assert.equal(code, 'auth-code');
        assert.equal(state, 'expected-state');
        assert.equal(data.codeVerifier, 'verifier-123');
        return {
          accessToken: { value: 'mem-access', expiresAt: 9999999999 },
          refreshToken: { value: 'mem-refresh', role: TokenRole.MEMBER },
        };
      },
      setTokens: (tokens) => {
        storedBox.current = tokens;
      },
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.returnPath, '/');
  assert.equal(storedBox.current?.refreshToken.role, TokenRole.MEMBER);
  assert.equal(storage.store.has(WIX_OAUTH_DATA_STORAGE_KEY), false);

  // State mismatch rejection
  const storageMismatch = createMemoryStorage({
    [WIX_OAUTH_DATA_STORAGE_KEY]: JSON.stringify(oauthData),
  });
  const mismatch = await completeWixOAuthCallback({
    url: 'https://limiarritual.com/auth/callback#code=auth-code&state=tampered',
    origin: 'https://limiarritual.com',
    storage: storageMismatch,
    authAdapter: {
      parseFromUrl: () => ({ code: 'auth-code', state: 'tampered' }),
      getMemberTokens: async () => {
        throw new Error('should not exchange on state mismatch');
      },
      setTokens: () => {},
    },
  });
  assert.equal(mismatch.ok, false);
});
