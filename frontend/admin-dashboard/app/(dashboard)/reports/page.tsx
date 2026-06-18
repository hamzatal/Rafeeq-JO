'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FinancialReport } from '@rafeeq/shared';
import { api } from '../../../src/lib/api';

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
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api.reports
      .financial({ from, to })
      .then(setReport)
      .catch(() => setError('تعذّر تحميل التقرير'))
      .finally(() => setLoading(false));
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h1 className="page-title mb-4">التقارير المالية</h1>

      <div className="card mb-5 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs mb-1 muted-text">من تاريخ</label>
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs mb-1 muted-text">إلى تاريخ</label>
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button onClick={load} className="btn-primary">عرض</button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-danger/30 bg-red-50 px-3 py-2 text-sm text-danger">{error}</div>
      )}

      {loading ? (
        <div className="card text-center text-muted">جارٍ التحميل...</div>
      ) : report ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
            <StatCard label="عمولة المنصة (الإيراد)" value={jod(report.commission_fils)} hint="صافي ربح المنصة من الرحلات" />
            <StatCard label="إجمالي الأجور المحصّلة" value={jod(report.gross_fare_fils)} />
            <StatCard label="عدد الرحلات المدفوعة" value={String(report.rides_count)} />
            <StatCard label="أرباح الكباتن" value={jod(report.captain_earnings_fils)} />
            <StatCard label="السحوبات المدفوعة" value={jod(report.payouts_paid_fils)} />
            <StatCard label="شحن المحافظ" value={jod(report.topups_fils)} />
            <StatCard label="إيراد الاشتراكات" value={jod(report.subscription_revenue_fils)} />
          </div>

          <h2 className="text-lg font-bold surface-text mb-2">التفصيل حسب المنطقة</h2>
          <div className="card p-0 overflow-hidden">
            {report.by_zone.length === 0 ? (
              <div className="p-6 text-center text-muted">لا توجد بيانات للفترة المحددة</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="table-head">
                  <tr>
                    <th className="text-right p-3 font-medium">المنطقة</th>
                    <th className="text-right p-3 font-medium">عدد الرحلات</th>
                    <th className="text-right p-3 font-medium">الأجور</th>
                    <th className="text-right p-3 font-medium">العمولة</th>
                  </tr>
                </thead>
                <tbody>
                  {report.by_zone.map((z, i) => (
                    <tr key={z.zone_id ?? `none-${i}`} className="row-line">
                      <td className="p-3 surface-text">{z.zone_id ?? 'بدون منطقة'}</td>
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
