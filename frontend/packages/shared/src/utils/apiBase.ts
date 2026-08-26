/**
 * Where the app talks to the API.
 *
 * Both apps used to read `extra.apiUrl` out of `app.json`, which was committed as
 * `http://localhost:8000`. A production build therefore shipped pointing at the
 * phone's own loopback — a dead app on every device — and on iOS an `http://` URL
 * also violates App Transport Security, so the store rejects it before a user ever
 * sees the failure.
 *
 * The URL now comes from `EXPO_PUBLIC_API_URL`, which EAS injects per build profile
 * (see `eas.json`), so each profile is pinned to its own environment and none of
 * them is a committed default.
 */

/**
 * True when this bundle was produced by a release build.
 *
 * Read off `globalThis` rather than referencing `__DEV__` directly: the constant is
 * injected by the React Native bundler, but this package is also compiled by the
 * dashboard's Next build where no such global is declared. Going through
 * `globalThis` keeps the shared package independent of any single runtime.
 *
 * Absent means production, which is the safe default — an unknown build type must
 * not be allowed to accept a localhost URL.
 */
function isProductionBundle(): boolean {
  const dev = (globalThis as { __DEV__?: boolean }).__DEV__;

  return dev === undefined ? true : !dev;
}

/**
 * Resolve the API base URL, or throw.
 *
 * Throwing is deliberate. A missing or insecure URL in a release build is not
 * something to paper over with a default — a silent fallback is exactly how
 * `localhost` reached a store submission in the first place. Failing at startup
 * surfaces it in the first smoke test instead of in a review rejection.
 */
export function resolveApiBaseUrl(raw: string | undefined | null): string {
  const url = (raw ?? '').trim().replace(/\/$/, '');

  if (url === '') {
    if (isProductionBundle()) {
      throw new Error(
        'EXPO_PUBLIC_API_URL is not set. A release build must be given its API URL ' +
          'by the EAS build profile — there is deliberately no default, because the ' +
          'previous default was localhost and it shipped.',
      );
    }

    // Development only. The Android emulator reaches the host through 10.0.2.2.
    return 'http://10.0.2.2:8000';
  }

  if (isProductionBundle() && url.startsWith('http://')) {
    throw new Error(
      `Refusing an insecure API URL in a release build: ${url}. iOS App Transport ` +
        'Security blocks plain HTTP, so this would be rejected in review.',
    );
  }

  return url;
}
