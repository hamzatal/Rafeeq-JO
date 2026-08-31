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

/**
 * Which queues are drawn HOT rather than warm.
 *
 * From the reference: SOS and payment review are red because a delay there is a person
 * stranded or money held; captain verification and payouts are amber because they are
 * slow work, not emergencies.
 */
const HOT = new Set(['/safety', '/payments']);

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t } = useT();

  const isAdmin = (user?.roles ?? []).includes('admin');
  const current = activeHref(pathname);
  const badges = useBadges();

  return (
    /* 216px, from `.admin aside{width:216px}` — not 256. Forty pixels of the content
       area were being spent on a column that the reference fits in less. */
    <aside className="fixed inset-y-0 start-0 h-screen w-[216px] shrink-0 bg-surface text-ink flex flex-col z-50 border-e border-line">
      {/* Brand */}
      {/*
        `.abrand{padding:13px 15px}` with `.amk{width:32px;height:32px;border-radius:9px;
        background:var(--b600)}` holding a 22px WHITE mark. The mark is not bare here — it
        sits in a brand tile, which is what makes it read at 32px against a white column.
      */}
      <div className="px-[15px] py-[13px] flex items-center gap-[9px] border-b border-line">
        <div className="w-8 h-8 rounded-[9px] bg-primary grid place-items-center shrink-0">
          <LogoMark size={22} onDark />
        </div>
        <div className="min-w-0 leading-none">
          <div className="text-[15px] font-bold font-display surface-text">رفيق</div>
          <div className="text-[10px] text-muted truncate mt-0.5">{t('brand.tagline')}</div>
        </div>
      </div>

      {/* Nav */}
      <nav aria-label={t('nav.group.operations')} className="flex-1 overflow-y-auto overflow-x-hidden py-3">
        {NAV.map((group) => {
          const items = group.items.filter((item) => !item.adminOnly || isAdmin);
          // A group whose every entry is admin-only must not leave its heading behind.
          if (items.length === 0) return null;

          return (
            <div key={group.titleKey}>
              {/* `.agrp{font:700 9px; letter-spacing:.12em; color:var(--n400); padding:0 16px; margin:12px 0 4px}` */}
              <div className="px-4 mt-3 mb-1 text-[9px] font-bold tracking-[0.12em] text-neutral-400">
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
                    className={`nav-item ${active ? 'nav-item-active shadow-[inset_3px_0_0_theme(colors.primary)]' : ''}`}
                  >
                    {/* `.anav.on{box-shadow:inset 3px 0 0 var(--b600)}` — an inset shadow on the
                        leading edge, which flips with `dir` and needs no extra element. */}
                    {/*
                      Lucide is a stroke set with no fill axis, so emphasis is carried
                      by a heavier stroke — 2.25 against the 1.75 default, which reads
                      at 20px without changing the glyph's silhouette.
                    */}
                    <Icon name={item.icon} size={17} strokeWidth={active ? 2.25 : 1.9} />
                    <span className="truncate flex-1">{t(item.labelKey)}</span>
                    {/*
                      Only where the API can actually answer — see lib/badges. A count of
                      zero still renders: «0 بانتظار المراجعة» is real news, unlike an
                      absent count, which means unknown.
                    */}
                    {!badges[item.href] ? null : (
                      /*
                        A badge means WORK IS WAITING, so zero renders nothing at all — the
                        sheet carries no zero badges, and three grey «0» chips down the
                        column are noise that dilutes the counts that do matter.
                        `.an.hot` (solid red) for SOS and payments, `.an.wrm` (amber-soft)
                        for captains and payouts: severity, not size, so a large-but-healthy
                        number does not shout.
                      */
                      <span
                        className={`shrink-0 min-w-[18px] px-1.5 py-px rounded-full text-[10px] font-bold text-center leading-[1.5] ${
                          HOT.has(item.href) ? 'bg-danger text-white' : 'bg-warning-soft text-warning'
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
      <div className="p-[9px] border-t border-line">
        <Link
          href={PROFILE.href}
          title={t(PROFILE.hintKey)}
          className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-background transition-colors"
        >
          <div className="w-[30px] h-[30px] rounded-full bg-primary text-white flex items-center justify-center font-bold text-[13px] shrink-0">
            {user?.full_name?.charAt(0) ?? 'A'}
          </div>
          <div className="min-w-0">
            <div className="text-[11.5px] font-semibold truncate text-ink">{user?.full_name}</div>
            <div className="text-[10px] text-muted truncate">{user?.roles?.[0] ?? t('shell.staff')}</div>
          </div>
        </Link>
        <button
          onClick={logout}
          className="mt-1 w-full flex items-center gap-2 rounded-[9px] px-[10px] py-[7px] text-xs text-danger hover:bg-danger/10 transition-colors"
        >
          <Icon name="log-out" size={16} />
          {t('shell.logout')}
        </button>
      </div>
    </aside>
  );
}
