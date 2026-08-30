/* ═══════════════════════════════════════════════════════════════════════════
   THE NAVIGATION — one source, four groups, sixteen destinations.

   ── What this replaces ─────────────────────────────────────────────────────

   There were TWO hand-maintained navigation lists, and they had already drifted:

     `Sidebar.GROUPS`   28 links across 6 groups, labelled through `t(labelKey)`
     `Topbar.TARGETS`   23 entries with the Arabic and English text written INLINE,
                        bypassing the dictionary entirely — and missing
                        `/zone-prices`, `/ads`, `/notifications` and `/audit`, so
                        four pages could not be reached from the search at all.

   They also disagreed on wording for the same page: «مركز القيادة» against
   «لوحة القيادة», «مركز الأمان» against «الأمان». Two lists means two truths, and
   the palette's copy was invisible to i18n.

   ── Why 28 became 16 ───────────────────────────────────────────────────────

   The approved reference is `docs/design/v2/06-admin-1/2/3`, whose own header reads
   «من 28 صفحة و6 مجموعات إلى 18 صفحة و4 مجموعات», and phase 10 in `docs/ROADMAP.md`
   is exactly that migration.

   NOTHING is removed. Thirteen pages become TABS inside five destinations, because
   they were always facets of one job: an operator setting up a corridor was walking
   between four sidebar entries (zones, zone-prices, routes, universities) to do one
   task. The old URLs still work — `next.config.js` redirects each to its tab, so a
   bookmark or a link in an old email lands where it used to.

     الجغرافيا والمسارات   zones · zone-prices · routes · universities
     التسعير والخطط        pricing · plans · subscriptions · coupons
     الدعم والشكاوى        support · complaints
     الأمان والتدقيق       security · audit
     الإعدادات والموظفون   admins · cliq · notifications · ads
   ═══════════════════════════════════════════════════════════════════════════ */

/** A tab inside a merged destination. `key` is the `?tab=` value. */
export interface NavTab {
  key: string;
  labelKey: string;
  icon: string;
  /** Only top-level admins see it — same rule the sidebar applied per page. */
  adminOnly?: boolean;
}

export interface NavItem {
  href: string;
  labelKey: string;
  icon: string;
  /** Explains what the page is for. Shown as a hover hint and in the palette. */
  hintKey: string;
  adminOnly?: boolean;
  /** Extra search terms for the command palette — never rendered. */
  keywords?: string;
  /** Present when this destination is a tabbed shell. First tab is the default. */
  tabs?: NavTab[];
}

