'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatFils } from '@rafeeq/shared';
import type { FinancialReport } from '@rafeeq/shared';
import { api } from '../../../src/lib/api';
import { useT } from '../../../src/lib/i18n';
import { Skeleton } from '../../../src/components/Skeleton';
import { downloadBlob, stamp } from '../../../src/lib/download';

const jod = (fils: number) => formatFils(fils);

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card">
      <div className="muted-text text-sm">{label}</div>
      <div className="text-2xl font-extrabold surface-text mt-1">{value}</div>
      {hint && <div className="text-xs text-muted mt-1">{hint}</div>}
    </div>
  );
}

export default function ReportsPage() {
  const { t } = useT();
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const blob = await api.admin.exportFinancialCsv({ from, to });
      downloadBlob(blob, `financial-${stamp()}.csv`);
    } catch {
      setError(t('reports.loadError'));
    } finally {
      setExporting(false);
    }
  };

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api.reports
      .financial({ from, to })
      .then(setReport)
      .catch(() => setError(t('reports.loadError')))
      .finally(() => setLoading(false));
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h1 className="page-title mb-4">{t('nav.reports')}</h1>

      <div className="card mb-5 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs mb-1 muted-text">{t('reports.from')}</label>
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs mb-1 muted-text">{t('reports.to')}</label>
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button onClick={load} className="btn-primary">{t('reports.show')}</button>
        <button onClick={exportCsv} disabled={exporting} className="btn-outline inline-flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px]">download</span>
          {exporting ? t('common.loading') : t('reports.exportCsv')}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-danger/30 bg-red-50 px-3 py-2 text-sm text-danger">{error}</div>
      )}

      {loading ? (
        <div className="card space-y-3">{Array.from({ length: 5 }).map((_, i) => (<Skeleton key={i} className="h-10 w-full" />))}</div>
      ) : report ? (
        <>
          {/*
            Two groups, deliberately separated by a heading and never summed on
            screen. "Cash" is what the platform received; "tariff" is what the
            seats were worth. The old single grid put commission next to
            subscription revenue with no indication that the first already
            contained the second.
          */}
          <h2 className="text-lg font-bold surface-text mb-2">{t('reports.cashGroup')}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              label={t('reports.platformRevenue')}
              value={jod(report.platform_revenue_fils)}
              hint={t('reports.platformRevenueHint')}
            />
            <StatCard label={t('reports.rideCommission')} value={jod(report.ride_commission_fils)} />
            <StatCard label={t('reports.subscriptionRevenue')} value={jod(report.subscription_revenue_fils)} />
            <StatCard label={t('reports.payoutsPaid')} value={jod(report.payouts_paid_fils)} />
            <StatCard label={t('reports.topups')} value={jod(report.topups_fils)} />
            <StatCard
              label={t('reports.subscriptionFunded')}
              value={jod(report.subscription_funded_commission_fils)}
              hint={t('reports.subscriptionFundedHint')}
            />
          </div>

          <h2 className="text-lg font-bold surface-text mb-2">{t('reports.tariffGroup')}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
            <StatCard label={t('reports.gross')} value={jod(report.gross_fare_fils)} />
            <StatCard label={t('reports.commission')} value={jod(report.commission_fils)} hint={t('reports.commissionHint')} />
            <StatCard label={t('reports.captainEarnings')} value={jod(report.captain_earnings_fils)} />
            <StatCard label={t('reports.discount')} value={jod(report.discount_fils)} hint={t('reports.discountHint')} />
            <StatCard label={t('reports.ridesCount')} value={String(report.rides_count)} />
          </div>

          {/*
            The identity, shown on screen rather than only asserted in a test.
            A reconciliation that only CI can see is one nobody checks on the day
            it starts failing.
          */}
          {(() => {
            const balances =
              report.gross_fare_fils ===
              report.commission_fils + report.captain_earnings_fils + report.discount_fils;
            return (
              <div
                className={`mb-6 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                  balances
                    ? 'border-line bg-background text-muted'
                    : 'border-danger/30 bg-red-50 text-danger'
                }`}
              >
                <span className="material-symbols-rounded text-[18px]">
                  {balances ? 'check_circle' : 'error'}
                </span>
                <span className="font-mono">{t('reports.identity')}</span>
                <span className="font-medium">
                  {balances ? t('reports.identityOk') : t('reports.identityBad')}
                </span>
              </div>
            );
          })()}

          <h2 className="text-lg font-bold surface-text mb-2">{t('reports.byFunding')}</h2>
          <div className="card p-0 overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead className="table-head">
                <tr>
                  <th className="text-right p-3 font-medium">{t('reports.colFunding')}</th>
                  <th className="text-right p-3 font-medium">{t('reports.colRides')}</th>
                  <th className="text-right p-3 font-medium">{t('reports.colFares')}</th>
                  <th className="text-right p-3 font-medium">{t('reports.colCommission')}</th>
                  <th className="text-right p-3 font-medium">{t('reports.colCaptainShare')}</th>
                  <th className="text-right p-3 font-medium">{t('reports.colDiscount')}</th>
                </tr>
              </thead>
              <tbody>
                {(['wallet', 'cash', 'subscription'] as const).map((src) => {
                  const f = report.by_funding[src];
                  return (
                    <tr key={src} className="row-line">
                      <td className="p-3 surface-text">
                        {t(
                          src === 'wallet'
                            ? 'reports.fundingWallet'
                            : src === 'cash'
                              ? 'reports.fundingCash'
                              : 'reports.fundingSubscription',
                        )}
                      </td>
                      <td className="p-3 text-muted">{f.rides_count}</td>
                      <td className="p-3 text-muted">{jod(f.gross_fare_fils)}</td>
                      <td className="p-3 font-medium surface-text">{jod(f.commission_fils)}</td>
                      <td className="p-3 text-muted">{jod(f.captain_share_fils)}</td>
                      <td className="p-3 text-muted">{jod(f.discount_fils)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <h2 className="text-lg font-bold surface-text mb-2">{t('reports.byZone')}</h2>
          <div className="card p-0 overflow-hidden">
            {report.by_zone.length === 0 ? (
              <div className="p-6 text-center text-muted">{t('reports.noData')}</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="table-head">
                  <tr>
                    <th className="text-right p-3 font-medium">{t('reports.colZone')}</th>
                    <th className="text-right p-3 font-medium">{t('reports.colRides')}</th>
                    <th className="text-right p-3 font-medium">{t('reports.colFares')}</th>
                    <th className="text-right p-3 font-medium">{t('reports.colCommission')}</th>
                    <th className="text-right p-3 font-medium">{t('reports.colRideCommission')}</th>
                    <th className="text-right p-3 font-medium">{t('reports.colDiscount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.by_zone.map((z, i) => (
                    <tr key={z.zone_id ?? `none-${i}`} className="row-line">
                      <td className="p-3 surface-text">{z.zone_id ?? t('reports.noZone')}</td>
                      <td className="p-3 text-muted">{z.rides_count}</td>
                      <td className="p-3 text-muted">{jod(z.gross_fare_fils)}</td>
                      <td className="p-3 text-muted">{jod(z.commission_fils)}</td>
                      <td className="p-3 font-medium surface-text">{jod(z.ride_commission_fils)}</td>
                      <td className="p-3 text-muted">{jod(z.discount_fils)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
