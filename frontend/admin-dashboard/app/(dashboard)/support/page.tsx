'use client';

import { useCallback, useEffect, useState, Fragment } from 'react';
import type { SupportTicket } from '@rafeeq/shared';
import { api } from '../../../src/lib/api';

const SENTIMENT: Record<string, string> = {
  positive: '🙂 إيجابي',
  neutral: '😐 محايد',
  negative: '🙁 سلبي',
  angry: '😠 غاضب',
};

const STATUSES = [
  { value: '', label: 'الكل' },
  { value: 'open', label: 'مفتوحة' },
  { value: 'escalated', label: 'مُصعّدة' },
  { value: 'pending', label: 'بانتظار الرد' },
  { value: 'resolved', label: 'محلولة' },
];

export default function SupportPage() {
  const [items, setItems] = useState<SupportTicket[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.support
      .adminList({ status: status || undefined })
      .then(setItems)
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id);
    try {
      await fn();
      load();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold surface-text mb-4">الدعم</h1>

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
          <div className="p-6 text-center text-muted">لا توجد تذاكر</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="table-head">
              <tr>
                <th className="text-right p-3 font-medium">الرقم</th>
                <th className="text-right p-3 font-medium">الموضوع</th>
                <th className="text-right p-3 font-medium">الفئة</th>
                <th className="text-right p-3 font-medium">المستوى</th>
                <th className="text-right p-3 font-medium">الحالة</th>
                <th className="text-right p-3 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {items.map((tk) => (
                <Fragment key={tk.id}>
                  <tr className="row-line">
                    <td className="p-3 font-medium surface-text">{tk.number}</td>
                    <td className="p-3 text-muted">
                      {tk.subject}
                      {tk.ai_triage && (
                        <button
                          onClick={() => setExpanded(expanded === tk.id ? null : tk.id)}
                          className="ms-2 align-middle badge bg-cyan/10 text-cyan-deep border border-cyan/30 text-[11px]"
                          title="فرز الذكاء الاصطناعي"
                        >
                          ✨ AI {SENTIMENT[tk.ai_triage.sentiment] ?? tk.ai_triage.sentiment}
                        </button>
                      )}
                    </td>
                    <td className="p-3 text-muted">{tk.category_label}</td>
                    <td className="p-3 text-muted">L{tk.level}</td>
                    <td className="p-3 text-muted">{tk.status_label}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => act(tk.id, () => api.support.escalate(tk.id))}
                          disabled={busy === tk.id || tk.level >= 4}
                          className="btn-outline px-3 py-1 text-xs"
                        >
                          تصعيد
                        </button>
                        <button
                          onClick={() => act(tk.id, () => api.support.setStatus(tk.id, 'resolved'))}
                          disabled={busy === tk.id}
                          className="btn-primary px-3 py-1 text-xs"
                        >
                          حل
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expanded === tk.id && tk.ai_triage && (
                    <tr key={tk.id + '-ai'} className="bg-cyan/5">
                      <td colSpan={6} className="p-4">
                        <div className="text-sm space-y-2">
                          <div className="flex flex-wrap gap-4 text-xs text-muted">
                            <span>الإلحاح: <b className="surface-text">{tk.ai_triage.urgency}</b></span>
                            <span>الفئة المقترحة: <b className="surface-text">{tk.ai_triage.suggested_category}</b></span>
                            <span>ثقة: <b className="surface-text">{tk.ai_triage.confidence}%</b></span>
                          </div>
                          <div className="surface-text"><b>الملخّص:</b> {tk.ai_triage.summary}</div>
                          <div className="rounded-lg border border-line p-3 bg-surface">
                            <div className="text-xs text-muted mb-1">رد مقترح (✨ AI):</div>
                            <div className="surface-text whitespace-pre-wrap">{tk.ai_triage.suggested_reply}</div>
                            <button
                              onClick={() => navigator.clipboard?.writeText(tk.ai_triage!.suggested_reply)}
                              className="btn-outline px-3 py-1 text-xs mt-2"
                            >
                              نسخ الرد
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
