'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/auth';
import { useT } from '../lib/i18n';
import { LogoMark } from './Logo';
import { Icon } from './Icon';
import { NAV, PROFILE, activeHref } from '../lib/nav';
import { useBadges } from '../lib/badges';
import { Num } from './Num';

/* ═══════════════════════════════════════════════════════════════════════════
   THE SIDEBAR — four groups, sixteen destinations, one source.

   ── What changed in phase 10 ───────────────────────────────────────────────

   Six groups and twenty-eight links became four and sixteen, per
   `docs/design/v2/06-admin-1`. The list itself moved OUT of this file into
   `src/lib/nav.ts`, because it was never only the sidebar's: `Topbar` kept a second
   copy for its search, with the Arabic and English written inline, and the two had
   drifted apart on both membership and wording.

   ── The surface ────────────────────────────────────────────────────────────

   `surface` (white), not `brand-50`. The approved sidebar is white against a tinted
   page, so the ACTIVE row is the only tinted thing in the column — on a brand-50
   column the active pill had to fight the background it sat on.

   The active row also carries a bar on the leading edge. In an RTL column that is
   `start-0`, which flips with `dir` on its own; a `left-0` would have detached the
   marker from the text it marks the moment the dashboard is read in English.
   ═══════════════════════════════════════════════════════════════════════════ */

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t } = useT();

  const isAdmin = (user?.roles ?? []).includes('admin');
  const current = activeHref(pathname);
  const badges = useBadges();

  return (
    <aside className="fixed inset-y-0 start-0 h-screen w-64 shrink-0 bg-surface text-ink flex flex-col z-50 border-e border-line">
      {/* Brand */}
      <div className="px-5 py-4 flex items-center gap-3 border-b border-line">
        <LogoMark size={40} />
        <div className="min-w-0">
          <div className="text-lg font-bold font-display text-primary leading-tight">رفيق</div>
          <div className="text-[11px] text-muted truncate">{t('brand.tagline')}</div>
        </div>
      </div>

      {/* Nav */}
      <nav aria-label={t('nav.group.operations')} className="flex-1 overflow-y-auto overflow-x-hidden py-3">
        {NAV.map((group) => {
          const items = group.items.filter((item) => !item.adminOnly || isAdmin);
          // A group whose every entry is admin-only must not leave its heading behind.
          if (items.length === 0) return null;

          return (
            <div key={group.titleKey} className="mb-4">
              <div className="px-5 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted/70">
                {t(group.titleKey)}
              </div>
              {items.map((item) => {
                const active = current === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={t(item.hintKey)}
                    aria-current={active ? 'page' : undefined}
                    className={`nav-item relative ${active ? 'nav-item-active' : ''}`}
                  >
                    {active && (
                      <span
                        aria-hidden="true"
                        className="absolute start-0 inset-y-1 w-[3px] rounded-e bg-primary"
                      />
                    )}
                    {/*
                      Lucide is a stroke set with no fill axis, so emphasis is carried
                      by a heavier stroke — 2.25 against the 1.75 default, which reads
                      at 20px without changing the glyph's silhouette.
                    */}
                    <Icon name={item.icon} size={20} strokeWidth={active ? 2.25 : undefined} />
                    <span className="truncate flex-1">{t(item.labelKey)}</span>
                    {/*
                      Only where the API can actually answer — see lib/badges. A count of
                      zero still renders: «0 بانتظار المراجعة» is real news, unlike an
                      absent count, which means unknown.
                    */}
                    {badges[item.href] === undefined ? null : (
                      <span
                        className={`shrink-0 min-w-[20px] px-1.5 py-0.5 rounded-full text-[10px] font-bold text-center ${
                          (badges[item.href] ?? 0) > 0 ? 'bg-danger text-white' : 'bg-neutral-200 text-muted'
                        }`}
                      >
                        <Num value={badges[item.href] ?? 0} />
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User — where the approved sidebar puts the signed-in operator. */}
      <div className="p-3 border-t border-line">
        <Link
          href={PROFILE.href}
          title={t(PROFILE.hintKey)}
          className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-background transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-bold shrink-0">
            {user?.full_name?.charAt(0) ?? 'A'}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate text-ink">{user?.full_name}</div>
            <div className="text-[11px] text-muted truncate">{user?.roles?.[0] ?? t('shell.staff')}</div>
          </div>
        </Link>
        <button
          onClick={logout}
          className="mt-1 w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
        >
          <Icon name="log-out" size={20} />
          {t('shell.logout')}
        </button>
      </div>
    </aside>
  );
}
