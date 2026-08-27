import Constants from 'expo-constants';
import type { RafeeqApi } from '@rafeeq/api-client';

/**
 * Runtime config fetched from the backend (`GET /v1/config`).
 *
 * Centralises the Google Maps key so it lives in ONE place — the backend `.env` —
 * instead of being baked into every app build. Falls back to `app.json`'s
 * `expo.extra.mapsKey`, then to empty, which makes `LiveMap` draw OpenStreetMap
 * tiles instead of failing.
 */
let mapsKey: string = (Constants.expoConfig?.extra as { mapsKey?: string } | undefined)?.mapsKey || '';
let mapsProvider = 'google';

export function getMapsKey(): string {
  return mapsKey;
}

export function getMapsProvider(): string {
  return mapsProvider;
}

/**
 * Load public config at startup. Never throws.
 *
 * Takes the api as an argument rather than importing an app singleton: the client
 * is constructed per app with that app's token key, so a package-level import
 * would have to guess which one.
 */
export async function loadAppConfig(api: RafeeqApi): Promise<void> {
  try {
    const cfg = await api.config.get();
    if (cfg?.maps?.key) mapsKey = cfg.maps.key;
    if (cfg?.maps?.provider) mapsProvider = cfg.maps.provider;
  } catch {
    /* offline or not configured — the fallback above works */
  }
}
