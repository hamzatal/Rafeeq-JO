import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'rafeeq_token';

/**
 * Token storage that uses SecureStore on native and localStorage on web
 * (SecureStore is unavailable on web).
 */
export const tokenStorage = {
  async get(): Promise<string | null> {
    if (Platform.OS === 'web') {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
    }
    return SecureStore.getItemAsync(TOKEN_KEY);
  },

  async set(token: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(TOKEN_KEY, token);
      return;
    }
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },

  async clear(): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(TOKEN_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },
};
