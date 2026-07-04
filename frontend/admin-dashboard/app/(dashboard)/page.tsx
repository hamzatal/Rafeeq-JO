'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { FinancialReport, Dispute } from '@rafeeq/shared';
import type { ActivityItem, ActivityType } from '@rafeeq/api-client';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/lib/auth';
import { useT } from '../../src/lib/i18n';
import { usePending } from '../../src/lib/pending';
import { Skeleton, StatCardsSkeleton } from '../../src/components/Skeleton';

type Loc = 'ar' | 'en';

/** Localised copy for each activity/attention area (Arabic-first, no i18n keys needed). */
const AREA: Record<ActivityType, { icon: string; ar: string; en: string }> = {
  driver_pending: { icon: 'sports_motorsports', ar: 'كابتن جديد بانتظار مراجعة الوثائق', en: 'New captain awaiting document review' },
  payment_pending: { icon: 'payments', ar: 'طلب شحن محفظة بانتظار التدقيق', en: 'Wallet top-up awaiting review' },
  withdrawal_pending: { icon: 'account_balance_wallet', ar: 'طلب سحب أرباح بانتظار المعالجة', en: 'Withdrawal request pending' },
  complaint_open: { icon: 'report', ar: 'شكوى جديدة بحاجة لمعالجة', en: 'New complaint to handle' },
  sos_active: { icon: 'shield', ar: 'بلاغ طوارئ SOS نشط', en: 'Active SOS incident' },
};

const CHIPS: { key: keyof import('@rafeeq/api-client').PendingCounts; href: string; ar: string; en: string; icon: string }[] = [
  { key: 'drivers_pending', href: '/drivers', ar: 'كباتن جدد', en: 'New captains', icon: 'sports_motorsports' },
  { key: 'payments_pending', href: '/payments', ar: 'شحن بانتظار', en: 'Top-ups', icon: 'payments' },
  { key: 'withdrawals_pending', href: '/withdrawals', ar: 'سحوبات', en: 'Withdrawals', icon: 'account_balance_wallet' },
  { key: 'complaints_open', href: '/complaints', ar: 'شكاوى', en: 'Complaints', icon: 'report' },
  { key: 'disputes_open', href: '/disputes', ar: 'نزاعات', en: 'Disputes', icon: 'gavel' },
  { key: 'support_open', href: '/support', ar: 'دعم', en: 'Support', icon: 'support_agent' },
  { key: 'sos_active', href: '/safety', ar: 'طوارئ', en: 'SOS', icon: 'shield' },
];

