import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../lib/api';
import { getCurrentLocation } from '../lib/permissions';

/**
 * Captain availability (Online/Offline).
 *
 * Going online starts a real, best-effort location broadcast to the backend
 * (`POST /driver/location`) every ~15s so the platform knows the captain is
 * active and where they are. Going offline stops it. Everything is guarded so
 * a permission/network failure never crashes the app (Rafeeq resilience policy).
 *
 * The online flag is PERSISTED: if the captain was online and the app is
 * reloaded/refreshed, `restore()` resumes the online state + pinging instead of
 * silently dropping them offline.
 */

const PING_MS = 15000;
const KEY = 'rafeeq_driver_online';

interface AvailabilityState {
  online: boolean;
  restored: boolean;
  lastLat: number | null;
  lastLng: number | null;
  lastPingAt: number | null;
  setOnline: (online: boolean) => Promise<void>;
  restore: () => Promise<void>;
  pingNow: () => Promise<void>;
}

let timer: ReturnType<typeof setInterval> | null = null;

function startPinging(get: () => AvailabilityState) {
  if (timer) clearInterval(timer);
  timer = setInterval(() => void get().pingNow(), PING_MS);
}

export const useAvailability = create<AvailabilityState>((set, get) => ({
  online: false,
  restored: false,
  lastLat: null,
  lastLng: null,
  lastPingAt: null,

  async setOnline(online) {
    set({ online });
    void AsyncStorage.setItem(KEY, online ? '1' : '0');
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    if (online) {
      await get().pingNow();
      startPinging(get);
    }
  },

  /** Restore persisted online state on app start (resumes pinging if online). */
  async restore() {
    if (get().restored) return;
    set({ restored: true });
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw === '1') {
        set({ online: true });
        await get().pingNow();
        startPinging(get);
      }
    } catch {
      // ignore — default offline
    }
  },

  async pingNow() {
    try {
      const loc = await getCurrentLocation();
      if (!loc) return;
      set({ lastLat: loc.lat, lastLng: loc.lng });
      await api.driver.pushLocation(loc.lat, loc.lng);
      set({ lastPingAt: Date.now() });
    } catch {
      // best-effort — never break the UI over a failed ping
    }
  },
}));
