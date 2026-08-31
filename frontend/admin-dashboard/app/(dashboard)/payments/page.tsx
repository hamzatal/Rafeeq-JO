'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { formatJod } from '@rafeeq/shared';
import type { PaymentRequest } from '@rafeeq/shared';
import { ENDPOINTS } from '@rafeeq/shared';
import { api } from '../../../src/lib/api';
import { LoadError } from '../../../src/components/LoadError';
import { Num } from '../../../src/components/Num';
import { NavPageHeader } from '../../../src/components/NavPageHeader';
import { Pill } from '../../../src/components/Pill';
import { Panel } from '../../../src/components/Panel';
import { FilterPills } from '../../../src/components/FilterPills';
import { Since } from '../../../src/components/Since';
import { downloadCsv } from '../../../src/lib/download';

/* ═══════════════════════════════════════════════════════════════════════════
   المدفوعات — شحن CliQ — screen 37 of `docs/design/src/06-admin-2.html`,
   «مع سقف الاعتماد الآلي وتنقيح الإيصال».

   The sheet's columns are الطلب · الطالب · المبلغ · المرجع البنكي · الإيصال · فحص AI ·
   منذ, and three of those were absent from the page: the payer's name, the bank
   reference the operator matches against the statement, and the age of the request.
   Every one of them was already in the API payload — `PaymentRequest.user` and
   `Payment.bank_reference` have shipped the whole time — so this queue was asking an
   operator to approve money transfers without showing them who sent them or under what
   reference.

   The three row actions are the sheet's: «عرض» the proof, «اعتماد», «رفض».
   ═══════════════════════════════════════════════════════════════════════════ */

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
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    api.payments
      .adminQueue(status || undefined)
      .then(setItems)
      .catch(() => setLoadError(true))
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

  const exportCsv = () =>
    downloadCsv(
      'payments',
      ['الطلب', 'الطالب', 'المبلغ', 'المرجع البنكي', 'الإيصال', 'فحص AI', 'الحالة', 'وقت الطلب'],
      items.map((p) => {
        const payment = p.payments?.[0];

        return [
          p.number,
          p.user?.name ?? '',
          formatJod(p.amount_fils),
          payment?.bank_reference ?? '',
          hasProof(p) ? 'مرفوع' : 'لا يوجد',
          payment?.ai_confidence != null ? `${payment.ai_confidence}%` : '',
          p.status_label,
          p.created_at ?? '',
        ];
      }),
    );

  return (
    <div>
      <NavPageHeader
        href="/payments"
        stat={
          loading ? undefined : (
            <>
              <Num value={items.length} /> طلب شحن
            </>
          )
        }
        actions={
          <div className="flex items-center gap-2">
            <button onClick={exportCsv} className="btn-outline h-[34px] px-[13px] text-xs">
              تصدير
            </button>
            {/* The CliQ alias, beneficiary and auto-approval ceiling are edited on the
                settings page — this reaches them instead of duplicating the form. */}
            <Link
              href="/settings?tab=cliq"
              className="btn-outline h-[34px] px-[13px] text-xs inline-flex items-center"
            >
              إعدادات CliQ
            </Link>
          </div>
        }
      />

      <div className="mb-4">
        <FilterPills options={STATUSES} value={status} onChange={setStatus} label="تصفية المدفوعات" />
      </div>

      {/* The panel names the METHOD, which the page title does not. Every row here is a
          CliQ bank transfer awaiting manual matching — as opposed to a wallet debit or a
          card, neither of which lands in this queue — and the operator's whole job is
          reconciling against a CliQ statement. */}
      <Panel title="المدفوعات — شحن CliQ">
        {loading ? (
          <div className="p-6 text-center text-muted">جارٍ التحميل...</div>
        ) : loadError ? (
          <LoadError onRetry={load} />
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-muted">لا توجد مدفوعات</div>
        ) : (
          <table className="w-full text-sm">
            <caption className="sr-only">المدفوعات</caption>
            <thead className="table-head">
              <tr>
                <th scope="col" className="text-right p-3 font-medium">الطلب</th>
                <th scope="col" className="text-right p-3 font-medium">الطالب</th>
                <th scope="col" className="text-right p-3 font-medium">المبلغ</th>
                <th scope="col" className="text-right p-3 font-medium">المرجع البنكي</th>
                <th scope="col" className="text-right p-3 font-medium">الإيصال</th>
                <th scope="col" className="text-right p-3 font-medium">فحص AI</th>
                <th scope="col" className="text-right p-3 font-medium">منذ</th>
                <th scope="col" className="p-3"></th>
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
                    <td className="p-3 font-medium surface-text tabular-nums">{p.number}</td>
                    <td className="p-3">
                      <div className="surface-text">{p.user?.name ?? '—'}</div>
                      <div className="text-[11px] text-muted">{p.purpose_label}</div>
                    </td>
                    <td className="p-3 surface-text font-semibold">{formatJod(p.amount_fils)}</td>
                    {/* The reference the operator matches against the bank statement.
                        `font-mono` because it is compared character by character. */}
                    <td className="p-3 font-mono text-xs text-muted">
                      {payment?.bank_reference || '—'}
                      {senderName ? <div className="font-sans mt-0.5">المُرسِل: {senderName}</div> : null}
                    </td>
                    <td className="p-3">
                      {hasProof(p) ? (
                        <Pill tone="done" icon="paperclip">
                          مرفوع
                        </Pill>
                      ) : (
                        <Pill tone="open" icon="file-x">
                          لا يوجد
                        </Pill>
                      )}
                    </td>
                    <td className="p-3">
                      {/* The confidence and the fraud findings are one judgement, so they
                          share a cell: a 96% score beside a «صورة مكرّرة» flag is not a
                          reason to approve, and splitting them let the number be read
                          alone. */}
                      {ai === null && flags.length === 0 ? (
                        <span className="text-muted">—</span>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {ai !== null ? (
                            <span className="tabular-nums text-muted">
                              <Num percent={ai} />
                            </span>
                          ) : null}
                          {flags.length === 0 ? (
                            <Pill tone="done" icon="check">
                              نظيف
                            </Pill>
                          ) : (
                            flags.map((f) => (
                              <Pill key={f} tone="urgent" icon="triangle-alert">
                                {FRAUD_LABELS[f] ?? f}
                              </Pill>
                            ))
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-muted">
                      <Since at={p.created_at} />
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {hasProof(p) && (
                          <button onClick={() => viewProof(p)} className="btn-outline h-[34px] px-[13px] text-xs">
                            عرض
                          </button>
                        )}
                        {actionable && (
                          <>
                            <button
                              onClick={() => approve(p.id)}
                              disabled={busy === p.id}
                              className="btn-primary h-[34px] px-[13px] text-xs"
                            >
                              اعتماد
                            </button>
                            <button
                              onClick={() => reject(p.id)}
                              disabled={busy === p.id}
                              className="btn-danger h-[34px] px-[13px] text-xs"
                            >
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
      </Panel>
    </div>
  );
}
