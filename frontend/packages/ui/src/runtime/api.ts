import { createRafeeqApi, type RafeeqApi } from '@rafeeq/api-client';
import { resolveApiBaseUrl } from '@rafeeq/shared';
import type { Locale } from '@rafeeq/shared';
import type { TokenStorage } from './storage';
import { reportApiProblem } from './problems';

/*
 * The request locale, in its own tiny module-level slot.
 *
 * `prefs` sets it and `createAppApi` reads it, and putting it here is what breaks
 * the cycle those two would otherwise form (prefs → api → storage → …). It is a
 * mutable module variable rather than state because `Accept-Language` is read
 * once per request, at request time, from outside React.
 */
let currentLocale: Locale = 'ar';

export const setApiLocale = (locale: Locale): void => {
  currentLocale = locale;
};

export const getApiLocale = (): Locale => currentLocale;

export interface CreateAppApiOptions {
  /**
   * `process.env.EXPO_PUBLIC_API_URL`, read in the APP and passed in.
   *
   * Deliberately not read here. Expo's babel plugin inlines `EXPO_PUBLIC_*` at
   * transform time, and whether it reaches a workspace package depends on Metro's
   * watchFolders and the transformer's file filter. Reading it in the app makes it
   * unambiguous, and a wrong base URL is the kind of failure that appears only in
   * a release build.
   */
  apiUrl: string | undefined;
  storage: TokenStorage;
  /** Called on 401 — wire this to the auth store's sign-out. */
  onUnauthorized: () => void;
}

/**
 * The app's API client.
 *
 * `resolveApiBaseUrl` refuses a missing or plain-HTTP URL in a release build
 * rather than silently defaulting to localhost, which is what previously shipped.
 */
export function createAppApi({ apiUrl, storage, onUnauthorized }: CreateAppApiOptions): RafeeqApi {
  return createRafeeqApi({
    baseURL: resolveApiBaseUrl(apiUrl),
    getToken: () => storage.get(),
    getLocale: getApiLocale,
    onUnauthorized,
    /*
     * 403 and 5xx go to one surface for the whole app — see `problems.tsx`.
     * They are deliberately NOT `onUnauthorized`: signing out does not fix either,
     * and reusing that path turns a permission error into a sign-out loop.
     */
    onForbidden: reportApiProblem,
    onServerError: reportApiProblem,
  });
}
