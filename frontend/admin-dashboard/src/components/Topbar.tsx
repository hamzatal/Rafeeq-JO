'use client';

import { usePrefs } from '../lib/prefs';

export function Topbar() {
  const { locale, scheme, setLocale, setScheme } = usePrefs();

  return (
    <header className="sticky top-0 z-40 h-16 bg-surface/90 backdrop-blur border-b border-line flex items-center justify-between px-6 dark:bg-dcard/90 dark:border-dline">
      {/* Search */}
      <div className="relative w-72 max-w-[40vw] hidden sm:block">
        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-muted text-[20px]">
          search
        </span>
        <input
          className="w-full h-10 pr-10 pl-3 rounded-lg border border-line bg-background text-sm outline-none focus:border-cyan focus:ring-1 focus:ring-cyan dark:bg-dsurface dark:border-dline dark:text-dtext"
          placeholder="بحث في العمليات..."
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          className="w-10 h-10 rounded-full flex items-center justify-center text-muted hover:bg-background dark:hover:bg-dsurface transition-colors"
          title="الإشعارات"
        >
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button
          onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
          className="h-10 px-3 rounded-lg border border-line text-sm font-semibold surface-text hover:bg-background dark:border-dline dark:hover:bg-dsurface transition-colors"
          title="Language"
        >
          {locale === 'ar' ? 'EN' : 'ع'}
        </button>
        <button
          onClick={() => setScheme(scheme === 'dark' ? 'light' : 'dark')}
          className="w-10 h-10 rounded-lg border border-line surface-text hover:bg-background dark:border-dline dark:hover:bg-dsurface transition-colors"
          title="Theme"
        >
          {scheme === 'dark' ? '☀︎' : '☾'}
        </button>
      </div>
    </header>
  );
}
