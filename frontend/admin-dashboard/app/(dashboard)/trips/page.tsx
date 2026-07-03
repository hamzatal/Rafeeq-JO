'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Trip } from '@rafeeq/shared';
import { api } from '../../../src/lib/api';
import { useT } from '../../../src/lib/i18n';
import { Skeleton } from '../../../src/components/Skeleton';

const STATUSES = ['', 'pending', 'scheduled', 'started', 'completed', 'cancelled'];

const tone = (status: string) =>
  status === 'completed' ? 'bg-green-100 text-success'
    : status === 'cancelled' ? 'bg-red-100 text-danger'
    : status === 'started' ? 'bg-cyan/15 text-cyan-deep'
    : 'bg-slate-100 text-muted';

export default function TripsPage() {
  const { t } = useT();
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
        <h1 className="text-2xl font-extrabold surface-text">{t('nav.trips')}</h1>
        <select className="input max-w-[200px]" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{t(`trips.status.${s || 'all'}`)}</option>
          ))}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{Array.from({ length: 6 }).map((_, i) => (<Skeleton key={i} className="h-9 w-full" />))}</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-muted">{t('trips.none')}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="table-head">
              <tr>
                <th className="text-right p-3 font-medium">{t('trips.colRoute')}</th>
                <th className="text-right p-3 font-medium">{t('trips.colTime')}</th>
                <th className="text-right p-3 font-medium">{t('trips.colPassengers')}</th>
                <th className="text-right p-3 font-medium">{t('trips.colCapacity')}</th>
                <th className="text-right p-3 font-medium">{t('trips.colStatus')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((tr) => (
                <tr key={tr.id} className="row-line">
                  <td className="p-3 font-medium surface-text">{tr.route?.name ?? t('trips.poolTrip')}</td>
                  <td className="p-3 text-muted font-mono">{tr.scheduled_at ? new Date(tr.scheduled_at).toLocaleString('ar') : '—'}</td>
                  <td className="p-3 text-muted">{tr.booked_count ?? 0}</td>
                  <td className="p-3 text-muted">{tr.capacity}</td>
                  <td className="p-3">
                    <span className={`badge ${tone(tr.status)}`}>{tr.status_label}</span>
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
