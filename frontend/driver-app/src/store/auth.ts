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

type Status = 'idle' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: User | null;
  driver: DriverProfile | null;
  status: Status;
  bootstrap: () => Promise<void>;
  register: (payload: RegisterPayload) => Promise<string | null>;
  verifyOtp: (payload: VerifyOtpPayload) => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  refreshDriver: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => {
  const apply = async (result: AuthResult) => {
    await tokenStorage.set(result.token);
    set({ user: result.user, status: 'authenticated' });
    await get().refreshDriver();
  };

  setUnauthorizedHandler(() => {
    void tokenStorage.clear();
    set({ user: null, driver: null, status: 'unauthenticated' });
  });

  return {
    user: null,
    driver: null,
    status: 'idle',

    async bootstrap() {
      const token = await tokenStorage.get();
      if (!token) {
        set({ status: 'unauthenticated' });
        return;
      }
      try {
        const user = await api.auth.me();
        set({ user, status: 'authenticated' });
        await get().refreshDriver();
      } catch {
        await tokenStorage.clear();
        set({ user: null, driver: null, status: 'unauthenticated' });
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
      await apply(await api.auth.login(payload));
    },

    async refreshDriver() {
      try {
        const driver = await api.driver.getProfile();
        set({ driver });
      } catch {
        // driver profile may not exist yet; ignore
      }
    },

    async logout() {
      try {
        await api.auth.logout();
      } catch {
        // ignore
      }
      await tokenStorage.clear();
      set({ user: null, driver: null, status: 'unauthenticated' });
    },
  };
});
