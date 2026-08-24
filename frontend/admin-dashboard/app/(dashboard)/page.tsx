'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { FinancialReport, Dispute } from '@rafeeq/shared';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/lib/auth';
import { useT } from '../../src/lib/i18n';
import { Skeleton, StatCardsSkeleton } from '../../src/components/Skeleton';

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
    <div className={`kpi-card p-6 flex flex-col justify-between ${k.danger ? 'border-danger/40' : ''}`}>
      <div className="flex justify-between items-start mb-4">
        {/* Icon tile (right) — Stitch _26 */}
        <div
          className={`w-12 h-12 rounded-lg flex items-center justify-center ${
            k.danger ? 'bg-danger/10 text-danger' : 'bg-[#E7EEFF] text-primary'
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">{k.icon}</span>
        </div>
        {/* Trend pill (left) */}
        {k.trend && (
          <span
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
              k.danger ? 'bg-danger/10 text-danger' : 'bg-teal-soft/40 text-teal-deep'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">{k.danger ? 'priority_high' : 'trending_up'}</span>
            {k.trend}
          </span>
        )}
      </div>
      <div>
        <p className="muted-text text-sm mb-1">{k.label}</p>
        <div className={`stat-number ${k.danger ? 'text-danger' : ''}`}>
          {k.value}
          {k.unit && <span className="text-base font-bold mr-1 align-baseline muted-text">{k.unit}</span>}
        </div>
      </div>
    </div>
  );
}

export default function CommandCenter() {
  const { user } = useAuth();
  const { t, locale } = useT();
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const [rep, disp] = await Promise.allSettled([
        api.reports.financial({ from: monthStart(), to: today() }),
        api.disputes.list({ status: 'open' }),
      ]);
      if (!active) return;
      if (rep.status === 'fulfilled') setReport(rep.value);
      if (disp.status === 'fulfilled') setDisputes(disp.value);
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
