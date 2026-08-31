'use client';

import { useCallback, useEffect, useState, Fragment } from 'react';
import type { SupportTicket } from '@rafeeq/shared';
import { api } from '../lib/api';
import { LoadError } from '../components/LoadError';
import { Icon } from '../components/Icon';
import { Panel } from '../components/Panel';
import { Pill } from '../components/Pill';
import { FilterPills } from '../components/FilterPills';
import { Since } from '../components/Since';
import { Num } from '../components/Num';
import { downloadCsv } from '../lib/download';

/* ═══════════════════════════════════════════════════════════════════════════
   الدعم والشكاوى — screen 40 of `docs/design/src/06-admin-3.html`,
   «مدموجان في طابور واحد بحقل type».

   The sheet's columns are التذكرة · النوع · المُرسِل · الموضوع · فرز AI · منذ · الحالة.
   This table had الرقم · الموضوع · الفئة · المستوى · الحالة — no sender and no age, so
   the person waiting and how long they had waited were both invisible on the queue whose
   entire subject is people waiting.

   ── «فرز AI» is a column, not a toggle hidden in the subject ───────────────

   The triage badge was tucked inside the الموضوع cell as a button that expanded a row.
   The sheet gives it a column, which is the right call: an operator triaging thirty
   tickets sorts by sentiment and urgency, and a signal you have to hunt for per row
   cannot be scanned. The expansion still exists for the suggested reply.

   ── This view no longer draws its own <h1> ─────────────────────────────────

   It rendered `<h1>الدعم</h1>` inside `TabbedPage`, which had already rendered the page
   heading — the same duplicate-heading bug `AuditView` had.
   ═══════════════════════════════════════════════════════════════════════════ */

const SENTIMENT: Record<string, string> = {
  positive: 'إيجابي',
  neutral: 'محايد',
  negative: 'سلبي',
  angry: 'غاضب',
};

/** Sentiment carries a tone because it is the triage signal, not a label. */
const SENTIMENT_TONE: Record<string, 'done' | 'neutral' | 'open' | 'urgent'> = {
  positive: 'done',
  neutral: 'neutral',
  negative: 'open',
  angry: 'urgent',
};

const STATUS_TONE: Record<string, 'open' | 'progress' | 'done' | 'urgent' | 'neutral'> = {
  open: 'open',
  pending: 'open',
  escalated: 'urgent',
  resolved: 'done',
  closed: 'neutral',
};

const STATUSES = [
  { value: '', label: 'الكل' },
  { value: 'open', label: 'مفتوحة' },
  { value: 'escalated', label: 'مُصعّدة' },
  { value: 'pending', label: 'بانتظار الرد' },
  { value: 'resolved', label: 'محلولة' },
];

