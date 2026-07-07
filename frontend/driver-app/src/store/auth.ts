import { create } from 'zustand';
import type {
  AuthResult,
  DriverProfile,
  LoginPayload,
  RegisterPayload,
  User,
  VerifyOtpPayload,
} from '@rafeeq/shared';
import { api, setUnauthorizedHandler } from '../lib/api';
import { tokenStorage } from '../lib/storage';
import { registerForPush, unregisterPush } from '../lib/push';

type Status = 'idle' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: User | null;
  driver: DriverProfile | null;
  /** True once the driver profile has been fetched at least once (success or
   * confirmed-absent). Used to avoid flashing the "pending / upload documents"
   * UI before an approved captain's profile has loaded. */
  driverLoaded: boolean;
  status: Status;
  bootstrap: () => Promise<void>;
  register: (payload: RegisterPayload) => Promise<string | null>;
  verifyOtp: (payload: VerifyOtpPayload) => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  /** DEV ONLY: enter the app with a mock approved-captain session (no backend). */
  devLogin: () => Promise<void>;
  refreshDriver: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => {
  const apply = async (result: AuthResult) => {
    await tokenStorage.set(result.token);
    set({ user: result.user, status: 'authenticated' });
    // One phone = student + captain: ensure this account has the captain
    // capability (driver role + profile). Idempotent; non-fatal on failure.
    try {
      const user = await api.auth.becomeDriver();
      set({ user });
    } catch {
      /* existing drivers / transient — refreshDriver below still loads state */
    }
    await get().refreshDriver();
    void registerForPush();
  };

  setUnauthorizedHandler(() => {
    void tokenStorage.clear();
    set({ user: null, driver: null, driverLoaded: false, status: 'unauthenticated' });
  });

  return {
    user: null,
    driver: null,
    driverLoaded: false,
    status: 'idle',

    async bootstrap() {
      const token = await tokenStorage.get();
      if (!token) {
        set({ status: 'unauthenticated' });
        return;
      }
      // Optimistic: trust the stored token so startup is never blocked by the
      // network; validate in the background (401 → logout, network error → stay in).
      set({ status: 'authenticated' });
      try {
        const user = await api.auth.me();
        set({ user, status: 'authenticated' });
        await get().refreshDriver();
        void registerForPush();
      } catch {
        /* offline / transient — stay authenticated */
      }
    },

    async register(payload) {
      const result = await api.auth.register({ ...payload, type: 'driver' });
      return result.otp_debug;
    },

    async verifyOtp(payload) {
      await apply(await api.auth.verifyOtp(payload));
    },

    async login(payload) {
      const result = await api.auth.login(payload);
      if (result.mfa_required) {
        throw new Error('هذا الحساب يتطلب مصادقة ثنائية — سجّل الدخول عبر لوحة الإدارة');
      }
      await apply(result);
    },

    async devLogin() {
      // Mock approved-captain session for previewing the UI without a backend.
      await tokenStorage.set('dev-preview-token');
      set({
        user: { id: 'dev-driver', full_name: 'كابتن تجريبي', phone: '0790000000', type: 'driver' } as unknown as User,
        driver: { id: 'dev-driver-profile', status: 'approved' } as unknown as DriverProfile,
        driverLoaded: true,
        status: 'authenticated',
      });
    },

    async refreshDriver() {
      try {
        const driver = await api.driver.getProfile();
        set({ driver, driverLoaded: true });
      } catch {
        // driver profile may not exist yet; mark loaded so the UI can resolve.
        set({ driverLoaded: true });
      }
    },

    async logout() {
      await unregisterPush();
      try {
        await api.auth.logout();
      } catch {
        // ignore
      }
      await tokenStorage.clear();
      set({ user: null, driver: null, driverLoaded: false, status: 'unauthenticated' });
    },
  };
});
