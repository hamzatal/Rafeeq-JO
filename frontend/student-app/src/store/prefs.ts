import { create } from 'zustand';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Locale } from '@rafeeq/shared';
import { setApiLocale } from '../lib/api';

const KEY = 'rafeeq_prefs';

interface PrefsState {
  locale: Locale;
  introSeen: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setLocale: (locale: Locale) => Promise<void>;
  setIntroSeen: () => Promise<void>;
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
  introSeen: false,
  hydrated: false,

  async hydrate() {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw);
        set({ locale: p.locale ?? 'ar', introSeen: p.introSeen ?? false });
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
    await persist(get);
  },


  async setIntroSeen() {
    set({ introSeen: true });
    await persist(get);
  },
}));

/** Persist the current prefs snapshot. */
async function persist(get: () => PrefsState) {
  const { locale, introSeen } = get();
  await AsyncStorage.setItem(KEY, JSON.stringify({ locale, introSeen }));
}
