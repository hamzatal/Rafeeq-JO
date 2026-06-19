import Constants from 'expo-constants';
import { api } from './api';

/**
 * Runtime app config fetched from the backend (GET /v1/config). Centralises the
 * Google Maps key so it lives in ONE place (backend .env) instead of every app
 * build. Falls back to app.json `expo.extra.mapsKey`, then to empty (→ OSM map).
 */
let mapsKey: string =
  (Constants.expoConfig?.extra as { mapsKey?: string } | undefined)?.mapsKey || '';
let mapsProvider = 'google';

export function getMapsKey(): string {
  return mapsKey;
}

export function getMapsProvider(): string {
  return mapsProvider;
}

/** Load public config at startup. Never throws (keeps fallbacks on failure). */
export async function loadAppConfig(): Promise<void> {
  try {
    const cfg = await api.config.get();
    if (cfg?.maps?.key) mapsKey = cfg.maps.key;
    if (cfg?.maps?.provider) mapsProvider = cfg.maps.provider;
  } catch {
    // Offline / not configured — keep the existing fallback (OSM works fine).
  }
}
