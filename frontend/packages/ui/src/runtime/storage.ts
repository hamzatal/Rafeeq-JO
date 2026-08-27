import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export interface TokenStorage {
  get(): Promise<string | null>;
  set(token: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Bearer-token storage: SecureStore on native, localStorage on web.
 *
 * ── Why the key is a parameter ─────────────────────────────────────────────
 *
 * The two apps used `rafeeq_token` and `rafeeq_driver_token`, and that difference
 * is the ONLY reason this file was duplicated. It is also load-bearing: one phone
 * can hold both apps, and one student is frequently also a captain. A shared key
 * would mean signing into the captain app silently replaces the student session,
 * and logging out of one logs out of both.
 *
 * So the key stays per-app and becomes an argument, rather than the file staying
 * duplicated so the constant can differ.
 */
export function createTokenStorage(key: string): TokenStorage {
  return {
    async get() {
      if (Platform.OS === 'web') {
        return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
      }

      return SecureStore.getItemAsync(key);
    },

    async set(token: string) {
      if (Platform.OS === 'web') {
        localStorage.setItem(key, token);

        return;
      }
      await SecureStore.setItemAsync(key, token);
    },

    async clear() {
      if (Platform.OS === 'web') {
        localStorage.removeItem(key);

        return;
      }
      await SecureStore.deleteItemAsync(key);
    },
  };
}
