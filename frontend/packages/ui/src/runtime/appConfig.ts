import Constants from 'expo-constants';
import type { RafeeqApi } from '@rafeeq/api-client';
import { LEGAL_URLS, type AppConfig, type LegalDocument } from '@rafeeq/shared';

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
    if (cfg?.legal) legal = cfg.legal;
  } catch {
    /* offline or not configured — the fallback above works */
  }
}

/**
 * The legal documents, from the server when we have it and from the build when we
 * do not.
 *
 * ── Why the server is preferred ─────────────────────────────────────────────
 *
 * `config/rafeeq.php` defined `terms.url` and `terms.privacy_url` and read them
 * nowhere, while `packages/shared/src/utils/legal.ts` carried its own copies
 * defaulted from `EXPO_PUBLIC_LEGAL_BASE_URL`. Two sources for the same four links:
 * a staging deploy that changed one and not the other shipped an app whose privacy
 * link pointed at production, and nothing failed.
 *
 * ── Why the fallback stays ──────────────────────────────────────────────────
 *
 * `loadAppConfig` is fire-and-forget by design (a slow config call must not delay
 * the splash), so the first render can happen before the answer arrives. Both app
 * stores require a reachable privacy policy from INSIDE the app, so a link that is
 * momentarily absent is a rejection risk; a link that is momentarily the build-time
 * default is not.
 */
let legal: AppConfig['legal'] | null = null;

export function getLegalUrl(doc: LegalDocument): string {
  if (legal) {
    const fromServer = ({
      terms: legal.terms_url,
      privacy: legal.privacy_url,
      retention: legal.retention_url,
      prohibited: legal.prohibited_url,
    } as const)[doc];

    if (fromServer) return fromServer;
  }

  return LEGAL_URLS[doc];
}

/** The terms version to DISPLAY. What was accepted is stamped server-side. */
export function getTermsVersion(): string | null {
  return legal?.version ?? null;
}
