import { createRafeeqApi } from '@rafeeq/api-client';
import { resolveApiBaseUrl } from '@rafeeq/shared';
import { tokenStorage } from './storage';

let currentLocale: 'ar' | 'en' = 'ar';
export const setApiLocale = (locale: 'ar' | 'en') => {
  currentLocale = locale;
};

// Callback wired by the auth store to react to 401s.
let unauthorizedHandler: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: () => void) => {
  unauthorizedHandler = fn;
};

// One resolver, shared with the other app, that refuses a missing or plain-HTTP
// URL in a release build rather than silently defaulting to localhost — which is
// what previously shipped. See @rafeeq/shared/apiBase.
const apiUrl = resolveApiBaseUrl(process.env.EXPO_PUBLIC_API_URL);

export const api = createRafeeqApi({
  baseURL: apiUrl,
  getToken: () => tokenStorage.get(),
  getLocale: () => currentLocale,
  onUnauthorized: () => unauthorizedHandler?.(),
});
