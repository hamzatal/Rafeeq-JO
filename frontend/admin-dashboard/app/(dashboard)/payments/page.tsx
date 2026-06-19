'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PaymentRequest } from '@rafeeq/shared';
import { ENDPOINTS } from '@rafeeq/shared';
import { api } from '../../../src/lib/api';

const STATUSES = [
  { value: '', label: 'قيد المراجعة' },
  { value: 'approved', label: 'معتمد' },
  { value: 'rejected', label: 'مرفوض' },
  { value: 'pending', label: 'بانتظار الدفع' },
];

const FRAUD_LABELS: Record<string, string> = {
  duplicate_reference: 'رقم عملية مكرّر',
  duplicate_image: 'صورة مكرّرة',
  beneficiary_mismatch: 'المستفيد لا يطابق',
  sender_name_mismatch: 'اسم المُرسِل لا يطابق',
  looks_edited: 'يبدو معدّلاً',
};

export default function PaymentsPage() {
  const [items, setItems] = useState<PaymentRequest[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.payments
      .adminQueue(status || undefined)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (id: string) => {
    setBusy(id);
    try {
      await api.payments.approve(id);
      load();
    } finally {
      setBusy(null);
    }
  };

  const reject = async (id: string) => {
    const reason = window.prompt('سبب الرفض؟');
    if (!reason) return;
    setBusy(id);
    try {
      await api.payments.reject(id, reason);
      load();
    } finally {
      setBusy(null);
    }
  };

  const viewProof = async (p: PaymentRequest) => {
    const payment = p.payments?.find((x) => x.has_proof);
    if (!payment) return;
    try {
      const res = await api.http.get(ENDPOINTS.payments.adminProof(payment.id), { responseType: 'blob' });
      const url = URL.createObjectURL(res.data as Blob);
      window.open(url, '_blank', 'noopener');
    } catch {
      /* ignore */
    }
  };

  const hasProof = (p: PaymentRequest): boolean => !!p.payments?.some((x) => x.has_proof);

  return (
    <div>
      <h1 className="text-2xl font-extrabold surface-text mb-4">المدفوعات</h1>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {STATUSES.map((st) => (
          <button
            key={st.value}
            onClick={() => setStatus(st.value)}
            className={`badge border ${status === st.value ? 'bg-primary text-white border-primary' : 'bg-white text-muted border-line'}`}
          >
            {st.label}
          </button>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-muted">جارٍ التحميل...</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-muted">لا توجد مدفوعات</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="table-head">
              <tr>
                <th className="text-right p-3 font-medium">الرقم</th>
                <th className="text-right p-3 font-medium">الغرض</th>
                <th className="text-right p-3 font-medium">المبلغ</th>
                <th className="text-right p-3 font-medium">الثقة (AI)</th>
                <th className="text-right p-3 font-medium">تدقيق الاحتيال</th>
                <th className="text-right p-3 font-medium">الحالة</th>
                <th className="text-right p-3 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => {
                const payment = p.payments?.[0];
                const ai = payment?.ai_confidence ?? null;
                const flags = payment?.fraud_flags ?? [];
                const senderName = (payment?.extracted as { sender_name?: string } | undefined)?.sender_name;
                const actionable = ['pending', 'submitted', 'under_review'].includes(p.status);
                return (
                  <tr key={p.id} className="row-line align-top">
                    <td className="p-3 font-medium surface-text">{p.number}</td>
                    <td className="p-3 text-muted">{p.purpose_label}</td>
                    <td className="p-3 text-muted">{p.amount_jod.toFixed(3)} د.أ</td>
                    <td className="p-3 text-muted">{ai !== null ? `${ai}%` : '—'}</td>
                    <td className="p-3">
                      {flags.length === 0 ? (
                        <span className="text-success text-xs">✓ نظيف</span>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {flags.map((f) => (
                            <span key={f} className="badge bg-danger/10 text-danger border border-danger/30 text-[11px]">
                              {FRAUD_LABELS[f] ?? f}
                            </span>
                          ))}
                        </div>
                      )}
                      {senderName && <div className="text-[11px] text-muted mt-1">المُرسِل: {senderName}</div>}
                    </td>
                    <td className="p-3 text-muted">{p.status_label}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        {hasProof(p) && (
                          <button onClick={() => viewProof(p)} className="badge border border-line text-primary">
                            عرض الإشعار
                          </button>
                        )}
                        {actionable && (
                          <>
                            <button onClick={() => approve(p.id)} disabled={busy === p.id} className="btn-primary px-3 py-1 text-xs">
                              اعتماد
                            </button>
                            <button onClick={() => reject(p.id)} disabled={busy === p.id} className="btn-outline px-3 py-1 text-xs">
                              رفض
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
