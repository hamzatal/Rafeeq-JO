'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ApiSuccess, RideRequest } from '@rafeeq/shared';
import { ENDPOINTS } from '@rafeeq/shared';
import { api } from '../../../src/lib/api';
import { useT } from '../../../src/lib/i18n';
import { Skeleton } from '../../../src/components/Skeleton';
import { Tooltip } from '../../../src/components/Tooltip';

export default function RideRequestsPage() {
  const { t } = useT();
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
      setMsg(t('rideRequests.matchingStarted'));
      load();
    } catch {
      setMsg(t('rideRequests.matchingFailed'));
    } finally {
      setMatching(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-extrabold surface-text">{t('nav.rideRequests')}</h1>
        <Tooltip label={t('rideRequests.matchingHint')} side="start">
          <button onClick={runMatching} disabled={matching} className="btn-primary px-4 py-2 text-sm">
            {matching ? '...' : t('rideRequests.runMatching')}
          </button>
        </Tooltip>
      </div>
      {msg && <div className="card mb-4 text-sm text-primary">{msg}</div>}

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{Array.from({ length: 6 }).map((_, i) => (<Skeleton key={i} className="h-9 w-full" />))}</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-muted">{t('rideRequests.none')}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="table-head">
              <tr>
                <th className="text-right p-3 font-medium">{t('rideRequests.colZone')}</th>
                <th className="text-right p-3 font-medium">{t('rideRequests.colType')}</th>
                <th className="text-right p-3 font-medium">{t('rideRequests.colLocation')}</th>
                <th className="text-right p-3 font-medium">{t('rideRequests.colStatus')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="row-line">
                  <td className="p-3 font-medium surface-text">{r.zone?.name_ar ?? '—'}</td>
                  <td className="p-3 text-muted">{r.is_express ? t('rideRequests.express') : t('rideRequests.scheduled')}</td>
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
