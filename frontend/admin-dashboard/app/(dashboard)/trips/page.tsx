'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Trip } from '@rafeeq/shared';
import { api } from '../../../src/lib/api';

const STATUSES = [
  { value: '', label: 'الكل' },
  { value: 'pending', label: 'بانتظار كابتن' },
  { value: 'scheduled', label: 'مجدولة' },
  { value: 'started', label: 'جارية' },
  { value: 'completed', label: 'مكتملة' },
  { value: 'cancelled', label: 'ملغاة' },
];

const tone = (status: string) =>
  status === 'completed' ? 'bg-green-100 text-success'
    : status === 'cancelled' ? 'bg-red-100 text-danger'
    : status === 'started' ? 'bg-cyan/15 text-cyan-deep'
    : 'bg-slate-100 text-muted';

export default function TripsPage() {
  const [items, setItems] = useState<Trip[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.admin
      .listTrips(status ? { status, per_page: 50 } : { per_page: 50 })
      .then((r) => setItems(r.items))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => load(), [load]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-extrabold surface-text">مراقبة الرحلات</h1>
        <select className="input max-w-[200px]" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-muted">جارٍ التحميل...</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-muted">لا توجد رحلات</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="table-head">
              <tr>
                <th className="text-right p-3 font-medium">المسار</th>
                <th className="text-right p-3 font-medium">الموعد</th>
                <th className="text-right p-3 font-medium">الركاب</th>
                <th className="text-right p-3 font-medium">السعة</th>
                <th className="text-right p-3 font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id} className="row-line">
                  <td className="p-3 font-medium surface-text">{t.route?.name ?? 'رحلة تجميع'}</td>
                  <td className="p-3 text-muted font-mono">{t.scheduled_at ? new Date(t.scheduled_at).toLocaleString('ar') : '—'}</td>
                  <td className="p-3 text-muted">{t.booked_count ?? 0}</td>
                  <td className="p-3 text-muted">{t.capacity}</td>
                  <td className="p-3">
                    <span className={`badge ${tone(t.status)}`}>{t.status_label}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