export interface NavGroup {
  titleKey: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    titleKey: 'nav.group.operations',
    items: [
      {
        href: '/',
        labelKey: 'nav.dashboard',
        icon: 'layout-dashboard',
        hintKey: 'nav.hint.dashboard',
        keywords: 'home overview رئيسية لوحة',
      },
      {
        href: '/ride-requests',
        labelKey: 'nav.rideRequests',
        icon: 'navigation',
        hintKey: 'nav.hint.rideRequests',
        keywords: 'requests live طلبات مطابقة matching',
      },
      {
        href: '/trips',
        labelKey: 'nav.trips',
        icon: 'car',
        hintKey: 'nav.hint.trips',
        keywords: 'trips رحلات مراقبة',
      },
      {
        href: '/insights',
        labelKey: 'nav.insights',
        icon: 'brain',
        hintKey: 'nav.hint.insights',
        keywords: 'ai analytics تحليلات رؤى',
      },
    ],
  },
  {
    titleKey: 'nav.group.network',
    items: [
      {
        href: '/drivers',
        labelKey: 'nav.drivers',
        icon: 'car-front',
        hintKey: 'nav.hint.drivers',
        keywords: 'drivers captains سائق كابتن توثيق',
      },
      {
        /*
         * The one label that deliberately differs from the approved reference.
         *
         * `06-admin-1` calls this entry «الطلاب». The page behind it lists EVERY user —
         * students, captains and staff alike, filterable by type — so «الطلاب» would
         * name a subset of what opening it shows, and an operator looking for a
         * captain's account would reasonably skip it. «المستخدمون» is what the page is.
         * Recorded here rather than silently diverging.
         */
        href: '/users',
        labelKey: 'nav.users',
        icon: 'users',
        hintKey: 'nav.hint.users',
        keywords: 'students طلاب wallet محفظة مستخدمين captains كباتن',
      },
      {
        href: '/geography',
        labelKey: 'nav.geography',
        icon: 'map',
        hintKey: 'nav.hint.geography',
        keywords: 'zones routes universities مناطق مسارات جامعات أسعار corridor',
        tabs: [
          { key: 'zones', labelKey: 'nav.tab.zones', icon: 'map' },
          { key: 'prices', labelKey: 'nav.tab.zonePrices', icon: 'circle-dollar-sign' },
          { key: 'routes', labelKey: 'nav.tab.routes', icon: 'route' },
          { key: 'universities', labelKey: 'nav.tab.universities', icon: 'graduation-cap' },
        ],
      },
    ],
  },
  {
    titleKey: 'nav.group.finance',
    items: [
      {
        href: '/payments',
        labelKey: 'nav.payments',
        icon: 'banknote',
        hintKey: 'nav.hint.payments',
        keywords: 'cliq شحن fraud احتيال مدفوعات',
      },
      {
        href: '/withdrawals',
        labelKey: 'nav.withdrawals',
        icon: 'wallet',
        hintKey: 'nav.hint.withdrawals',
        keywords: 'payout سحوبات أرباح',
      },
      {
        href: '/pricing',
        labelKey: 'nav.pricingPlans',
        icon: 'sliders-horizontal',
        hintKey: 'nav.hint.pricingPlans',
        adminOnly: true,
        keywords: 'tariff commission plans coupons تعرفة عمولة باقات كوبونات اشتراكات',
        tabs: [
          { key: 'tariff', labelKey: 'nav.tab.tariff', icon: 'sliders-horizontal' },
          { key: 'plans', labelKey: 'nav.tab.plans', icon: 'clipboard-list' },
          { key: 'subscriptions', labelKey: 'nav.tab.subscriptions', icon: 'repeat' },
          { key: 'coupons', labelKey: 'nav.tab.coupons', icon: 'ticket-percent' },
        ],
      },
      {
        href: '/reports',
        labelKey: 'nav.reports',
        icon: 'activity',
        hintKey: 'nav.hint.reports',
        keywords: 'reports revenue تقارير إيرادات',
      },
    ],
  },
  {
    titleKey: 'nav.group.trust',
    items: [
      {
        href: '/safety',
        labelKey: 'nav.safety',
        icon: 'shield',
        hintKey: 'nav.hint.safety',
        keywords: 'sos risk مخاطر سلامة طوارئ',
      },
      {
        href: '/support',
        labelKey: 'nav.supportComplaints',
        icon: 'headset',
        hintKey: 'nav.hint.supportComplaints',
        keywords: 'tickets tazkara تذاكر شكاوى دعم',
        tabs: [
          { key: 'tickets', labelKey: 'nav.tab.tickets', icon: 'headset' },
          { key: 'complaints', labelKey: 'nav.tab.complaints', icon: 'flag' },
        ],
      },
      {
        href: '/disputes',
        labelKey: 'nav.disputes',
        icon: 'gavel',
        hintKey: 'nav.hint.disputes',
        keywords: 'disputes نزاعات تنازعات',
      },
      {
        href: '/security',
        labelKey: 'nav.securityAudit',
        icon: 'lock',
        hintKey: 'nav.hint.securityAudit',
        keywords: 'mfa audit تدقيق أمان سجل',
        tabs: [
          { key: 'sessions', labelKey: 'nav.tab.security', icon: 'lock' },
          { key: 'audit', labelKey: 'nav.tab.audit', icon: 'rotate-ccw-clock', adminOnly: true },
        ],
      },
      {
        href: '/settings',
        labelKey: 'nav.settingsStaff',
        icon: 'settings',
        hintKey: 'nav.hint.settingsStaff',
        adminOnly: true,
        keywords: 'staff admins cliq broadcast ads موظفين إعدادات إشعارات إعلانات',
        tabs: [
          { key: 'staff', labelKey: 'nav.tab.staff', icon: 'user-cog' },
          { key: 'cliq', labelKey: 'nav.tab.cliq', icon: 'landmark' },
          { key: 'broadcast', labelKey: 'nav.tab.broadcast', icon: 'megaphone' },
          { key: 'ads', labelKey: 'nav.tab.ads', icon: 'monitor-play' },
        ],
      },
    ],
  },
];

/** Flat list, in sidebar order — what the command palette searches. */
export const NAV_ITEMS: NavItem[] = NAV.flatMap((group) => group.items);

/**
 * `/profile` is reachable from the footer, not the nav list — the approved sidebar
 * puts the signed-in user there. Kept out of `NAV` so it cannot appear twice, but
 * still searchable.
 */
export const PROFILE: NavItem = {
  href: '/profile',
  labelKey: 'nav.profile',
  icon: 'circle-user',
  hintKey: 'nav.hint.profile',
  keywords: 'profile me ملفي حسابي كلمة المرور',
};

/** Which nav entry owns a pathname, for the active state. */
export function activeHref(pathname: string): string {
  if (pathname === '/') return '/';

  const match = NAV_ITEMS.concat(PROFILE)
    .filter((item) => item.href !== '/')
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  return match?.href ?? '';
}

/**
 * The tab to show for a `?tab=` value: the requested one when it exists, else the
 * first. Returning the first rather than nothing is what stops `/settings?tab=typo`
 * from rendering an empty shell with no explanation.
 */
export function resolveTab(item: NavItem, requested: string | null): NavTab | null {
  if (!item.tabs || item.tabs.length === 0) return null;

  return item.tabs.find((tab) => tab.key === requested) ?? item.tabs[0] ?? null;
}
