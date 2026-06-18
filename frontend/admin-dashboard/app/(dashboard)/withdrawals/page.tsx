'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PayoutRequest } from '@rafeeq/shared';
import { api } from '../../../src/lib/api';

const jod = (fils: number) => `${(fils / 1000).toFixed(3)} د.أ`;

const STATUS_LABEL: Record<string, string> = {
  pending: 'قيد المراجعة',
  paid: 'مدفوع',
  rejected: 'مرفوض',
};

export default function WithdrawalsPage() {
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
    const reason = window.prompt('سبب الرفض؟ (سيُعاد المبلغ لمحفظة الكابتن)');
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
      <h1 className="page-title mb-1">سحوبات الكباتن</h1>
      <p className="muted-text text-sm mb-4">
        قيد المراجعة: <span className="font-bold surface-text">{jod(pendingTotal)}</span>
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {[
          { v: 'pending', l: 'قيد المراجعة' },
          { v: 'paid', l: 'مدفوع' },
          { v: 'rejected', l: 'مرفوض' },
          { v: '', l: 'الكل' },
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
          <div className="p-6 text-center text-muted">جارٍ التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-muted">لا توجد طلبات سحب</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="table-head">
              <tr>
                <th className="text-right p-3 font-medium">الكابتن</th>
                <th className="text-right p-3 font-medium">المبلغ</th>
                <th className="text-right p-3 font-medium">الوجهة (CliQ)</th>
                <th className="text-right p-3 font-medium">الحالة</th>
                <th className="text-right p-3 font-medium">التاريخ</th>
                <th className="text-right p-3 font-medium">إجراءات</th>
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
                  <td className="p-3 text-muted">{STATUS_LABEL[p.status] ?? p.status}</td>
                  <td className="p-3 text-muted text-xs">
                    {p.created_at ? new Date(p.created_at).toLocaleString('ar') : '—'}
                  </td>
                  <td className="p-3">
                    {p.status === 'pending' ? (
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => approve(p.id)} disabled={busy === p.id} className="btn-success px-3 py-1 text-xs">
                          اعتماد الدفع
                        </button>
                        <button onClick={() => reject(p.id)} disabled={busy === p.id} className="btn-outline px-3 py-1 text-xs">
                          رفض
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
