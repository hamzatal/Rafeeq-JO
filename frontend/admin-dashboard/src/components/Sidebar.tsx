'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/auth';
import { useT } from '../lib/i18n';
import { usePending, ROUTE_BADGE } from '../lib/pending';
import { LogoMark } from './Logo';

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
      { href: '/notifications', labelKey: 'nav.notify', icon: 'campaign' },
      { href: '/audit', labelKey: 'nav.audit', icon: 'history' },
      { href: '/profile', labelKey: 'nav.profile', icon: 'account_circle' },
    ],
  },
];

/** Short hover hints explaining what each page does (non-intrusive tooltips). */
const HINTS: Record<string, string> = {
  '/': 'نظرة عامة على مؤشرات المنصّة اللحظية',
  '/insights': 'تحليلات ورؤى مولّدة بالذكاء الاصطناعي',
  '/ride-requests': 'طلبات الرحلات الواردة وحالتها',
  '/zones': 'مناطق التغطية والحدود الجغرافية',
  '/universities': 'الجامعات ونقاط الالتقاط',
  '/routes': 'مسارات النقل الثابتة',
  '/plans': 'خطط الاشتراك وأسعارها',
  '/subscriptions': 'اشتراكات الطلاب النشطة',
  '/trips': 'مراقبة الرحلات الجارية والمكتملة',
  '/drivers': 'الكباتن والتحقق من الوثائق',
  '/users': 'كل المستخدمين + شحن المحافظ',
  '/payments': 'مراجعة شحنات CliQ + تدقيق الاحتيال بالـ AI',
  '/coupons': 'إنشاء وإدارة كوبونات الخصم',
  '/withdrawals': 'طلبات سحب أرباح الكباتن',
  '/reports': 'التقارير المالية والإيرادات',
  '/cliq': 'إعدادات CliQ وتغيير الاسم المستعار',
  '/safety': 'بلاغات SOS وإدارة المخاطر',
  '/disputes': 'النزاعات المالية بين الأطراف',
  '/support': 'تذاكر الدعم مع فرز ذكي بالـ AI',
  '/complaints': 'الشكاوى وتصعيدها الذكي',
  '/security': 'المصادقة الثنائية وسجلّات الأمان',
  '/admins': 'إضافة وتعديل موظفي الإدارة وأدوارهم',
  '/notifications': 'إرسال إشعارات لفئات المستخدمين + إرفاق كوبونات',
  '/audit': 'سجلّ التدقيق: كل إجراء حسّاس مع إمكانية التصدير CSV',
  '/profile': 'تعديل بياناتك وكلمة المرور',
};

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t } = useT();
  const { counts } = usePending();

  const isAdmin = (user?.roles ?? []).includes('admin');
  // Hide admin-only links from non-admin staff.
  const adminOnly = new Set(['/admins', '/cliq', '/notifications', '/audit']);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');

  return (
    <aside className="fixed inset-y-0 start-0 h-screen w-64 shrink-0 bg-navy text-white flex flex-col z-50 shadow-lift">
      {/* Brand */}
      <div className="px-5 py-5 flex items-center gap-3 border-b border-white/10">
        <LogoMark size={42} />
        <div>
          <div className="text-lg font-extrabold font-display text-cyan-soft leading-tight">Rafeeq JO</div>
          <div className="text-[11px] text-white/60">{t('brand.tagline')}</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-1">
        {GROUPS.map((g) => (
          <div key={g.titleKey} className="mb-3">
            <div className="px-5 mb-1 text-[10px] font-bold uppercase tracking-widest text-white/30">
              {t(g.titleKey)}
            </div>
            {g.links.map((l) => {
              if (adminOnly.has(l.href) && !isAdmin) return null;
              const active = isActive(l.href);
              const badgeKey = ROUTE_BADGE[l.href];
              const count = badgeKey ? counts[badgeKey] : 0;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  title={HINTS[l.href] ?? ''}
                  className={`nav-item ${active ? 'nav-item-active' : ''}`}
                >
                  <span className={`material-symbols-outlined text-[20px] ${active ? 'icon-fill' : ''}`}>
                    {l.icon}
                  </span>
                  <span className="truncate">{t(l.labelKey)}</span>
                  {count > 0 ? (
                    <span
                      className="ms-auto shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-danger text-white text-[11px] font-extrabold flex items-center justify-center leading-none shadow-sm"
                      aria-label={`${count}`}
                    >
                      {count > 99 ? '99+' : count}
                    </span>
                  ) : null}
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
