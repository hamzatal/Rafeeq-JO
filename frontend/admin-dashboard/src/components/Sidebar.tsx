'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/auth';
import { useT } from '../lib/i18n';

interface NavLink {
  href: string;
  labelKey: string;
  icon: string;
}

const GROUPS: { titleKey: string; links: NavLink[] }[] = [
  {
    titleKey: 'nav.group.operations',
    links: [
      { href: '/', labelKey: 'nav.dashboard', icon: 'dashboard' },
      { href: '/insights', labelKey: 'nav.insights', icon: 'neurology' },
      { href: '/ride-requests', labelKey: 'nav.rideRequests', icon: 'near_me' },
      { href: '/zones', labelKey: 'nav.zones', icon: 'map' },
      { href: '/universities', labelKey: 'nav.universities', icon: 'school' },
    ],
  },
  {
    titleKey: 'nav.group.transport',
    links: [
      { href: '/routes', labelKey: 'nav.routes', icon: 'route' },
      { href: '/plans', labelKey: 'nav.plans', icon: 'card_membership' },
      { href: '/subscriptions', labelKey: 'nav.subscriptions', icon: 'subscriptions' },
      { href: '/trips', labelKey: 'nav.trips', icon: 'directions_car' },
    ],
  },
  {
    titleKey: 'nav.group.network',
    links: [
      { href: '/drivers', labelKey: 'nav.drivers', icon: 'sports_motorsports' },
      { href: '/users', labelKey: 'nav.users', icon: 'group' },
    ],
  },
  {
    titleKey: 'nav.group.finance',
    links: [
      { href: '/payments', labelKey: 'nav.payments', icon: 'payments' },
      { href: '/coupons', labelKey: 'nav.coupons', icon: 'sell' },
      { href: '/withdrawals', labelKey: 'nav.withdrawals', icon: 'account_balance_wallet' },
      { href: '/cliq', labelKey: 'nav.cliq', icon: 'account_balance' },
      { href: '/reports', labelKey: 'nav.reports', icon: 'monitoring' },
    ],
  },
  {
    titleKey: 'nav.group.safety',
    links: [
      { href: '/safety', labelKey: 'nav.safety', icon: 'shield' },
      { href: '/disputes', labelKey: 'nav.disputes', icon: 'gavel' },
      { href: '/support', labelKey: 'nav.support', icon: 'support_agent' },
      { href: '/complaints', labelKey: 'nav.complaints', icon: 'report' },
      { href: '/security', labelKey: 'nav.security', icon: 'lock' },
    ],
  },
  {
    titleKey: 'nav.group.admin',
    links: [
      { href: '/admins', labelKey: 'nav.admins', icon: 'admin_panel_settings' },
      { href: '/profile', labelKey: 'nav.profile', icon: 'account_circle' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t } = useT();

  const isAdmin = (user?.roles ?? []).includes('admin');
  // Hide admin-only links from non-admin staff.
  const adminOnly = new Set(['/admins', '/cliq']);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');

  return (
    <aside className="fixed inset-y-0 start-0 h-screen w-64 shrink-0 bg-navy text-white flex flex-col z-50 shadow-lift">
      {/* Brand */}
      <div className="px-5 py-5 flex items-center gap-3 border-b border-white/10">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan/25 to-cyan/5 border border-cyan/40 flex items-center justify-center">
          <span className="material-symbols-outlined icon-fill text-cyan">hub</span>
        </div>
        <div>
          <div className="text-lg font-extrabold font-display text-cyan-soft leading-tight">رفيق JO</div>
          <div className="text-[11px] text-white/60">{t('brand.tagline')}</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-1">
        {GROUPS.map((g) => (
          <div key={g.titleKey} className="mb-3">
            <div className="px-5 mb-1 text-[10px] font-bold uppercase tracking-widest text-white/30">
              {t(g.titleKey)}
            </div>
            {g.links.map((l) => {
              if (adminOnly.has(l.href) && !isAdmin) return null;
              const active = isActive(l.href);
              return (
                <Link key={l.href} href={l.href} className={`nav-item ${active ? 'nav-item-active' : ''}`}>
                  <span className={`material-symbols-outlined text-[20px] ${active ? 'icon-fill' : ''}`}>
                    {l.icon}
                  </span>
                  <span className="truncate">{t(l.labelKey)}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-white/10">
        <Link
          href="/profile"
          className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-cyan text-navy flex items-center justify-center font-bold shrink-0">
            {user?.full_name?.charAt(0) ?? 'A'}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{user?.full_name}</div>
            <div className="text-[11px] text-white/50 truncate">{user?.roles?.[0] ?? t('shell.staff')}</div>
          </div>
        </Link>
        <button
          onClick={logout}
          className="mt-1 w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-300 hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          {t('shell.logout')}
        </button>
      </div>
    </aside>
  );
}
