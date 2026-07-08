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
import { registerForPush, unregisterPush } from '../lib/push';

type Status = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: User | null;
  status: Status;
  bootstrap: () => Promise<void>;
  register: (payload: RegisterPayload) => Promise<string | null>;
  verifyOtp: (payload: VerifyOtpPayload) => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  /** DEV ONLY: enter the app with a mock session to preview the UI without a backend. */
  devLogin: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => {
  const apply = async (result: AuthResult) => {
    await tokenStorage.set(result.token);
    set({ user: result.user, status: 'authenticated' });
    // Register this device for push (FCM). Non-blocking + never throws.
    void registerForPush();
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
        void registerForPush();
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

    async devLogin() {
      // Mock session for previewing the UI without a running backend.
      await tokenStorage.set('dev-preview-token');
      set({
        user: {
          id: 'dev-user',
          full_name: 'طالب تجريبي',
          phone: '0790000000',
          type: 'student',
        } as unknown as User,
        status: 'authenticated',
      });
    },

    async logout() {
      await unregisterPush();
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
