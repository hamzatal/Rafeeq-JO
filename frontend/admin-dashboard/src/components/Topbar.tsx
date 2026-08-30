'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppNotification } from '@rafeeq/shared';
import { usePrefs } from '../lib/prefs';
import { useT } from '../lib/i18n';
import { Tooltip } from './Tooltip';
import { api } from '../lib/api';
import { Icon } from './Icon';
import { CommandPalette } from './CommandPalette';
import { SystemHealth } from './SystemHealth';

export function Topbar() {
  const { locale, setLocale } = usePrefs();
  const { t } = useT();

  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  /*
   * Guarded, because this fetch outlives the component that started it.
   *
   * It had no mounted check and no `.catch`: navigating away with the panel open
   * resolved into two `setState` calls on an unmounted `Topbar`, and a failed request
   * left the panel spinning forever with nothing said. The `alive` idiom is already
   * used three files over — this one just never got it.
   */
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const togglePanel = useCallback(() => {
    setOpen((o) => {
      const next = !o;
      if (next) {
        setLoadingItems(true);
        api.notifications
          .list({ page: 1 })
          .then(({ items }) => alive.current && setItems(items.slice(0, 8)))
          .catch(() => alive.current && setItems([]))
          .finally(() => alive.current && setLoadingItems(false));
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
    <header className="sticky top-0 z-40 h-16 bg-surface/90 backdrop-blur border-b border-line flex items-center justify-between px-6">
      <CommandPalette />

      <div className="flex items-center gap-2">
        <SystemHealth />

        {/* Notifications */}
        <div className="relative" ref={panelRef}>
          <Tooltip label={t('shell.notifications')}>
            <button
              onClick={togglePanel}
              className="relative w-10 h-10 rounded-full flex items-center justify-center text-muted hover:bg-background transition-colors"
            >
              <Icon name="bell" />
              {unread > 0 && (
                <span className="absolute top-1 end-1 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </button>
          </Tooltip>

          {open && (
            <div className="absolute end-0 mt-2 w-80 max-h-[70vh] overflow-y-auto rounded-xl border border-line bg-surface shadow-lift">
              <div className="flex items-center justify-between px-4 py-3 border-b border-line">
                <span className="font-bold surface-text">{t('shell.notifications')}</span>
                <button onClick={markAll} className="text-xs text-primary-dark hover:underline">
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
                      className={`px-4 py-3 border-b border-line/60 ${n.read ? 'opacity-60' : 'bg-primary/5'}`}
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
        <Tooltip label={t('shell.language')}>
          <button
            onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
            className="h-10 px-3 rounded-lg border border-line text-sm font-semibold surface-text hover:bg-background transition-colors"
          >
            {locale === 'ar' ? 'EN' : 'ع'}
          </button>
        </Tooltip>
      </div>
    </header>
  );
}
