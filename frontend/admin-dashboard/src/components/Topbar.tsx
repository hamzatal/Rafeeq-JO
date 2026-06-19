'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AppNotification } from '@rafeeq/shared';
import { usePrefs } from '../lib/prefs';
import { useT } from '../lib/i18n';
import { api } from '../lib/api';

export function Topbar() {
  const { locale, scheme, setLocale, setScheme } = usePrefs();
  const { t } = useT();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Poll the unread count.
  useEffect(() => {
    let active = true;
    const load = () => api.notifications.unreadCount().then((c) => active && setUnread(c)).catch(() => {});
    load();
    const id = setInterval(load, 30_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  // Close dropdown on outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) router.push(`/users?q=${encodeURIComponent(q)}`);
  };

  const togglePanel = useCallback(() => {
    setOpen((o) => {
      const next = !o;
      if (next) {
        setLoadingItems(true);
        api.notifications
          .list({ page: 1 })
          .then((list) => setItems(list.slice(0, 8)))
          .finally(() => setLoadingItems(false));
      }
      return next;
    });
  }, []);

  const markAll = async () => {
    try {
      await api.notifications.markAllRead();
      setUnread(0);
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      /* ignore */
    }
  };

  return (
    <header className="sticky top-0 z-40 h-16 bg-surface/90 backdrop-blur border-b border-line flex items-center justify-between px-6 dark:bg-dcard/90 dark:border-dline">
      {/* Search */}
      <form onSubmit={submitSearch} className="relative w-72 max-w-[40vw] hidden sm:block">
        <span className="material-symbols-outlined absolute end-3 top-1/2 -translate-y-1/2 text-muted text-[20px]">
          search
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full h-10 pe-10 ps-3 rounded-lg border border-line bg-background text-sm outline-none focus:border-cyan focus:ring-1 focus:ring-cyan dark:bg-dsurface dark:border-dline dark:text-dtext"
          placeholder={t('shell.search')}
        />
      </form>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={togglePanel}
            className="relative w-10 h-10 rounded-full flex items-center justify-center text-muted hover:bg-background dark:hover:bg-dsurface transition-colors"
            title={t('shell.notifications')}
          >
            <span className="material-symbols-outlined">notifications</span>
            {unread > 0 && (
              <span className="absolute top-1 end-1 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute end-0 mt-2 w-80 max-h-[70vh] overflow-y-auto rounded-xl border border-line bg-surface shadow-lift dark:bg-dcard dark:border-dline">
              <div className="flex items-center justify-between px-4 py-3 border-b border-line dark:border-dline">
                <span className="font-bold surface-text">{t('shell.notifications')}</span>
                <button onClick={markAll} className="text-xs text-cyan-deep hover:underline">
                  {t('shell.markAllRead')}
                </button>
              </div>
              {loadingItems ? (
                <div className="p-6 text-center text-muted text-sm">{t('common.loading')}</div>
              ) : items.length === 0 ? (
                <div className="p-6 text-center text-muted text-sm">{t('shell.noNotifications')}</div>
              ) : (
                <ul>
                  {items.map((n) => (
                    <li
                      key={n.id}
                      className={`px-4 py-3 border-b border-line/60 dark:border-dline/60 ${n.read ? 'opacity-60' : 'bg-cyan/5'}`}
                    >
                      <div className="text-sm font-semibold surface-text">{n.title}</div>
                      <div className="text-xs text-muted mt-0.5 line-clamp-2">{n.body}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Language */}
        <button
          onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
          className="h-10 px-3 rounded-lg border border-line text-sm font-semibold surface-text hover:bg-background dark:border-dline dark:hover:bg-dsurface transition-colors"
          title={t('shell.language')}
        >
          {locale === 'ar' ? 'EN' : 'ع'}
        </button>

        {/* Theme */}
        <button
          onClick={() => setScheme(scheme === 'dark' ? 'light' : 'dark')}
          className="w-10 h-10 rounded-lg border border-line surface-text hover:bg-background dark:border-dline dark:hover:bg-dsurface transition-colors"
          title={t('shell.theme')}
        >
          {scheme === 'dark' ? '☀︎' : '☾'}
        </button>
      </div>
    </header>
  );
}
