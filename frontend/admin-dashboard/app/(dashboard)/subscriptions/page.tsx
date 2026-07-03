'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Subscription } from '@rafeeq/shared';
import { api } from '../../../src/lib/api';
import { useT } from '../../../src/lib/i18n';
import { Skeleton } from '../../../src/components/Skeleton';

const STATUSES = ['', 'pending', 'active', 'expired', 'cancelled'];

export default function SubscriptionsPage() {
  const { t } = useT();
  const [items, setItems] = useState<Subscription[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.admin
      .listSubscriptions(status ? { status, per_page: 50 } : { per_page: 50 })
      .then((r) => setItems(r.items))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => load(), [load]);

  const activate = async (s: Subscription) => {
    setBusyId(s.id);
    try {
      await api.admin.activateSubscription(s.id);
      load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-extrabold surface-text">{t('nav.subscriptions')}</h1>
        <select className="input max-w-[200px]" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{t(`subscriptions.status.${s || 'all'}`)}</option>
          ))}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{Array.from({ length: 6 }).map((_, i) => (<Skeleton key={i} className="h-9 w-full" />))}</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-muted">{t('subscriptions.none')}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="table-head">
              <tr>
                <th className="text-right p-3 font-medium">{t('subscriptions.colPlan')}</th>
                <th className="text-right p-3 font-medium">{t('subscriptions.colStatus')}</th>
                <th className="text-right p-3 font-medium">{t('subscriptions.colRemaining')}</th>
                <th className="text-right p-3 font-medium">{t('subscriptions.colEnds')}</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="row-line">
                  <td className="p-3 font-medium surface-text">{s.plan?.name ?? '—'}</td>
                  <td className="p-3">
                    <span className={`badge ${s.status === 'active' ? 'bg-green-100 text-success' : s.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-muted'}`}>
                      {s.status_label}
                    </span>
                  </td>
                  <td className="p-3 text-muted">{s.remaining_rides ?? t('subscriptions.unlimited')}</td>
                  <td className="p-3 text-muted font-mono">{s.ends_at ? new Date(s.ends_at).toLocaleDateString('ar') : '—'}</td>
                  <td className="p-3 text-left">
                    {s.status === 'pending' && (
                      <button disabled={busyId === s.id} onClick={() => activate(s)} className="text-cyan-deep text-sm hover:underline disabled:opacity-50">
                        {t('subscriptions.activate')}
                      </button>
                    )}
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
