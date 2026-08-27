import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Locale } from '@rafeeq/shared';
import { setApiLocale } from './api';

export interface PrefsState {
  locale: Locale;
  introSeen: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setLocale: (locale: Locale) => Promise<void>;
  setIntroSeen: () => Promise<void>;
}

export type PrefsStore = UseBoundStore<StoreApi<PrefsState>>;

function applyRTL(locale: Locale) {
  const rtl = locale === 'ar';
  if (I18nManager.isRTL !== rtl) {
    I18nManager.allowRTL(rtl);
    I18nManager.forceRTL(rtl);
  }
}

/**
 * Device preferences: language, and whether onboarding has been seen.
 *
 * The storage key is per-app for the same reason the token key is — one phone can
 * hold both apps, and «شفت المقدّمة» in the student app says nothing about the
 * captain onboarding, which is a different five screens.
 */
export function createPrefsStore(key: string): PrefsStore {
  return create<PrefsState>((set, get) => ({
    locale: 'ar',
    introSeen: false,
    hydrated: false,

    async hydrate() {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (raw) {
          const p = JSON.parse(raw) as Partial<PrefsState>;
          set({ locale: p.locale ?? 'ar', introSeen: p.introSeen ?? false });
        }
      } catch {
        /* unreadable or absent — the defaults above are correct */
      }
      setApiLocale(get().locale);
      applyRTL(get().locale);
      set({ hydrated: true });
    },

    async setLocale(locale) {
      set({ locale });
      setApiLocale(locale);
      applyRTL(locale);
      await persist(key, get);
    },

    async setIntroSeen() {
      set({ introSeen: true });
      await persist(key, get);
    },
  }));
}

async function persist(key: string, get: () => PrefsState) {
  const { locale, introSeen } = get();
  await AsyncStorage.setItem(key, JSON.stringify({ locale, introSeen }));
}
