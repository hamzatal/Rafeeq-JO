import { createAppApi, setApiLocale } from '@rafeeq/ui';
import { tokenStorage } from './storage';

export { setApiLocale };

/** The 401 hook, wired by the auth store. See the student app for the reasoning. */
let unauthorizedHandler: (() => void) | null = null;

export const setUnauthorizedHandler = (fn: () => void) => {
  unauthorizedHandler = fn;
};

export const api = createAppApi({
  apiUrl: process.env.EXPO_PUBLIC_API_URL,
  storage: tokenStorage,
  onUnauthorized: () => unauthorizedHandler?.(),
});
