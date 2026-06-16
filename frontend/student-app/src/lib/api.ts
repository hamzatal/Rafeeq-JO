import Constants from 'expo-constants';
import { createRafeeqApi } from '@rafeeq/api-client';
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

const apiUrl =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? 'http://localhost:8000';

export const api = createRafeeqApi({
  baseURL: apiUrl,
  getToken: () => tokenStorage.get(),
  getLocale: () => currentLocale,
  onUnauthorized: () => unauthorizedHandler?.(),
});
