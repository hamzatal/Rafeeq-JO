import type { RafeeqApi } from '@rafeeq/api-client';
import type { AuthResult, User } from '@rafeeq/shared';
import type { TokenStorage } from './storage';

/* ═══════════════════════════════════════════════════════════════════════════
   SESSION — the token lifecycle, which is the part both apps really share.

   ── Why this is a helper and not a shared store ────────────────────────────

   The two `store/auth.ts` files were 73% similar, and it is tempting to read that
   as "one store with a flag". It is not. The captain's store holds a
   `DriverProfile`, a `driverLoaded` latch, a `becomeDriver()` capability call and a
   location-broadcast teardown; the student's holds none of those. A single store
   covering both would carry four fields that are always null in one app, and every
   screen reading them would need to know which app it is in.

   What IS shared is subtler and more dangerous to get wrong: the order of
   operations around the token. So that is what moved, and each app keeps its own
   store composing it.

   ── The two things this gets right, once ───────────────────────────────────

   **Optimistic bootstrap.** Startup must never block on the network. A stored
   token is TRUSTED immediately and validated in the background: a 401 signs out
   through the interceptor, and a network error leaves the user signed in. The
   alternative — await `getProfile()` before deciding — hangs the splash screen on a
   bad connection, which for a student standing at a bus stop is the app being
   broken.

   **Sign-out order.** The captain's store had a comment earned the hard way: stop
   the location broadcast BEFORE clearing the token, or the in-flight ping fires
   unauthenticated, trips the 401 handler, and re-enters sign-out while sign-out is
   running. `teardown` runs first here for exactly that reason, and it runs for both
   apps so the student app cannot acquire the same bug later.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface SessionOptions {
  api: RafeeqApi;
  storage: TokenStorage;
  /** Side effects after a successful sign-in or a validated bootstrap. */
  onAuthenticated: (user: User) => Promise<void> | void;
  /** Runs BEFORE the token is cleared. Stop anything that makes requests. */
  teardown?: () => Promise<void> | void;
  /** Best-effort push de-registration and anything else after the API logout. */
  afterSignOut?: () => Promise<void> | void;
}

export interface Session {
  /**
   * Resolve the stored token at startup.
   *
   * Returns `'authenticated'` optimistically when a token exists — validation
   * continues in the background and reports through `onAuthenticated`.
   */
  bootstrap(): Promise<'authenticated' | 'unauthenticated'>;
  signIn(result: AuthResult): Promise<void>;
  signOut(): Promise<void>;
}

export function createSession({
  api,
  storage,
  onAuthenticated,
  teardown,
  afterSignOut,
}: SessionOptions): Session {
  return {
    async bootstrap() {
      const token = await storage.get();
      if (!token) return 'unauthenticated';

      /*
       * Fire-and-forget on purpose — the caller has already been told
       * "authenticated". `void` rather than `await` is what keeps startup off the
       * network path; a 401 is handled by the client's interceptor, and anything
       * else means offline, which is not a reason to sign someone out.
       */
      void (async () => {
        try {
          const user = await api.auth.me();
          await onAuthenticated(user);
        } catch {
          /* offline or transient — stay signed in */
        }
      })();

      return 'authenticated';
    },

    async signIn(result: AuthResult) {
      await storage.set(result.token);
      await onAuthenticated(result.user);
    },

    async signOut() {
      /* First, so nothing is mid-request when the token disappears. */
      await teardown?.();

      try {
        await api.auth.logout();
      } catch {
        /* the token is being discarded either way */
      }

      await storage.clear();
      await afterSignOut?.();
    },
  };
}
