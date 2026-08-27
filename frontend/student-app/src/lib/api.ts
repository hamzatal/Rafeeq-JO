import { createAppApi, setApiLocale } from '@rafeeq/ui';
import { tokenStorage } from './storage';

export { setApiLocale };

/**
 * The 401 hook, wired by the auth store.
 *
 * A module-level slot rather than a parameter because the store and the client
 * need each other: the client reports 401, the store signs out, and the store
 * needs the client to do anything at all.
 */
let unauthorizedHandler: (() => void) | null = null;

export const setUnauthorizedHandler = (fn: () => void) => {
  unauthorizedHandler = fn;
};

export const api = createAppApi({
  apiUrl: process.env.EXPO_PUBLIC_API_URL,
  storage: tokenStorage,
  onUnauthorized: () => unauthorizedHandler?.(),
});
