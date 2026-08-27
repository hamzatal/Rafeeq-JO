import { create } from 'zustand';
import {
  t,
  type DriverProfile,
  type LoginPayload,
  type RegisterPayload,
  type User,
  type VerifyOtpPayload,
} from '@rafeeq/shared';
import { createSession, getApiLocale } from '@rafeeq/ui';
import { api, setUnauthorizedHandler } from '../lib/api';
import { tokenStorage } from '../lib/storage';
import { useAvailability } from './availability';
import { registerForPush, unregisterPush } from '../lib/push';

/**
 * The captain session.
 *
 * The token lifecycle is `createSession` from `@rafeeq/ui`, shared with the student
 * app. What is genuinely captain-only stays here: the driver profile, the
 * `driverLoaded` latch, the `becomeDriver()` capability call, and stopping the
 * location broadcast before the token goes away.
 */
type Status = 'idle' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: User | null;
  driver: DriverProfile | null;
  /**
   * True once the profile has been fetched at least once — success OR
   * confirmed-absent. Without it the UI flashes "upload your documents" for a
   * moment on every launch of an already-approved captain.
   */
  driverLoaded: boolean;
  status: Status;
  bootstrap: () => Promise<void>;
  register: (payload: RegisterPayload) => Promise<string | null>;
  verifyOtp: (payload: VerifyOtpPayload) => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  refreshDriver: () => Promise<void>;
  logout: () => Promise<void>;
}

/*
 * A request sequence, to stop a stale profile from overwriting a fresh one.
 *
 * `refreshDriver()` is called from four screens plus twice inside this store, and
 * several of those fire in quick succession: `documents.tsx` calls it right after an
 * upload, and navigating to the dashboard calls it again. Two in-flight requests
 * resolve in whatever order the network decides, and the LOSER used to win —
 * `set({ driver })` unconditionally, so a pre-upload profile could land after the
 * post-upload one and the screen would show the document as still missing.
 *
 * A counter outside the store: it must survive re-renders and it is not UI state.
 */
let refreshSeq = 0;

export const useAuth = create<AuthState>((set, get) => {
  const reset = () => set({ user: null, driver: null, driverLoaded: false, status: 'unauthenticated' });

  const session = createSession({
    api,
    storage: tokenStorage,
    onAuthenticated: async (user) => {
      set({ user, status: 'authenticated' });

      /*
       * One phone can be a student and a captain. This grants the captain
       * capability if the account does not have it yet — idempotent, and non-fatal
       * because an existing captain simply gets a rejection.
       */
      try {
        set({ user: await api.auth.becomeDriver() });
      } catch {
        /* already a captain, or transient — `refreshDriver` below still resolves */
      }

      await get().refreshDriver();
      void registerForPush();
    },
    teardown: async () => {
      /*
       * BEFORE the token is cleared.
       *
       * The availability store pings the server with the captain's position on a
       * timer. Clearing the token first means the next ping fires unauthenticated,
       * the client's interceptor sees 401 and calls the sign-out handler while
       * sign-out is already running.
       */
      await useAvailability.getState().reset();
    },
    afterSignOut: async () => {
      await unregisterPush();
      reset();
    },
  });

  setUnauthorizedHandler(() => {
    void tokenStorage.clear();
    reset();
  });

  return {
    user: null,
    driver: null,
    driverLoaded: false,
    status: 'idle',

    async bootstrap() {
      set({ status: await session.bootstrap() });
    },

    async register(payload) {
      const result = await api.auth.register({ ...payload, type: 'driver' });

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

    async refreshDriver() {
      const seq = ++refreshSeq;
      try {
        const driver = await api.driver.getProfile();
        /* A later call has already answered — this response is stale. */
        if (seq !== refreshSeq) return;
        set({ driver, driverLoaded: true });
      } catch {
        if (seq !== refreshSeq) return;
        /* The profile may genuinely not exist yet. Latch anyway so the UI resolves. */
        set({ driverLoaded: true });
      }
    },

    async logout() {
      await session.signOut();
    },
  };
});