function relativeTime(iso: string | null, loc: Loc): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return loc === 'ar' ? 'الآن' : 'now';
  if (m < 60) return loc === 'ar' ? `قبل ${m} د` : `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return loc === 'ar' ? `قبل ${h} س` : `${h}h ago`;
  const d = Math.round(h / 24);
  return loc === 'ar' ? `قبل ${d} ي` : `${d}d ago`;
}

const jod = (fils: number) => `${(fils / 1000).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const today = () => new Date().toISOString().slice(0, 10);

interface Kpi {
  label: string;
  value: string;
  unit?: string;
  icon: string;
  trend?: string;
  bar: number; // 0..1
  danger?: boolean;
}

function KpiCard({ k }: { k: Kpi }) {
  return (
    <div className={`kpi-card ${k.danger ? 'border-danger/40' : ''}`}>
      <div className="flex justify-between items-start mb-3">
        <span className="text-xs font-bold uppercase tracking-wider muted-text">{k.label}</span>
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center ${
            k.danger ? 'bg-danger/10 text-danger' : 'bg-cyan/15 text-cyan-deep'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">{k.icon}</span>
        </div>
      </div>
      <div className={`stat-number ${k.danger ? 'text-danger' : ''}`}>
        {k.unit && <span className="text-xl font-bold ml-1 align-middle">{k.unit}</span>}
        {k.value}
      </div>
      {k.trend && (
        <div className={`text-xs mt-2 flex items-center gap-1 ${k.danger ? 'text-danger' : 'text-success'}`}>
          <span className="material-symbols-outlined text-[15px]">{k.danger ? 'priority_high' : 'trending_up'}</span>
          {k.trend}
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-line">
        <div
          className={`h-full ${k.danger ? 'bg-danger' : 'bg-cyan'}`}
          style={{ width: `${Math.max(8, Math.min(100, k.bar * 100))}%` }}
        />
      </div>
    </div>
  );
}

export default function CommandCenter() {
  const { user } = useAuth();
  const { t, locale } = useT();
  const { counts, total } = usePending();
  const loc: Loc = locale === 'en' ? 'en' : 'ar';
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const [rep, disp, act] = await Promise.allSettled([
        api.reports.financial({ from: monthStart(), to: today() }),
        api.disputes.list({ status: 'open' }),
        api.admin.activity(10),
      ]);
      if (!active) return;
      if (rep.status === 'fulfilled') setReport(rep.value);
      if (disp.status === 'fulfilled') setDisputes(disp.value);
      if (act.status === 'fulfilled') setActivity(act.value);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const criticalOpen = useMemo(
    () => disputes.filter((d) => d.severity === 'critical' || d.severity === 'high').length,
    [disputes],
  );

  const kpis: Kpi[] = [
    {
      label: t('home.kpi.rides'),
      value: (report?.rides_count ?? 0).toLocaleString('en-US'),
      icon: 'directions_car',
      trend: t('home.trend.sinceMonth'),
      bar: 0.75,
    },
    {
      label: t('home.kpi.commission'),
      value: jod(report?.commission_fils ?? 0),
      unit: 'JOD',
      icon: 'account_balance_wallet',
      trend: t('home.trend.netCommission'),
      bar: 0.8,
    },
    {
      label: t('home.kpi.gross'),
      value: jod(report?.gross_fare_fils ?? 0),
      unit: 'JOD',
      icon: 'payments',
      trend: t('home.trend.grossValue'),
      bar: 0.6,
    },
    {
      label: t('home.kpi.disputes'),
      value: String(criticalOpen),
      icon: 'warning',
      trend: criticalOpen > 0 ? t('home.trend.needsReview') : t('home.trend.none'),
      bar: criticalOpen > 0 ? 0.3 : 0.05,
      danger: criticalOpen > 0,
    },
  ];

  const maxZone = Math.max(1, ...(report?.by_zone ?? []).map((z) => z.commission_fils));

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap justify-between items-end gap-3">
        <div>
          <h1 className="page-title">{t('home.title')}</h1>
          <p className="muted-text mt-1">{t('home.welcome')} {user?.full_name} — {t('home.subtitle')}</p>
        </div>
        <div className="text-xs font-mono text-muted">{t('home.lastUpdate')}: {new Date().toLocaleString(locale)}</div>
      </div>

      {/* Attention bar — clickable chips for everything awaiting an action */}
      <div className="flex flex-wrap items-center gap-2">
        {total === 0 ? (
          <div className="flex items-center gap-2 text-sm text-success font-semibold">
            <span className="material-symbols-outlined text-[20px]">task_alt</span>
            {loc === 'ar' ? 'كل شي تمام — لا يوجد ما ينتظر إجراءً' : 'All clear — nothing awaiting action'}
          </div>
        ) : (
          CHIPS.filter((c) => (counts[c.key] || 0) > 0).map((c) => (
            <Link
              key={c.key}
              href={c.href}
              className="group flex items-center gap-2 rounded-full border border-danger/30 bg-danger/5 hover:bg-danger/10 transition-colors ps-2 pe-3 py-1.5"
            >
              <span className="material-symbols-outlined text-[18px] text-danger">{c.icon}</span>
              <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-danger text-white text-[11px] font-extrabold flex items-center justify-center leading-none">
                {counts[c.key] > 99 ? '99+' : counts[c.key]}
              </span>
              <span className="text-sm font-semibold surface-text">{loc === 'ar' ? c.ar : c.en}</span>
            </Link>
          ))
        )}
      </div>

      {/* What's new — newest-first actionable feed */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex justify-between items-center">
          <h3 className="font-bold text-navy dark:text-dtext flex items-center gap-2">
            <span className="material-symbols-outlined text-cyan-deep text-[20px]">bolt</span>
            {loc === 'ar' ? 'شو صار جديد' : "What's new"}
          </h3>
          <span className="text-xs text-muted">{loc === 'ar' ? 'آخر التحديثات على المنصّة' : 'Latest platform activity'}</span>
        </div>
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : activity.length === 0 ? (
          <div className="p-6 text-center text-muted">{loc === 'ar' ? 'لا يوجد نشاط جديد' : 'No new activity'}</div>
        ) : (
          <ul className="divide-y divide-line dark:divide-dline">
            {activity.map((a) => {
              const meta = AREA[a.type];
              if (!meta) return null;
              return (
                <li key={`${a.type}-${a.id}`}>
                  <Link href={a.href} className="flex items-center gap-3 px-5 py-3 hover:bg-cyan/5 transition-colors">
                    <span className="w-9 h-9 shrink-0 rounded-full bg-cyan/15 text-cyan-deep flex items-center justify-center">
                      <span className="material-symbols-outlined text-[19px]">{meta.icon}</span>
                    </span>
                    <span className="flex-1 min-w-0 text-sm font-semibold surface-text truncate">
                      {loc === 'ar' ? meta.ar : meta.en}
                    </span>
                    <span className="text-xs text-muted whitespace-nowrap">{relativeTime(a.at, loc)}</span>
                    <span className="material-symbols-outlined text-[18px] text-muted">chevron_left</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* KPI row */}
      {loading ? (
        <StatCardsSkeleton />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {kpis.map((k) => (
            <KpiCard key={k.label} k={k} />
          ))}
        </div>
      )}

      {/* Bento: revenue-by-zone chart + quick links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 card p-0 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-line flex justify-between items-center">
            <h3 className="font-bold text-navy dark:text-dtext flex items-center gap-2">
              <span className="material-symbols-outlined text-cyan-deep text-[20px]">monitoring</span>
              {t('home.commissionByZone')}
            </h3>
            <Link href="/reports" className="text-sm text-cyan-deep hover:underline">
              {t('home.fullReports')}
            </Link>
          </div>
          <div className="p-5 flex-1 min-h-[280px]">
            {loading ? (
              <Skeleton className="h-[240px] w-full" />
            ) : (report?.by_zone?.length ?? 0) === 0 ? (
              <div className="h-full flex items-center justify-center text-muted">{t('home.noData')}</div>
            ) : (
              <div className="flex items-end gap-3 h-[260px]">
                {report!.by_zone.slice(0, 8).map((z, i) => (
                  <div key={z.zone_id ?? i} className="flex-1 flex flex-col items-center justify-end gap-2 h-full">
                    <div className="text-[11px] font-mono text-muted">{jod(z.commission_fils)}</div>
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-navy to-cyan-deep min-h-[6px] transition-all"
                      style={{ height: `${(z.commission_fils / maxZone) * 100}%` }}
                    />
                    <div className="text-[10px] text-muted truncate w-full text-center">
                      {z.zone_id ? z.zone_id.slice(0, 6) : t('home.general')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick links / module summary */}
        <div className="card flex flex-col">
          <h3 className="font-bold text-navy dark:text-dtext mb-4">{t('home.quickAccess')}</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: '/disputes', label: t('nav.disputes'), icon: 'gavel' },
              { href: '/withdrawals', label: t('nav.withdrawals'), icon: 'account_balance_wallet' },
              { href: '/drivers', label: t('nav.drivers'), icon: 'sports_motorsports' },
              { href: '/zones', label: t('nav.zones'), icon: 'map' },
              { href: '/reports', label: t('nav.reports'), icon: 'monitoring' },
              { href: '/safety', label: t('nav.safety'), icon: 'shield' },
            ].map((q) => (
              <Link
                key={q.href}
                href={q.href}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-line bg-background hover:bg-cyan/5 hover:border-cyan/40 transition-colors py-4 dark:bg-dsurface dark:border-dline"
              >
                <span className="material-symbols-outlined text-cyan-deep">{q.icon}</span>
                <span className="text-xs font-semibold surface-text">{q.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent open disputes */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex justify-between items-center">
          <h3 className="font-bold text-navy dark:text-dtext flex items-center gap-2">
            <span className="material-symbols-outlined text-danger text-[20px]">gavel</span>
            {t('home.recentDisputes')}
          </h3>
          <Link href="/disputes" className="text-sm text-cyan-deep hover:underline">
            {t('common.viewAll')}
          </Link>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : disputes.length === 0 ? (
            <div className="p-6 text-center text-muted">{t('home.noDisputes')}</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('home.account')}</th>
                  <th>{t('home.type')}</th>
                  <th>{t('home.severity')}</th>
                  <th>{t('home.riskScore')}</th>
                </tr>
              </thead>
              <tbody>
                {disputes.slice(0, 6).map((d) => (
                  <tr key={d.id}>
                    <td className="font-medium">{d.subject.name ?? '—'}</td>
                    <td className="text-muted">{d.type}</td>
                    <td>
                      <span
                        className={
                          d.severity === 'critical' || d.severity === 'high' ? 'pill-danger' : 'pill-warning'
                        }
                      >
                        {d.severity_label}
                      </span>
                    </td>
                    <td className="font-mono">{d.risk_score ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
