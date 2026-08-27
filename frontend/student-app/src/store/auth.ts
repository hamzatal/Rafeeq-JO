import { create } from 'zustand';
import { t, type LoginPayload, type RegisterPayload, type User, type VerifyOtpPayload } from '@rafeeq/shared';
import { createSession, getApiLocale } from '@rafeeq/ui';
import { api, setUnauthorizedHandler } from '../lib/api';
import { tokenStorage } from '../lib/storage';
import { registerForPush, unregisterPush } from '../lib/push';

/**
 * The student session.
 *
 * The token lifecycle — optimistic bootstrap, background validation, sign-out
 * ordering — lives in `createSession` in `@rafeeq/ui`, shared with the captain app
 * because getting that order wrong is subtle and was already got wrong once. What
 * stays here is the STATE shape, which the two apps genuinely do not share: the
 * captain's store also carries a driver profile, a loaded latch and a location
 * broadcast to tear down.
 */
type Status = 'idle' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: User | null;
  status: Status;
  bootstrap: () => Promise<void>;
  register: (payload: RegisterPayload) => Promise<string | null>;
  verifyOtp: (payload: VerifyOtpPayload) => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => {
  const session = createSession({
    api,
    storage: tokenStorage,
    onAuthenticated: (user) => {
      set({ user, status: 'authenticated' });
      /* Push is a side effect: never awaited, never fatal. */
      void registerForPush();
    },
    afterSignOut: async () => {
      await unregisterPush();
      set({ user: null, status: 'unauthenticated' });
    },
  });

  setUnauthorizedHandler(() => {
    void tokenStorage.clear();
    set({ user: null, status: 'unauthenticated' });
  });

  return {
    user: null,
    status: 'idle',

    async bootstrap() {
      set({ status: await session.bootstrap() });
    },

    async register(payload) {
      const result = await api.auth.register(payload);

      return result.otp_debug;
    },

    async verifyOtp(payload) {
      await session.signIn(await api.auth.verifyOtp(payload));
    },

    async login(payload) {
      const result = await api.auth.login(payload);
      if (result.mfa_required) throw new Error(t(getApiLocale(), 'common.mfaRequired'));
      await session.signIn(result);
    },

    async logout() {
      await session.signOut();
    },
  };
});
