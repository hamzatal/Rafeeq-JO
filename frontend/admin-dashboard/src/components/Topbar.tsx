'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AppNotification } from '@rafeeq/shared';
import { usePrefs } from '../lib/prefs';
import { useT } from '../lib/i18n';
import { Tooltip } from './Tooltip';
import { api } from '../lib/api';

/** Searchable destinations for the global command-palette search. */
type Target = { href: string; ar: string; en: string; icon: string; kw?: string };
const TARGETS: Target[] = [
  { href: '/', ar: 'مركز القيادة', en: 'Dashboard', icon: 'dashboard', kw: 'home overview رئيسية' },
  { href: '/insights', ar: 'الرؤى الذكية', en: 'AI Insights', icon: 'neurology', kw: 'ai analytics تحليلات' },
  { href: '/ride-requests', ar: 'طلبات الرحلات', en: 'Ride Requests', icon: 'near_me' },
  { href: '/zones', ar: 'المناطق', en: 'Zones', icon: 'map' },
  { href: '/universities', ar: 'الجامعات', en: 'Universities', icon: 'school' },
  { href: '/routes', ar: 'المسارات', en: 'Routes', icon: 'route' },
  { href: '/plans', ar: 'خطط الاشتراك', en: 'Plans', icon: 'card_membership' },
  { href: '/subscriptions', ar: 'الاشتراكات', en: 'Subscriptions', icon: 'subscriptions' },
  { href: '/trips', ar: 'الرحلات', en: 'Trips', icon: 'directions_car' },
  { href: '/drivers', ar: 'الكباتن', en: 'Captains', icon: 'sports_motorsports', kw: 'drivers سائق' },
  { href: '/users', ar: 'المستخدمون', en: 'Users', icon: 'group', kw: 'students طلاب wallet محفظة' },
  { href: '/payments', ar: 'المدفوعات', en: 'Payments', icon: 'payments', kw: 'cliq شحن fraud احتيال' },
  { href: '/coupons', ar: 'الكوبونات', en: 'Coupons', icon: 'sell', kw: 'discount خصم' },
  { href: '/withdrawals', ar: 'سحوبات الكباتن', en: 'Withdrawals', icon: 'account_balance_wallet', kw: 'payout' },
  { href: '/reports', ar: 'التقارير المالية', en: 'Reports', icon: 'monitoring' },
  { href: '/cliq', ar: 'إعدادات CliQ', en: 'CliQ Settings', icon: 'account_balance', kw: 'alias' },
  { href: '/safety', ar: 'مركز الأمان', en: 'Safety', icon: 'shield', kw: 'sos risk مخاطر' },
  { href: '/disputes', ar: 'النزاعات', en: 'Disputes', icon: 'gavel' },
  { href: '/support', ar: 'الدعم', en: 'Support', icon: 'support_agent', kw: 'tickets تذاكر' },
  { href: '/complaints', ar: 'الشكاوى', en: 'Complaints', icon: 'report' },
  { href: '/security', ar: 'الأمان (MFA)', en: 'Security', icon: 'lock' },
  { href: '/admins', ar: 'فريق الإدارة', en: 'Admin Team', icon: 'admin_panel_settings' },
  { href: '/profile', ar: 'ملفي الشخصي', en: 'My Profile', icon: 'account_circle' },
];

export function Topbar() {
  const { locale, scheme, setLocale, setScheme } = usePrefs();
  const { t } = useT();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);

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
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // ── Global search results ──────────────────────────────────────
  const pageResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return TARGETS.filter(
      (t2) => t2.ar.includes(query.trim()) || t2.en.toLowerCase().includes(q) || (t2.kw ?? '').toLowerCase().includes(q),
    ).slice(0, 6);
  }, [query]);

  const entityActions = useMemo(() => {
    const q = query.trim();
    if (!q) return [] as { label: string; href: string; icon: string }[];
    return [
      { label: `بحث عن مستخدم: "${q}"`, href: `/users?q=${encodeURIComponent(q)}`, icon: 'person_search' },
      { label: `بحث عن كابتن: "${q}"`, href: `/drivers?q=${encodeURIComponent(q)}`, icon: 'sports_motorsports' },
    ];
  }, [query]);

  const go = (href: string) => {
    setSearchOpen(false);
    setQuery('');
    router.push(href);
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (pageResults[0]) return go(pageResults[0].href);
    const q = query.trim();
    if (q) go(`/users?q=${encodeURIComponent(q)}`);
  };

  const togglePanel = useCallback(() => {
    setOpen((o) => {
      const next = !o;
      if (next) {
        setLoadingItems(true);
        api.notifications.list({ page: 1 }).then((list) => setItems(list.slice(0, 8))).finally(() => setLoadingItems(false));
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
      {/* Global search */}
      <div className="relative w-96 max-w-[48vw] hidden sm:block" ref={searchRef}>
        <form onSubmit={submitSearch} className="relative">
          <span className="material-symbols-outlined absolute end-3 top-1/2 -translate-y-1/2 text-muted text-[20px]">search</span>
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            className="w-full h-10 pe-10 ps-3 rounded-lg border border-line bg-background text-sm outline-none focus:border-cyan focus:ring-1 focus:ring-cyan dark:bg-dsurface dark:border-dline dark:text-dtext"
            placeholder={t('shell.search')}
          />
        </form>

        {searchOpen && query.trim() && (
          <div className="absolute mt-2 w-full rounded-xl border border-line bg-surface shadow-lift overflow-hidden dark:bg-dcard dark:border-dline">
            {pageResults.length > 0 && (
              <div className="py-1">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted">الصفحات</div>
                {pageResults.map((r) => (
                  <button
                    key={r.href}
                    onClick={() => go(r.href)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-background dark:hover:bg-dsurface text-start"
                  >
                    <span className="material-symbols-outlined text-[18px] text-cyan-deep">{r.icon}</span>
                    <span className="surface-text">{locale === 'ar' ? r.ar : r.en}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="py-1 border-t border-line dark:border-dline">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted">إجراءات</div>
              {entityActions.map((a) => (
                <button
                  key={a.href}
                  onClick={() => go(a.href)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-background dark:hover:bg-dsurface text-start"
                >
                  <span className="material-symbols-outlined text-[18px] text-muted">{a.icon}</span>
                  <span className="surface-text">{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative" ref={panelRef}>
          <Tooltip label={t('shell.notifications')}>
            <button
              onClick={togglePanel}
              className="relative w-10 h-10 rounded-full flex items-center justify-center text-muted hover:bg-background dark:hover:bg-dsurface transition-colors"
            >
              <span className="material-symbols-outlined">notifications</span>
              {unread > 0 && (
                <span className="absolute top-1 end-1 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </button>
          </Tooltip>

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
        <Tooltip label={t('shell.language')}>
          <button
            onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
            className="h-10 px-3 rounded-lg border border-line text-sm font-semibold surface-text hover:bg-background dark:border-dline dark:hover:bg-dsurface transition-colors"
          >
            {locale === 'ar' ? 'EN' : 'ع'}
          </button>
        </Tooltip>

        {/* Theme */}
        <Tooltip label={t('shell.theme')}>
          <button
            onClick={() => setScheme(scheme === 'dark' ? 'light' : 'dark')}
            className="w-10 h-10 rounded-lg border border-line surface-text hover:bg-background dark:border-dline dark:hover:bg-dsurface transition-colors"
          >
            {scheme === 'dark' ? '☀︎' : '☾'}
          </button>
        </Tooltip>
      </div>
    </header>
  );
}
