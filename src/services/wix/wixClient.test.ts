import test from 'node:test';
import assert from 'node:assert/strict';
import { TokenRole, type Tokens } from '@wix/sdk';
import {
  createWixTokenStorage,
  initWixVisitorAuth,
  isAccessTokenValid,
  parseStoredTokens,
  resetToVisitorSession,
  type StorageAdapter,
  type VisitorAuthClientLike,
} from './wixClient';

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

function makeTokens(overrides?: {
  accessValue?: string;
  expiresAt?: number;
  refreshValue?: string;
  role?: TokenRole;
}): Tokens {
  return {
    accessToken: {
      value: overrides?.accessValue ?? 'access-123',
      expiresAt: overrides?.expiresAt ?? Math.floor(Date.now() / 1000) + 3600,
    },
    refreshToken: {
      value: overrides?.refreshValue ?? 'refresh-123',
      role: overrides?.role ?? TokenRole.VISITOR,
    },
  };
}

test('createWixTokenStorage handles corrupt JSON, persists updates, and clears cleanly', () => {
  const storage = createMemoryStorage({
    test_tokens: '{corrupt-json',
  });

  const tokenStorage = createWixTokenStorage(storage, 'test_tokens');
  const initial = tokenStorage.getTokens();
  assert.equal(initial.accessToken.value, '');
  assert.equal(initial.refreshToken.value, '');
  assert.equal(initial.refreshToken.role, TokenRole.NONE);
  assert.equal(storage.store.has('test_tokens'), false);

  const memberTokens = makeTokens({
    accessValue: 'member-access',
    refreshValue: 'member-refresh',
    role: TokenRole.MEMBER,
  });
  tokenStorage.setTokens(memberTokens);

  const rehydrated = createWixTokenStorage(storage, 'test_tokens').getTokens();
  assert.equal(rehydrated.accessToken.value, 'member-access');
  assert.equal(rehydrated.refreshToken.value, 'member-refresh');
  assert.equal(rehydrated.refreshToken.role, TokenRole.MEMBER);

  tokenStorage.clearTokens();
  assert.equal(storage.store.has('test_tokens'), false);
  assert.equal(tokenStorage.getTokens().refreshToken.role, TokenRole.NONE);
});

test('parseStoredTokens rejects invalid shapes without throwing', () => {
  const parsed = parseStoredTokens(JSON.stringify({ accessToken: 42, refreshToken: null }));
  assert.equal(parsed.accessToken.value, '');
  assert.equal(parsed.refreshToken.role, TokenRole.NONE);
});

test('isAccessTokenValid respects 30s expiration buffer', () => {
  const now = 1_700_000_000;
  assert.equal(
    isAccessTokenValid(makeTokens({ expiresAt: now + 120 }), now),
    true
  );
  assert.equal(
    isAccessTokenValid(makeTokens({ expiresAt: now + 15 }), now),
    false
  );
});

test('initWixVisitorAuth deduplicates concurrent initialization calls on same client', async () => {
  let currentTokens = parseStoredTokens(null);
  let calls = 0;

  const client: VisitorAuthClientLike = {
    auth: {
      getTokens: () => currentTokens,
      setTokens: (tokens) => {
        currentTokens = tokens;
      },
      generateVisitorTokens: async () => {
        calls += 1;
        await new Promise((resolve) => setTimeout(resolve, 15));
        return makeTokens({
          accessValue: `visitor-access-${calls}`,
          refreshValue: `visitor-refresh-${calls}`,
          role: TokenRole.VISITOR,
        });
      },
    },
  };

  const [t1, t2, t3] = await Promise.all([
    initWixVisitorAuth(client),
    initWixVisitorAuth(client),
    initWixVisitorAuth(client),
  ]);

  assert.equal(calls, 1);
  assert.equal(t1.accessToken.value, 'visitor-access-1');
  assert.equal(t2.accessToken.value, 'visitor-access-1');
  assert.equal(t3.accessToken.value, 'visitor-access-1');
});

test('initWixVisitorAuth preserves existing member refreshToken when accessToken is expired', async () => {
  let currentTokens = makeTokens({
    accessValue: 'expired-member-access',
    expiresAt: Math.floor(Date.now() / 1000) - 60,
    refreshValue: 'member-refresh-xyz',
    role: TokenRole.MEMBER,
  });

  let receivedRefreshArg: Tokens['refreshToken'] | undefined;

  const client: VisitorAuthClientLike = {
    auth: {
      getTokens: () => currentTokens,
      setTokens: (tokens) => {
        currentTokens = tokens;
      },
      generateVisitorTokens: async (arg) => {
        receivedRefreshArg = arg?.refreshToken;
        return makeTokens({
          accessValue: 'renewed-member-access',
          refreshValue: 'member-refresh-xyz',
          role: TokenRole.MEMBER,
        });
      },
    },
  };

  const resolved = await initWixVisitorAuth(client);
  assert.equal(receivedRefreshArg?.value, 'member-refresh-xyz');
  assert.equal(receivedRefreshArg?.role, TokenRole.MEMBER);
  assert.equal(resolved.refreshToken.role, TokenRole.MEMBER);
  assert.equal(resolved.accessToken.value, 'renewed-member-access');
});

test('resetToVisitorSession replaces member session with fresh anonymous visitor tokens', async () => {
  let currentTokens = makeTokens({
    accessValue: 'member-access',
    refreshValue: 'member-refresh',
    role: TokenRole.MEMBER,
  });

  const client: VisitorAuthClientLike = {
    auth: {
      getTokens: () => currentTokens,
      setTokens: (tokens) => {
        currentTokens = tokens;
      },
      generateVisitorTokens: async (arg) => {
        assert.equal(arg, undefined);
        return makeTokens({
          accessValue: 'fresh-visitor-access',
          refreshValue: 'fresh-visitor-refresh',
          role: TokenRole.VISITOR,
        });
      },
    },
  };

  const visitor = await resetToVisitorSession(client);
  assert.equal(visitor.refreshToken.role, TokenRole.VISITOR);
  assert.equal(currentTokens.accessToken.value, 'fresh-visitor-access');
});
