'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { t as translate, type Locale } from '@rafeeq/shared';

/**
 * Admin preferences: language only.
 *
 * The colour scheme is gone (decision 7 — dark mode is deleted). It used to live
 * here, toggle a `dark` class on `<html>`, and persist to
 * `rafeeq_admin_scheme` — driving 46 `dark:` utility classes across the
 * dashboard against a palette nobody designed, screenshotted or tested.
 *
 * Note the stale key is NOT read any more, so an admin who had toggled dark
 * simply lands in light on their next visit. That is the intended migration:
 * there is nothing to migrate to.
 */
interface PrefsValue {
 locale: Locale;
 setLocale: (l: Locale) => void;
 t: (key: string) => string;
}

const Ctx = createContext<PrefsValue | null>(null);

export function PrefsProvider({ children }: { children: React.ReactNode }) {
 const [locale, setLocaleS] = useState<Locale>('ar');

 useEffect(() => {
 const l = (localStorage.getItem('rafeeq_admin_locale') as Locale | null) ?? 'ar';
 setLocaleS(l);
 // Clear the retired key so it cannot resurrect a scheme that no longer exists.
 localStorage.removeItem('rafeeq_admin_scheme');
 }, []);

 useEffect(() => {
 document.documentElement.lang = locale;
 document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
 }, [locale]);

 const setLocale = useCallback((l: Locale) => {
 setLocaleS(l);
 localStorage.setItem('rafeeq_admin_locale', l);
 }, []);

 const t = useCallback((key: string) => translate(locale, key), [locale]);

 return <Ctx.Provider value={{ locale, setLocale, t }}>{children}</Ctx.Provider>;
}

export function usePrefs(): PrefsValue {
 const ctx = useContext(Ctx);
 if (!ctx) throw new Error('usePrefs must be used within PrefsProvider');
 return ctx;
}
