'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/auth';
import { useT } from '../lib/i18n';
import { LogoMark } from './Logo';
import { Icon } from './Icon';

interface NavLink {
  href: string;
  labelKey: string;
  icon: string;
}

const GROUPS: { titleKey: string; links: NavLink[] }[] = [
  {
    titleKey: 'nav.group.operations',
    links: [
      { href: '/', labelKey: 'nav.dashboard', icon: 'layout-dashboard' },
      { href: '/insights', labelKey: 'nav.insights', icon: 'brain' },
      { href: '/ride-requests', labelKey: 'nav.rideRequests', icon: 'navigation' },
      { href: '/zones', labelKey: 'nav.zones', icon: 'map' },
      { href: '/universities', labelKey: 'nav.universities', icon: 'graduation-cap' },
    ],
  },
  {
    titleKey: 'nav.group.transport',
    links: [
      { href: '/routes', labelKey: 'nav.routes', icon: 'route' },
      { href: '/plans', labelKey: 'nav.plans', icon: 'clipboard-list' },
      { href: '/zone-prices', labelKey: 'nav.zonePrices', icon: 'circle-dollar-sign' },
      { href: '/subscriptions', labelKey: 'nav.subscriptions', icon: 'repeat' },
      { href: '/trips', labelKey: 'nav.trips', icon: 'car' },
    ],
  },
  {
    titleKey: 'nav.group.network',
    links: [
      { href: '/drivers', labelKey: 'nav.drivers', icon: 'car-front' },
      { href: '/users', labelKey: 'nav.users', icon: 'users' },
    ],
  },
  {
    titleKey: 'nav.group.finance',
    links: [
      { href: '/payments', labelKey: 'nav.payments', icon: 'banknote' },
      { href: '/coupons', labelKey: 'nav.coupons', icon: 'ticket-percent' },
      { href: '/ads', labelKey: 'nav.ads', icon: 'monitor-play' },
      { href: '/withdrawals', labelKey: 'nav.withdrawals', icon: 'wallet' },
      { href: '/cliq', labelKey: 'nav.cliq', icon: 'landmark' },
      { href: '/pricing', labelKey: 'nav.pricing', icon: 'sliders-horizontal' },
      { href: '/reports', labelKey: 'nav.reports', icon: 'activity' },
    ],
  },
  {
    titleKey: 'nav.group.safety',
    links: [
      { href: '/safety', labelKey: 'nav.safety', icon: 'shield' },
      { href: '/disputes', labelKey: 'nav.disputes', icon: 'gavel' },
      { href: '/support', labelKey: 'nav.support', icon: 'headset' },
      { href: '/complaints', labelKey: 'nav.complaints', icon: 'flag' },
      { href: '/security', labelKey: 'nav.security', icon: 'lock' },
    ],
  },
  {
    titleKey: 'nav.group.admin',
    links: [
      { href: '/admins', labelKey: 'nav.admins', icon: 'user-cog' },
      { href: '/notifications', labelKey: 'nav.notify', icon: 'megaphone' },
      { href: '/audit', labelKey: 'nav.audit', icon: 'rotate-ccw-clock' },
      { href: '/profile', labelKey: 'nav.profile', icon: 'circle-user' },
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
  '/ads': 'إدارة المساحات الإعلانية داخل التطبيقات',
  '/withdrawals': 'طلبات سحب أرباح الكباتن',
  '/reports': 'التقارير المالية والإيرادات',
  '/cliq': 'إعدادات CliQ وتغيير الاسم المستعار',
  '/pricing': 'ضبط أسعار الرحلات وعمولة المنصة',
  '/zone-prices': 'أسعار موحّدة ثابتة لكل منطقة↔جامعة',
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

  const isAdmin = (user?.roles ?? []).includes('admin');
  // Hide admin-only links from non-admin staff.
  const adminOnly = new Set(['/admins', '/cliq', '/pricing', '/notifications', '/audit']);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');

  return (
    <aside className="fixed inset-y-0 start-0 h-screen w-64 shrink-0 bg-brand-50 text-ink flex flex-col z-50 border-e border-line">
      {/* Brand */}
      <div className="px-5 py-5 flex items-center gap-3 border-b border-line">
        <LogoMark size={42} />
        <div>
          <div className="text-lg font-bold font-display text-primary leading-tight">رفيق</div>
          <div className="text-[11px] text-muted">{t('brand.tagline')}</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-1">
        {GROUPS.map((g) => (
          <div key={g.titleKey} className="mb-3">
            <div className="px-5 mb-1 text-[10px] font-bold uppercase tracking-widest text-muted/60">
              {t(g.titleKey)}
            </div>
            {g.links.map((l) => {
              if (adminOnly.has(l.href) && !isAdmin) return null;
              const active = isActive(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  title={HINTS[l.href] ?? ''}
                  className={`nav-item ${active ? 'nav-item-active' : ''}`}
                >
                  {/*
                    The active entry used Material Symbols' `FILL 1` axis. Lucide is
                    a stroke set with no fill axis, so the emphasis is carried by a
                    heavier stroke instead — 2.25 against the 1.75 default, which
                    reads at 20px without changing the glyph's silhouette.
                  */}
                  <Icon name={l.icon} size={20} strokeWidth={active ? 2.25 : undefined} />
                  <span className="truncate">{t(l.labelKey)}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-line">
        <Link
          href="/profile"
          className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-brand-100 transition-colors"
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
