import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { I18nManager } from 'react-native';
import { t as translate, type Locale } from '@rafeeq/shared';
import { setApiLocale } from './lib/api';

interface I18nContextValue {
  locale: Locale;
  isRTL: boolean;
  t: (key: string) => string;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ar');

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    setApiLocale(next);
    const rtl = next === 'ar';
    if (I18nManager.isRTL !== rtl) {
      I18nManager.allowRTL(rtl);
      I18nManager.forceRTL(rtl);
    }
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      isRTL: locale === 'ar',
      t: (key: string) => translate(locale, key),
      setLocale,
    }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