export function TicketsView() {
  const [items, setItems] = useState<SupportTicket[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    api.support
      .adminList({ status: status || undefined })
      .then(setItems)
      .catch(() => setLoadError(true))
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

  const exportCsv = () =>
    downloadCsv(
      'support-tickets',
      ['التذكرة', 'النوع', 'المُرسِل', 'الموضوع', 'فرز AI', 'المستوى', 'الحالة', 'وقت الإنشاء'],
      items.map((tk) => [
        tk.number,
        tk.category_label,
        tk.user?.name ?? '',
        tk.subject,
        tk.ai_triage ? (SENTIMENT[tk.ai_triage.sentiment] ?? tk.ai_triage.sentiment) : '',
        `L${tk.level}`,
        tk.status_label,
        tk.created_at ?? '',
      ]),
    );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <FilterPills options={STATUSES} value={status} onChange={setStatus} label="تصفية التذاكر" />
        <button onClick={exportCsv} className="btn-outline h-[34px] px-[13px] text-xs ms-auto">
          تصدير
        </button>
      </div>

      <Panel>
        {loadError ? (
          <LoadError onRetry={() => load()} />
        ) : loading ? (
          <div className="p-6 text-center text-muted">جارٍ التحميل...</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-muted">لا توجد تذاكر</div>
        ) : (
          <table className="w-full text-sm">
            <caption className="sr-only">الدعم</caption>
            <thead className="table-head">
              <tr>
                <th scope="col" className="text-right p-3 font-medium">التذكرة</th>
                <th scope="col" className="text-right p-3 font-medium">النوع</th>
                <th scope="col" className="text-right p-3 font-medium">المُرسِل</th>
                <th scope="col" className="text-right p-3 font-medium">الموضوع</th>
                <th scope="col" className="text-right p-3 font-medium">فرز AI</th>
                <th scope="col" className="text-right p-3 font-medium">منذ</th>
                <th scope="col" className="text-right p-3 font-medium">الحالة</th>
                <th scope="col" className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((tk) => (
                <Fragment key={tk.id}>
                  <tr className="row-line">
                    <td className="p-3 font-medium surface-text tabular-nums">{tk.number}</td>
                    <td className="p-3 text-muted">{tk.category_label}</td>
                    <td className="p-3 surface-text">{tk.user?.name ?? '—'}</td>
                    <td className="p-3 text-muted max-w-xs truncate" title={tk.subject}>
                      {tk.subject}
                    </td>
                    <td className="p-3">
                      {/* «—» when triage is off or unavailable: a neutral badge would
                          claim the AI looked at this ticket and found nothing notable. */}
                      {tk.ai_triage ? (
                        <Pill tone={SENTIMENT_TONE[tk.ai_triage.sentiment] ?? 'neutral'} icon="sparkles">
                          {SENTIMENT[tk.ai_triage.sentiment] ?? tk.ai_triage.sentiment}
                        </Pill>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="p-3 text-muted">
                      <Since at={tk.created_at} />
                    </td>
                    <td className="p-3">
                      <Pill tone={STATUS_TONE[tk.status] ?? 'neutral'}>{tk.status_label}</Pill>
                      {tk.level > 1 ? (
                        <span className="ms-1.5 text-[11px] text-muted tabular-nums">
                          L<Num value={tk.level} />
                        </span>
                      ) : null}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {/* «ردّ» opens the thread — where a reply is actually written.
                            It is primary because it is the action the queue exists for. */}
                        <button
                          onClick={() => setExpanded(expanded === tk.id ? null : tk.id)}
                          className="btn-primary h-[34px] px-[13px] text-xs"
                        >
                          ردّ
                        </button>
                        <button
                          onClick={() => act(tk.id, () => api.support.escalate(tk.id))}
                          disabled={busy === tk.id || tk.level >= 4}
                          className="btn-outline h-[34px] px-[13px] text-xs"
                        >
                          تصعيد
                        </button>
                        <button
                          onClick={() => act(tk.id, () => api.support.setStatus(tk.id, 'resolved'))}
                          disabled={busy === tk.id}
                          className="btn-outline h-[34px] px-[13px] text-xs"
                        >
                          عرض
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expanded === tk.id && (
                    <tr className="bg-primary/5">
                      <td colSpan={8} className="p-4">
                        {tk.ai_triage ? (
                          <div className="text-sm space-y-2">
                            <div className="flex flex-wrap gap-4 text-xs text-muted">
                              <span>
                                الإلحاح: <b className="surface-text">{tk.ai_triage.urgency}</b>
                              </span>
                              <span>
                                الفئة المقترحة: <b className="surface-text">{tk.ai_triage.suggested_category}</b>
                              </span>
                              <span>
                                ثقة:{' '}
                                <b className="surface-text tabular-nums">
                                  <Num percent={tk.ai_triage.confidence} />
                                </b>
                              </span>
                            </div>
                            <div className="surface-text">
                              <b>الملخّص:</b> {tk.ai_triage.summary}
                            </div>
                            <div className="rounded-lg border border-line p-3 bg-surface">
                              <div className="text-xs text-muted mb-1 flex items-center gap-1">
                                <Icon name="sparkles" size={12} />
                                رد مقترح (AI):
                              </div>
                              <div className="surface-text whitespace-pre-wrap">{tk.ai_triage.suggested_reply}</div>
                              <button
                                onClick={() => navigator.clipboard?.writeText(tk.ai_triage!.suggested_reply)}
                                className="btn-outline px-3 py-1 text-xs mt-2"
                              >
                                نسخ الرد
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Honest about WHY there is no draft, rather than an empty box:
                             triage is a GPT feature and is off in some environments. */
                          <div className="text-sm text-muted">
                            لا يوجد فرز آلي لهذه التذكرة — الردّ يُكتب من ملف التذكرة.
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
