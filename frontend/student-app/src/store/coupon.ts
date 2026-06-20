import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const KEY = 'rafeeq.activeCoupon';

interface CouponState {
  code: string | null;
  hydrate: () => Promise<void>;
  activate: (code: string) => Promise<void>;
  clear: () => Promise<void>;
}

/** Holds the coupon the student activated from a notification so it can be
 *  pre-filled when requesting a ride. */
export const useCoupon = create<CouponState>((set) => ({
  code: null,
  hydrate: async () => {
    try {
      const v = await AsyncStorage.getItem(KEY);
      if (v) set({ code: v });
    } catch {
      /* ignore */
    }
  },
  activate: async (code: string) => {
    const c = code.trim().toUpperCase();
    set({ code: c });
    try {
      await AsyncStorage.setItem(KEY, c);
    } catch {
      /* ignore */
    }
  },
  clear: async () => {
    set({ code: null });
    try {
      await AsyncStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  },
}));
