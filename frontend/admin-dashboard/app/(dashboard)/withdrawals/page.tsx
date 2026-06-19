'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PayoutRequest } from '@rafeeq/shared';
import { api } from '../../../src/lib/api';
import { useT } from '../../../src/lib/i18n';

const jod = (fils: number) => `${(fils / 1000).toFixed(3)} د.أ`;

export default function WithdrawalsPage() {
  const { t } = useT();
  const [items, setItems] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('pending');

  const load = useCallback(() => {
    setLoading(true);
    api.payouts
      .adminQueue()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (id: string) => {
    setBusy(id);
    try {
      await api.payouts.adminApprove(id);
      load();
    } finally {
      setBusy(null);
    }
  };

  const reject = async (id: string) => {
    const reason = window.prompt(t('withdrawals.rejectPrompt'));
    if (!reason) return;
    setBusy(id);
    try {
      await api.payouts.adminReject(id, reason);
      load();
    } finally {
      setBusy(null);
    }
  };

  const filtered = useMemo(
    () => (filter ? items.filter((i) => i.status === filter) : items),
    [items, filter],
  );

  const pendingTotal = useMemo(
    () => items.filter((i) => i.status === 'pending').reduce((s, i) => s + i.amount_fils, 0),
    [items],
  );

  return (
    <div>
      <h1 className="page-title mb-1">{t('nav.withdrawals')}</h1>
      <p className="muted-text text-sm mb-4">
        {t('withdrawals.pendingTotal')}: <span className="font-bold surface-text">{jod(pendingTotal)}</span>
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {[
          { v: 'pending', l: t('withdrawals.status.pending') },
          { v: 'paid', l: t('withdrawals.status.paid') },
          { v: 'rejected', l: t('withdrawals.status.rejected') },
          { v: '', l: t('withdrawals.all') },
        ].map((st) => (
          <button
            key={st.v}
            onClick={() => setFilter(st.v)}
            className={`badge border ${filter === st.v ? 'bg-primary text-white border-primary' : 'bg-white text-muted border-line'}`}
          >
            {st.l}
          </button>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-muted">{t('common.loading')}</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-muted">{t('withdrawals.none')}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="table-head">
              <tr>
                <th className="text-right p-3 font-medium">{t('withdrawals.colCaptain')}</th>
                <th className="text-right p-3 font-medium">{t('withdrawals.colAmount')}</th>
                <th className="text-right p-3 font-medium">{t('withdrawals.colDestination')}</th>
                <th className="text-right p-3 font-medium">{t('withdrawals.colStatus')}</th>
                <th className="text-right p-3 font-medium">{t('withdrawals.colDate')}</th>
                <th className="text-right p-3 font-medium">{t('withdrawals.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="row-line align-top">
                  <td className="p-3 surface-text">
                    <div className="font-medium">{p.captain?.name ?? '—'}</div>
                    <div className="text-xs text-muted">{p.captain?.phone ?? ''}</div>
                  </td>
                  <td className="p-3 font-bold surface-text">{jod(p.amount_fils)}</td>
                  <td className="p-3 text-muted">{p.destination ?? '—'}</td>
                  <td className="p-3 text-muted">{t(`withdrawals.status.${p.status}`, p.status)}</td>
                  <td className="p-3 text-muted text-xs">
                    {p.created_at ? new Date(p.created_at).toLocaleString('ar') : '—'}
                  </td>
                  <td className="p-3">
                    {p.status === 'pending' ? (
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => approve(p.id)} disabled={busy === p.id} className="btn-success px-3 py-1 text-xs">
                          {t('withdrawals.approve')}
                        </button>
                        <button onClick={() => reject(p.id)} disabled={busy === p.id} className="btn-outline px-3 py-1 text-xs">
                          {t('withdrawals.reject')}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted">{p.admin_note ?? '—'}</span>
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
