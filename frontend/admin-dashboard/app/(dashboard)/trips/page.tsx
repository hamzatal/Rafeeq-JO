'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Trip } from '@rafeeq/shared';
import { api } from '../../../src/lib/api';
import { LoadError } from '../../../src/components/LoadError';
import { useT } from '../../../src/lib/i18n';
import { Skeleton } from '../../../src/components/Skeleton';
import { Num } from '../../../src/components/Num';
import { NavPageHeader } from '../../../src/components/NavPageHeader';

const STATUSES = ['', 'pending', 'scheduled', 'started', 'completed', 'cancelled'];

const tone = (status: string) =>
  status === 'completed' ? 'bg-green-100 text-success'
    : status === 'cancelled' ? 'bg-red-100 text-danger'
    : status === 'started' ? 'bg-primary/15 text-primary-dark'
    : 'bg-slate-100 text-muted';

export default function TripsPage() {
  const { t, locale } = useT();
  const [items, setItems] = useState<Trip[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    api.admin
      .listTrips(status ? { status, per_page: 50 } : { per_page: 50 })
      .then((r) => setItems(r.items))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => load(), [load]);

  return (
    <div>
      <NavPageHeader
        href="/trips"
        stat={loading ? undefined : <><Num value={items.length} /> رحلة</>}
        actions={
          <select
            className="input max-w-[200px]"
            aria-label={t('nav.trips')}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{t(`trips.status.${s || 'all'}`)}</option>
            ))}
          </select>
        }
      />

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{Array.from({ length: 6 }).map((_, i) => (<Skeleton key={i} className="h-9 w-full" />))}</div>
        ) : loadError ? (
          <LoadError onRetry={load} />
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-muted">{t('trips.none')}</div>
        ) : (
          <table className="w-full text-sm">
            <caption className="sr-only">{t('nav.trips')}</caption>
            <thead className="table-head">
              <tr>
                <th scope="col" className="text-right p-3 font-medium">{t('trips.colRoute')}</th>
                <th scope="col" className="text-right p-3 font-medium">{t('trips.colTime')}</th>
                <th scope="col" className="text-right p-3 font-medium">{t('trips.colPassengers')}</th>
                <th scope="col" className="text-right p-3 font-medium">{t('trips.colCapacity')}</th>
                <th scope="col" className="text-right p-3 font-medium">{t('trips.colStatus')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((tr) => (
                <tr key={tr.id} className="row-line">
                  <td className="p-3 font-medium surface-text">{tr.route?.name ?? t('trips.poolTrip')}</td>
                  <td className="p-3 text-muted font-mono">{tr.scheduled_at ? new Date(tr.scheduled_at).toLocaleString(locale) : '—'}</td>
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
