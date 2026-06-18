import { create } from 'zustand';
import type {
  AuthResult,
  LoginPayload,
  RegisterPayload,
  User,
  VerifyOtpPayload,
} from '@rafeeq/shared';
import { api, setUnauthorizedHandler } from '../lib/api';
import { tokenStorage } from '../lib/storage';

type Status = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

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
  const apply = async (result: AuthResult) => {
    await tokenStorage.set(result.token);
    set({ user: result.user, status: 'authenticated' });
  };

  // Auto sign-out on 401.
  setUnauthorizedHandler(() => {
    void tokenStorage.clear();
    set({ user: null, status: 'unauthenticated' });
  });

  return {
    user: null,
    status: 'idle',

    async bootstrap() {
      const token = await tokenStorage.get();
      if (!token) {
        set({ status: 'unauthenticated' });
        return;
      }
      // Optimistic: trust the stored token so startup is NEVER blocked by the
      // network. Validate the session in the background — a 401 triggers the
      // unauthorized handler (logout); a network error keeps the user in
      // (offline-tolerant) instead of hanging on the splash.
      set({ status: 'authenticated' });
      try {
        const user = await api.auth.me();
        set({ user, status: 'authenticated' });
      } catch {
        /* offline / transient — stay authenticated; 401s are handled separately */
      }
    },

    async register(payload) {
      const result = await api.auth.register(payload);
      return result.otp_debug;
    },

    async verifyOtp(payload) {
      const result = await api.auth.verifyOtp(payload);
      await apply(result);
    },

    async login(payload) {
      const result = await api.auth.login(payload);
      if (result.mfa_required) {
        throw new Error('هذا الحساب يتطلب مصادقة ثنائية — سجّل الدخول عبر لوحة الإدارة');
      }
      await apply(result);
    },

    async logout() {
      try {
        await api.auth.logout();
      } catch {
        // ignore network errors on logout
      }
      await tokenStorage.clear();
      set({ user: null, status: 'unauthenticated' });
    },
  };
});
