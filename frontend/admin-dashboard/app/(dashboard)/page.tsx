'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { formatJod } from '@rafeeq/shared';
import type { FinancialReport, Dispute } from '@rafeeq/shared';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/lib/auth';
import { useT } from '../../src/lib/i18n';
import { Skeleton, StatCardsSkeleton } from '../../src/components/Skeleton';
import { Icon } from '../../src/components/Icon';

/*
 * Money goes through the shared formatter. It used to be:
 *   const jod = (fils) => `${(fils / 1000).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
 * which dropped ALL THREE decimals off the platform's own revenue — 1,234,999 fils
 * rendered as "1,235", a full dinar high — and produced a bare Latin numeral with no
 * bidi isolation inside an RTL page, so the digits could reorder against the label.
 *
 * It slipped past `check:money` because that gate only looked for `.toFixed(2)` and a
 * hand-written «د.أ». A rule for it has been added.
 */
const jod = (fils: number) => formatJod(fils);
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
        {/* Icon tile (right) */}
        <div
          className={`w-12 h-12 rounded-lg flex items-center justify-center ${
            k.danger ? 'bg-danger/10 text-danger' : 'bg-brand-100 text-primary'
          }`}
        >
          <Icon name={k.icon} size={22} />
        </div>
        {/* Trend pill (left) */}
        {k.trend && (
          <span
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
              k.danger ? 'bg-danger/10 text-danger' : 'bg-brand-100/40 text-primary-dark'
            }`}
          >
            <Icon name={k.danger ? 'triangle-alert' : 'trending-up'} size={14} />
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
      icon: 'car',
      trend: t('home.trend.sinceMonth'),
      bar: 0.75,
    },
    {
      label: t('home.kpi.commission'),
      // platform_revenue_fils, not commission_fils: the latter double-counts
      // commission booked on subscription-covered seats.
      value: jod(report?.platform_revenue_fils ?? 0),
      unit: 'JOD',
      icon: 'wallet',
      trend: t('home.trend.netCommission'),
      bar: 0.8,
    },
    {
      label: t('home.kpi.gross'),
      value: jod(report?.gross_fare_fils ?? 0),
      unit: 'JOD',
      icon: 'banknote',
      trend: t('home.trend.grossValue'),
      bar: 0.6,
    },
    {
      label: t('home.kpi.disputes'),
      value: String(criticalOpen),
      icon: 'triangle-alert',
      trend: criticalOpen > 0 ? t('home.trend.needsReview') : t('home.trend.none'),
      bar: criticalOpen > 0 ? 0.3 : 0.05,
      danger: criticalOpen > 0,
    },
  ];

  const maxZone = Math.max(1, ...(report?.by_zone ?? []).map((z) => z.ride_commission_fils));

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
            <h3 className="font-bold text-ink flex items-center gap-2">
              <Icon name="activity" size={20} className="text-primary-dark" />
              {t('home.commissionByZone')}
            </h3>
            <Link href="/reports" className="text-sm text-primary-dark hover:underline">
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
                    <div className="text-[11px] font-mono text-muted">{jod(z.ride_commission_fils)}</div>
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-primary to-primary-dark min-h-[6px] transition-all"
                      style={{ height: `${(z.ride_commission_fils / maxZone) * 100}%` }}
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
          <h3 className="font-bold text-ink mb-4">{t('home.quickAccess')}</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: '/disputes', label: t('nav.disputes'), icon: 'gavel' },
              { href: '/withdrawals', label: t('nav.withdrawals'), icon: 'wallet' },
              { href: '/drivers', label: t('nav.drivers'), icon: 'car-front' },
              { href: '/zones', label: t('nav.zones'), icon: 'map' },
              { href: '/reports', label: t('nav.reports'), icon: 'activity' },
              { href: '/safety', label: t('nav.safety'), icon: 'shield' },
            ].map((q) => (
              <Link
                key={q.href}
                href={q.href}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-line bg-background hover:bg-primary/5 hover:border-primary/40 transition-colors py-4"
              >
                <Icon name={q.icon} className="text-primary-dark" />
                <span className="text-xs font-semibold surface-text">{q.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent open disputes */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex justify-between items-center">
          <h3 className="font-bold text-ink flex items-center gap-2">
            <Icon name="gavel" size={20} className="text-danger" />
            {t('home.recentDisputes')}
          </h3>
          <Link href="/disputes" className="text-sm text-primary-dark hover:underline">
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
