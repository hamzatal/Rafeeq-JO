import { create } from 'zustand';
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
 * Kept in-memory (not persisted) so a cold start always begins Offline — the
 * captain explicitly chooses to go online.
 */

const PING_MS = 15000;

interface AvailabilityState {
  online: boolean;
  lastLat: number | null;
  lastLng: number | null;
  lastPingAt: number | null;
  setOnline: (online: boolean) => Promise<void>;
  pingNow: () => Promise<void>;
}

let timer: ReturnType<typeof setInterval> | null = null;

export const useAvailability = create<AvailabilityState>((set, get) => ({
  online: false,
  lastLat: null,
  lastLng: null,
  lastPingAt: null,

  async setOnline(online) {
    set({ online });
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    if (online) {
      await get().pingNow();
      timer = setInterval(() => void get().pingNow(), PING_MS);
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
