'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { FinancialReport, Dispute } from '@rafeeq/shared';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/lib/auth';

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
      label: 'الرحلات المدفوعة (الشهر)',
      value: (report?.rides_count ?? 0).toLocaleString('en-US'),
      icon: 'directions_car',
      trend: 'منذ بداية الشهر',
      bar: 0.75,
    },
    {
      label: 'إيراد المنصة — عمولة',
      value: jod(report?.commission_fils ?? 0),
      unit: 'JOD',
      icon: 'account_balance_wallet',
      trend: 'صافي عمولة المنصة',
      bar: 0.8,
    },
    {
      label: 'إجمالي الأجور المحصّلة',
      value: jod(report?.gross_fare_fils ?? 0),
      unit: 'JOD',
      icon: 'payments',
      trend: 'إجمالي قيمة الرحلات',
      bar: 0.6,
    },
    {
      label: 'نزاعات مفتوحة عالية الخطورة',
      value: String(criticalOpen),
      icon: 'warning',
      trend: criticalOpen > 0 ? 'تتطلب مراجعة فورية' : 'لا يوجد حالياً',
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
          <h1 className="page-title">نظرة عامة على الأسطول</h1>
          <p className="muted-text mt-1">أهلاً {user?.full_name} — مراقبة الأداء والمقاييس الرئيسية لحظياً.</p>
        </div>
        <div className="text-xs font-mono text-muted">آخر تحديث: {new Date().toLocaleString('ar')}</div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {kpis.map((k) => (
          <KpiCard key={k.label} k={k} />
        ))}
      </div>

      {/* Bento: revenue-by-zone chart + quick links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 card p-0 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-line flex justify-between items-center">
            <h3 className="font-bold text-navy dark:text-dtext flex items-center gap-2">
              <span className="material-symbols-outlined text-cyan-deep text-[20px]">monitoring</span>
              عمولة المنصة حسب المنطقة
            </h3>
            <Link href="/reports" className="text-sm text-cyan-deep hover:underline">
              التقارير الكاملة
            </Link>
          </div>
          <div className="p-5 flex-1 min-h-[280px]">
            {loading ? (
              <div className="h-full flex items-center justify-center text-muted">جارٍ التحميل...</div>
            ) : (report?.by_zone?.length ?? 0) === 0 ? (
              <div className="h-full flex items-center justify-center text-muted">لا توجد بيانات للفترة الحالية</div>
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
                      {z.zone_id ? z.zone_id.slice(0, 6) : 'عام'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick links / module summary */}
        <div className="card flex flex-col">
          <h3 className="font-bold text-navy dark:text-dtext mb-4">وصول سريع</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: '/disputes', label: 'النزاعات', icon: 'gavel' },
              { href: '/withdrawals', label: 'السحوبات', icon: 'account_balance_wallet' },
              { href: '/drivers', label: 'الكباتن', icon: 'sports_motorsports' },
              { href: '/zones', label: 'المناطق', icon: 'map' },
              { href: '/reports', label: 'التقارير', icon: 'monitoring' },
              { href: '/safety', label: 'الأمان', icon: 'shield' },
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
            أحدث النزاعات المفتوحة
          </h3>
          <Link href="/disputes" className="text-sm text-cyan-deep hover:underline">
            عرض الكل
          </Link>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 text-center text-muted">جارٍ التحميل...</div>
          ) : disputes.length === 0 ? (
            <div className="p-6 text-center text-muted">لا توجد نزاعات مفتوحة 🎉</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>الحساب</th>
                  <th>النوع</th>
                  <th>الخطورة</th>
                  <th>درجة الخطر</th>
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
