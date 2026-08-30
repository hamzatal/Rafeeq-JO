/**
 * Where the legal documents live.
 *
 * Both apps had these buttons wired to the wrong screen: the student app sent
 * "privacy" and "terms" to the support page, and the captain app sent both to the
 * CHAT screen. So the app claimed to offer the documents and delivered neither.
 *
 * That is a store rejection on its own — Apple and Google both require a reachable
 * privacy policy from inside the app — and under PDPL a notice the user cannot read
 * is not a notice.
 *
 * ── Why these are now a FALLBACK rather than the source ─────────────────────
 *
 * `config/rafeeq.php` also defined `terms.url` and `terms.privacy_url` — and read
 * them nowhere. Two sources for the same four links means a staging deployment that
 * changes one and not the other ships an app whose privacy link points at
 * production, and nothing fails.
 *
 * `GET /v1/config` now serves them (every app already calls it at start-up for the
 * maps key), and `getLegalUrl()` in `@rafeeq/ui` prefers that answer. These values
 * stay as the compile-time default because a failed config fetch must degrade to a
 * working link, not to none.
 */

const BASE = (process.env.EXPO_PUBLIC_LEGAL_BASE_URL ?? 'https://rafeeq.jo/legal').replace(/\/$/, '');

export const LEGAL_URLS = {
  privacy: `${BASE}/privacy`,
  terms: `${BASE}/terms`,
  retention: `${BASE}/data-retention`,
  prohibited: `${BASE}/prohibited-items`,
} as const;

export type LegalDocument = keyof typeof LEGAL_URLS;

/*
 * ── What was deleted here ──────────────────────────────────────────────────
 *
 * `export const TERMS_VERSION = process.env.EXPO_PUBLIC_TERMS_VERSION ?? '2026-08-26'`,
 * with a docblock saying it was "sent with registration so the server records WHICH
 * version was accepted".
 *
 * It was not sent, and it must not be. `AuthService::register` stamps `terms_version`
 * from `config('rafeeq.legal.version')` on the server, which is the only way the
 * record is worth anything — a client that names its own accepted version can claim
 * to have agreed to a document that was never current.
 *
 * So this was a second default for a number that already had one, in a place that
 * could silently disagree with it, exported and never read. The version the app needs
 * to DISPLAY now comes from `GET /v1/config`.
 */
