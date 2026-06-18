import React, { createContext, useContext, useMemo } from 'react';
import { t as translate, type Locale } from '@rafeeq/shared';
import { usePrefs } from './store/prefs';

interface I18nContextValue {
  locale: Locale;
  isRTL: boolean;
  t: (key: string) => string;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const locale = usePrefs((s) => s.locale);
  const setLocalePref = usePrefs((s) => s.setLocale);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      isRTL: locale === 'ar',
      t: (key: string) => translate(locale, key),
      setLocale: (l: Locale) => void setLocalePref(l),
    }),
    [locale, setLocalePref],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
