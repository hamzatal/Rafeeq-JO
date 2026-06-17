'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ApiSuccess, RideRequest } from '@rafeeq/shared';
import { ENDPOINTS } from '@rafeeq/shared';
import { api } from '../../../src/lib/api';

export default function RideRequestsPage() {
  const [items, setItems] = useState<RideRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.http
      .get<ApiSuccess<RideRequest[]>>(ENDPOINTS.admin.rideRequests)
      .then((r) => setItems(r.data.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runMatching = async () => {
    setMatching(true);
    setMsg(null);
    try {
      await api.http.post(ENDPOINTS.admin.matchingRun);
      setMsg('تم تشغيل محرك التجميع.');
      load();
    } catch {
      setMsg('تعذّر تشغيل المحرك.');
    } finally {
      setMatching(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-extrabold surface-text">طلبات الرحلات</h1>
        <button onClick={runMatching} disabled={matching} className="btn-primary px-4 py-2 text-sm">
          {matching ? '...' : 'تشغيل التجميع'}
        </button>
      </div>
      {msg && <div className="card mb-4 text-sm text-primary">{msg}</div>}

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-muted">جارٍ التحميل...</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-muted">لا توجد طلبات</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="table-head">
              <tr>
                <th className="text-right p-3 font-medium">المنطقة</th>
                <th className="text-right p-3 font-medium">النوع</th>
                <th className="text-right p-3 font-medium">الموقع</th>
                <th className="text-right p-3 font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="row-line">
                  <td className="p-3 font-medium surface-text">{r.zone?.name_ar ?? '—'}</td>
                  <td className="p-3 text-muted">{r.is_express ? 'مستعجلة' : 'مجدولة'}</td>
                  <td className="p-3 text-muted">{r.pickup_lat.toFixed(4)}, {r.pickup_lng.toFixed(4)}</td>
                  <td className="p-3 text-muted">{r.status_label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
