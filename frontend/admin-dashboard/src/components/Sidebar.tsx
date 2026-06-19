'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/auth';

interface NavLink {
  href: string;
  label: string;
  icon: string;
}

const GROUPS: { title: string; links: NavLink[] }[] = [
  {
    title: 'العمليات',
    links: [
      { href: '/', label: 'مركز القيادة', icon: 'dashboard' },
      { href: '/insights', label: 'الرؤى الذكية', icon: 'neurology' },
      { href: '/ride-requests', label: 'طلبات الرحلات', icon: 'near_me' },
      { href: '/zones', label: 'المناطق', icon: 'map' },
      { href: '/universities', label: 'الجامعات', icon: 'school' },
    ],
  },
  {
    title: 'النقل',
    links: [
      { href: '/routes', label: 'المسارات', icon: 'route' },
      { href: '/plans', label: 'خطط الاشتراك', icon: 'card_membership' },
      { href: '/subscriptions', label: 'الاشتراكات', icon: 'subscriptions' },
      { href: '/trips', label: 'مراقبة الرحلات', icon: 'directions_car' },
    ],
  },
  {
    title: 'الشبكة',
    links: [
      { href: '/drivers', label: 'الكباتن', icon: 'sports_motorsports' },
      { href: '/users', label: 'المستخدمون', icon: 'group' },
    ],
  },
  {
    title: 'المالية',
    links: [
      { href: '/payments', label: 'المدفوعات', icon: 'payments' },
      { href: '/coupons', label: 'الكوبونات', icon: 'sell' },
      { href: '/withdrawals', label: 'سحوبات الكباتن', icon: 'account_balance_wallet' },
      { href: '/reports', label: 'التقارير المالية', icon: 'monitoring' },
    ],
  },
  {
    title: 'السلامة والامتثال',
    links: [
      { href: '/safety', label: 'مركز الأمان', icon: 'shield' },
      { href: '/disputes', label: 'مركز النزاعات', icon: 'gavel' },
      { href: '/support', label: 'الدعم', icon: 'support_agent' },
      { href: '/complaints', label: 'الشكاوى', icon: 'report' },
      { href: '/security', label: 'الأمان (MFA)', icon: 'lock' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');

  return (
    <aside className="fixed right-0 top-0 h-screen w-64 shrink-0 bg-navy text-white flex flex-col z-50 shadow-lift">
      {/* Brand */}
      <div className="px-5 py-5 flex items-center gap-3 border-b border-white/10">
        <div className="w-11 h-11 rounded-xl bg-cyan/15 border-2 border-cyan/40 flex items-center justify-center">
          <span className="material-symbols-outlined icon-fill text-cyan">hub</span>
        </div>
        <div>
          <div className="text-lg font-extrabold font-display text-cyan-soft leading-tight">رفيق JO</div>
          <div className="text-[11px] text-white/60">مركز القيادة</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3">
        {GROUPS.map((g) => (
          <div key={g.title} className="mb-4">
            <div className="px-5 mb-1 text-[10px] font-bold uppercase tracking-widest text-white/35">
              {g.title}
            </div>
            {g.links.map((l) => (
              <Link key={l.href} href={l.href} className={`nav-item ${isActive(l.href) ? 'nav-item-active' : ''}`}>
                <span className={`material-symbols-outlined text-[20px] ${isActive(l.href) ? 'icon-fill' : ''}`}>
                  {l.icon}
                </span>
                <span>{l.label}</span>
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-9 h-9 rounded-full bg-cyan text-navy flex items-center justify-center font-bold shrink-0">
            {user?.full_name?.charAt(0) ?? 'A'}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{user?.full_name}</div>
            <div className="text-[11px] text-white/50 truncate">{user?.roles?.[0] ?? 'موظف'}</div>
          </div>
        </div>
        <button
          onClick={logout}
          className="mt-1 w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-300 hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}
