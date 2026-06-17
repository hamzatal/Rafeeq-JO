'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { t as translate, type ColorScheme, type Locale } from '@rafeeq/shared';

interface PrefsValue {
  locale: Locale;
  scheme: ColorScheme;
  setLocale: (l: Locale) => void;
  setScheme: (s: ColorScheme) => void;
  t: (key: string) => string;
}

const Ctx = createContext<PrefsValue | null>(null);

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleS] = useState<Locale>('ar');
  const [scheme, setSchemeS] = useState<ColorScheme>('light');

  useEffect(() => {
    const l = (localStorage.getItem('rafeeq_admin_locale') as Locale | null) ?? 'ar';
    const s = (localStorage.getItem('rafeeq_admin_scheme') as ColorScheme | null) ?? 'light';
    setLocaleS(l);
    setSchemeS(s);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', scheme === 'dark');
  }, [scheme]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleS(l);
    localStorage.setItem('rafeeq_admin_locale', l);
  }, []);

  const setScheme = useCallback((s: ColorScheme) => {
    setSchemeS(s);
    localStorage.setItem('rafeeq_admin_scheme', s);
  }, []);

  const t = useCallback((key: string) => translate(locale, key), [locale]);

  return <Ctx.Provider value={{ locale, scheme, setLocale, setScheme, t }}>{children}</Ctx.Provider>;
}

export function usePrefs(): PrefsValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePrefs must be used within PrefsProvider');
  return ctx;
}
