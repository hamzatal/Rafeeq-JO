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
 * URLs come from the environment so staging and production can differ, with a
 * production default rather than a placeholder, because a broken legal link is worse
 * than a wrong environment.
 */

const BASE = (process.env.EXPO_PUBLIC_LEGAL_BASE_URL ?? 'https://rafeeq.jo/legal').replace(/\/$/, '');

export const LEGAL_URLS = {
  privacy: `${BASE}/privacy`,
  terms: `${BASE}/terms`,
  retention: `${BASE}/data-retention`,
  prohibited: `${BASE}/prohibited-items`,
} as const;

export type LegalDocument = keyof typeof LEGAL_URLS;

/**
 * The terms version the app was built against.
 *
 * Sent with registration so the server records WHICH version was accepted. Every
 * fare, commission and no-show fee needs a contractual basis, and that basis has to
 * be a specific version — not "they agreed once".
 */
export const TERMS_VERSION = process.env.EXPO_PUBLIC_TERMS_VERSION ?? '2026-08-26';
