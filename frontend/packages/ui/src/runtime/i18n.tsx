import React, { createContext, useContext, useMemo } from 'react';
import { t as translate, type Locale } from '@rafeeq/shared';

interface I18nContextValue {
  locale: Locale;
  isRTL: boolean;
  t: (key: string) => string;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

/**
 * Locale for the component tree.
 *
 * ── Why it takes the locale as PROPS ──────────────────────────────────────
 *
 * The version in each app imported that app's `usePrefs` store directly, which is
 * what made this file impossible to share: the package would have had to know
 * which store instance exists, and the store imports the API client, which
 * imports the token storage, whose key is per-app.
 *
 * Taking `locale` and `setLocale` as props inverts that. The provider is a leaf,
 * the app wires its own store to it in one place, and `useI18n()` stays a stable
 * import — which matters because `LiveMap` calls it from inside this package.
 */
export function I18nProvider({
  locale,
  setLocale,
  children,
}: {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  children: React.ReactNode;
}) {
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
