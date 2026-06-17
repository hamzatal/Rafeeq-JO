'use client';

import { usePrefs } from '../lib/prefs';

export function Topbar() {
  const { locale, scheme, setLocale, setScheme } = usePrefs();

  return (
    <div className="flex items-center justify-end gap-2 mb-6">
      <button
        onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
        className="h-9 px-3 rounded-lg border border-line dark:border-dline text-sm surface-text"
        title="Language"
      >
        {locale === 'ar' ? 'EN' : 'ع'}
      </button>
      <button
        onClick={() => setScheme(scheme === 'dark' ? 'light' : 'dark')}
        className="h-9 w-9 rounded-lg border border-line dark:border-dline text-sm surface-text"
        title="Theme"
      >
        {scheme === 'dark' ? '☀︎' : '☾'}
      </button>
    </div>
  );
}
