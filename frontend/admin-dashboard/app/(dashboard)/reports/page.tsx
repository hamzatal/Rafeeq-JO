'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FinancialReport } from '@rafeeq/shared';
import { api } from '../../../src/lib/api';
import { useT } from '../../../src/lib/i18n';
import { downloadBlob, stamp } from '../../../src/lib/download';

const jod = (fils: number) => `${(fils / 1000).toFixed(3)} د.أ`;

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
        <div className="card text-center text-muted">{t('common.loading')}</div>
      ) : report ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
            <StatCard label={t('reports.commission')} value={jod(report.commission_fils)} hint={t('reports.commissionHint')} />
            <StatCard label={t('reports.gross')} value={jod(report.gross_fare_fils)} />
            <StatCard label={t('reports.ridesCount')} value={String(report.rides_count)} />
            <StatCard label={t('reports.captainEarnings')} value={jod(report.captain_earnings_fils)} />
            <StatCard label={t('reports.payoutsPaid')} value={jod(report.payouts_paid_fils)} />
            <StatCard label={t('reports.topups')} value={jod(report.topups_fils)} />
            <StatCard label={t('reports.subscriptionRevenue')} value={jod(report.subscription_revenue_fils)} />
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
                  </tr>
                </thead>
                <tbody>
                  {report.by_zone.map((z, i) => (
                    <tr key={z.zone_id ?? `none-${i}`} className="row-line">
                      <td className="p-3 surface-text">{z.zone_id ?? t('reports.noZone')}</td>
                      <td className="p-3 text-muted">{z.rides_count}</td>
                      <td className="p-3 text-muted">{jod(z.gross_fare_fils)}</td>
                      <td className="p-3 font-medium surface-text">{jod(z.commission_fils)}</td>
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
