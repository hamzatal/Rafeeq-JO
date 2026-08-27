import { describe, expect, it, vi } from 'vitest';
import type { RafeeqApi } from '@rafeeq/api-client';
import type { AuthResult, User } from '@rafeeq/shared';
import { createSession } from './session';
import type { TokenStorage } from './storage';

const USER = { id: 'u1', full_name: 'حمزة' } as unknown as User;
const RESULT = { token: 'tok', user: USER } as unknown as AuthResult;

function fakeStorage(initial: string | null = null) {
  let value = initial;
  const calls: string[] = [];

  const storage: TokenStorage = {
    async get() {
      calls.push('get');

      return value;
    },
    async set(t) {
      calls.push('set');
      value = t;
    },
    async clear() {
      calls.push('clear');
      value = null;
    },
  };

  return { storage, calls, current: () => value };
}

function fakeApi(overrides: Partial<{ me: () => Promise<User>; logout: () => Promise<void> }> = {}) {
  const calls: string[] = [];

  const api = {
    auth: {
      async me() {
        calls.push('me');

        return overrides.me ? overrides.me() : USER;
      },
      async logout() {
        calls.push('logout');
        if (overrides.logout) await overrides.logout();
      },
    },
  } as unknown as RafeeqApi;

  return { api, calls };
}

describe('createSession — bootstrap', () => {
  it('reports unauthenticated when there is no token, without calling the API', () => {
    const { storage } = fakeStorage(null);
    const { api, calls } = fakeApi();
    const session = createSession({ api, storage, onAuthenticated: () => {} });

    return session.bootstrap().then((status) => {
      expect(status).toBe('unauthenticated');
      expect(calls).toEqual([]);
    });
  });

  /*
   * The point of the whole design: startup must NEVER block on the network.
   *
   * A stored token is trusted immediately and validated afterwards. Awaiting
   * `me()` first would hang the splash screen on a bad connection — for a student
   * standing at a bus stop that is the app being broken.
   */
  it('trusts a stored token immediately, before validating it', async () => {
    const { storage } = fakeStorage('tok');
    let resolveMe: (u: User) => void = () => {};
    const { api } = fakeApi({ me: () => new Promise<User>((r) => { resolveMe = r; }) });

    const seen: User[] = [];
    const session = createSession({ api, storage, onAuthenticated: (u) => void seen.push(u) });

    /* Resolves while `me()` is still in flight. */
    await expect(session.bootstrap()).resolves.toBe('authenticated');
    expect(seen).toEqual([]);

    resolveMe(USER);
    await new Promise((r) => setTimeout(r, 0));
    expect(seen).toEqual([USER]);
  });

  /*
   * Offline is not a reason to sign someone out. A 401 is, and that path belongs to
   * the client's interceptor — not here.
   */
  it('stays signed in when validation fails', async () => {
    const { storage } = fakeStorage('tok');
    const { api } = fakeApi({ me: () => Promise.reject(new Error('offline')) });
    const onAuthenticated = vi.fn();

    await expect(createSession({ api, storage, onAuthenticated }).bootstrap()).resolves.toBe('authenticated');
    await new Promise((r) => setTimeout(r, 0));

    expect(onAuthenticated).not.toHaveBeenCalled();
    expect(storage.get()).resolves.toBe('tok');
  });
});

describe('createSession — signIn', () => {
  it('stores the token before announcing the user', async () => {
    const { storage, calls } = fakeStorage();
    const { api } = fakeApi();
    const order: string[] = [];

    await createSession({
      api,
      storage,
      onAuthenticated: () => void order.push('announced'),
    }).signIn(RESULT);

    expect(calls).toContain('set');
    /*
     * Order matters: `onAuthenticated` triggers requests (push registration, the
     * driver profile) and those need the token already readable.
     */
    expect(order).toEqual(['announced']);
    await expect(storage.get()).resolves.toBe('tok');
  });
});

describe('createSession — signOut', () => {
  /* ═══════════════════════════════════════════════════════════════════════════
     A comment in the captain's store earned the hard way, now enforced.

     The availability store pings the server with the captain's position on a timer.
     Clearing the token FIRST means the next ping fires unauthenticated, the client
     interceptor sees 401 and calls the sign-out handler while sign-out is already
     running. `teardown` has to come before `clear`.
     ═══════════════════════════════════════════════════════════════════════════ */
  it('tears down before clearing the token', async () => {
    const order: string[] = [];
    const { storage } = fakeStorage('tok');
    const wrapped: TokenStorage = { ...storage, clear: async () => { order.push('clear'); await storage.clear(); } };
    const { api } = fakeApi({ logout: async () => void order.push('logout') });

    await createSession({
      api,
      storage: wrapped,
      onAuthenticated: () => {},
      teardown: () => void order.push('teardown'),
      afterSignOut: () => void order.push('after'),
    }).signOut();

    expect(order).toEqual(['teardown', 'logout', 'clear', 'after']);
  });

  /* The token is being discarded either way; a failed logout must not strand it. */
  it('clears the token even when the logout request fails', async () => {
    const { storage } = fakeStorage('tok');
    const { api } = fakeApi({ logout: () => Promise.reject(new Error('offline')) });

    await createSession({ api, storage, onAuthenticated: () => {} }).signOut();

    await expect(storage.get()).resolves.toBeNull();
  });

  it('runs afterSignOut last, so state resets once the token is gone', async () => {
    const { storage } = fakeStorage('tok');
    const { api } = fakeApi();
    let tokenWhenReset: string | null = 'unset';

    await createSession({
      api,
      storage,
      onAuthenticated: () => {},
      afterSignOut: async () => {
        tokenWhenReset = await storage.get();
      },
    }).signOut();

    expect(tokenWhenReset).toBeNull();
  });
});
