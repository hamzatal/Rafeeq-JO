import { create } from 'zustand';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ColorScheme, Locale } from '@rafeeq/shared';
import { setApiLocale } from '../lib/api';

const KEY = 'rafeeq_driver_prefs';

interface PrefsState {
  locale: Locale;
  scheme: ColorScheme;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setLocale: (locale: Locale) => Promise<void>;
  setScheme: (scheme: ColorScheme) => Promise<void>;
}

function applyRTL(locale: Locale) {
  const rtl = locale === 'ar';
  if (I18nManager.isRTL !== rtl) {
    I18nManager.allowRTL(rtl);
    I18nManager.forceRTL(rtl);
  }
}

export const usePrefs = create<PrefsState>((set, get) => ({
  locale: 'ar',
  scheme: 'dark', // captain default is the dark navy experience
  hydrated: false,

  async hydrate() {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw);
        set({ locale: p.locale ?? 'ar', scheme: p.scheme ?? 'dark' });
      }
    } catch {
      /* ignore */
    }
    setApiLocale(get().locale);
    applyRTL(get().locale);
    set({ hydrated: true });
  },

  async setLocale(locale) {
    set({ locale });
    setApiLocale(locale);
    applyRTL(locale);
    await AsyncStorage.setItem(KEY, JSON.stringify({ locale, scheme: get().scheme }));
  },

  async setScheme(scheme) {
    set({ scheme });
    await AsyncStorage.setItem(KEY, JSON.stringify({ locale: get().locale, scheme }));
  },
}));
