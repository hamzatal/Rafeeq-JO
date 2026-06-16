import { createRafeeqApi } from '@rafeeq/api-client';

const TOKEN_KEY = 'rafeeq_admin_token';

export const tokenStore = {
  get: () => (typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null),
  set: (t: string) => typeof window !== 'undefined' && localStorage.setItem(TOKEN_KEY, t),
  clear: () => typeof window !== 'undefined' && localStorage.removeItem(TOKEN_KEY),
};

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export const api = createRafeeqApi({
  baseURL: apiUrl,
  getToken: () => tokenStore.get(),
  getLocale: () => 'ar',
  onUnauthorized: () => onUnauthorized?.(),
});
