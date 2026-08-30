'use client';

import { useCallback, useEffect, useState } from 'react';
import type { BroadcastFilters } from '@rafeeq/api-client';
import type { University, Zone } from '@rafeeq/shared';
import { api } from '../../../src/lib/api';
import { useT } from '../../../src/lib/i18n';

/* ═══════════════════════════════════════════════════════════════════════════
   THE SEGMENT IS FOUR DIMENSIONS, and the count is the send.

   ── What this screen could not do ──────────────────────────────────────────

   Three buttons: everyone, all students, all captains. For a product launching
   «موجة اليرموك × أربع مناطق» that is not enough to run the launch — «الخدمة
   انطلقت من حي الجامعة» is true for a few hundred students and noise for everyone
   else, and a notification that is noise to most of its recipients is how a user
   learns to swipe all of them away.

   It also could not reach a SUSPENDED user, which is the group with the most
   important message waiting for them: «حسابك قيد المراجعة، وهذه طريقة الاعتراض».
   Account status was used only to exclude the banned.

   ── The number that disagreed with itself ──────────────────────────────────

   `audience()` counted without excluding banned users and `send()` excluded them,
   because the audience `match` existed twice on the backend — once per caller. So
   the chip here and the number in the confirmation disagreed with each other and
   with reality. One query now answers both, and the counts refresh when the filters
   change so the number on screen is always the number that will be sent to.
   ═══════════════════════════════════════════════════════════════════════════ */

type Audience = 'all' | 'students' | 'drivers';

export default function NotificationsPage() {
  const { t } = useT();
  const [counts, setCounts] = useState<{ all: number; students: number; drivers: number } | null>(null);
  const [audience, setAudience] = useState<Audience>('all');
  const [universities, setUniversities] = useState<University[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [filters, setFilters] = useState<BroadcastFilters>({});
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [coupon, setCoupon] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    api.admin.listUniversities({ per_page: 100 }).then((r) => setUniversities(r.items)).catch(() => undefined);
    api.zones.list().then(setZones).catch(() => undefined);
  }, []);

  /* Re-counted whenever the segment changes: the chip must never describe a
     different audience than the button that sends. */
  const refreshCounts = useCallback(() => {
    api.admin.notificationAudience(filters).then(setCounts).catch(() => setCounts(null));
  }, [filters]);

  useEffect(refreshCounts, [refreshCounts]);

  const setFilter = (key: keyof BroadcastFilters, value: string) =>
    setFilters((f) => {
      const next = { ...f };
      if (value === '') delete next[key];
      else next[key] = value as never;
      return next;
    });

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    setMsg(null);
    try {
      const { estimated } = await api.admin.sendNotification({
        audience,
        ...filters,
        title: title.trim(),
        body: body.trim(),
        coupon_code: coupon.trim() || undefined,
      });
      setMsg({ kind: 'ok', text: `${t('notify.queuedFor')} ${estimated} ${t('notify.users')}` });
      setTitle('');
      setBody('');
      setCoupon('');
    } catch (e2) {
      /*
         A 422 from `NoPersonalData` arrives here. Its message names which identifier
         was found, so it is shown as-is rather than replaced with a generic error —
         the operator needs to know which word to change.
      */
      setMsg({ kind: 'err', text: (e2 as Error)?.message || t('common.error') });
    } finally {
      setSending(false);
    }
  };

  const audiences: { value: Audience; labelKey: string; count?: number }[] = [
    { value: 'all', labelKey: 'notify.all', count: counts?.all },
    { value: 'students', labelKey: 'notify.students', count: counts?.students },
    { value: 'drivers', labelKey: 'notify.drivers', count: counts?.drivers },
  ];

  const selectedCount = counts?.[audience];

  return (
    <div>
      <h1 className="text-2xl font-bold surface-text mb-1">{t('notify.title')}</h1>
      <p className="text-sm text-muted mb-6">{t('notify.intro')}</p>

      <div className="grid gap-6 lg:grid-cols-3 items-start">
        <form onSubmit={send} className="card lg:col-span-2">
          <fieldset className="mb-4">
            <legend className="text-xs text-muted">{t('notify.audience')}</legend>
            <div className="flex flex-wrap gap-2 mt-2">
              {audiences.map((a) => (
                <button
                  type="button"
                  key={a.value}
                  onClick={() => setAudience(a.value)}
                  aria-pressed={audience === a.value}
                  className={`badge border px-3 py-1.5 ${audience === a.value ? 'bg-primary text-white border-primary' : 'bg-white text-muted border-line'}`}
                >
                  {t(a.labelKey)}{typeof a.count === 'number' ? ` (${a.count})` : ''}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-3 mb-4">
            <label className="block">
              <span className="text-xs text-muted">{t('notify.university')}</span>
              <select
                className="input mt-1"
                value={filters.university_id ?? ''}
                onChange={(e) => setFilter('university_id', e.target.value)}
              >
                <option value="">{t('notify.anyUniversity')}</option>
                {universities.map((u) => (
                  <option key={u.id} value={u.id}>{u.name_ar}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs text-muted">{t('notify.zone')}</span>
              <select className="input mt-1" value={filters.zone_id ?? ''} onChange={(e) => setFilter('zone_id', e.target.value)}>
                <option value="">{t('notify.anyZone')}</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>{z.name_ar}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs text-muted">{t('notify.status')}</span>
              <select className="input mt-1" value={filters.status ?? ''} onChange={(e) => setFilter('status', e.target.value)}>
                <option value="">{t('notify.anyStatus')}</option>
                <option value="active">{t('notify.statusActive')}</option>
                <option value="suspended">{t('notify.statusSuspended')}</option>
              </select>
            </label>
          </div>

          <label className="block mb-4">
            <span className="text-xs text-muted">{t('notify.titleField')}</span>
            <input className="input mt-1" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
          </label>

          <label className="block mb-2">
            <span className="text-xs text-muted">{t('notify.bodyField')}</span>
            <textarea className="input mt-1 h-24 py-2" value={body} onChange={(e) => setBody(e.target.value)} maxLength={500} required />
          </label>
          <p className="text-[11px] text-muted mb-4 leading-relaxed">{t('notify.noPii')}</p>

          <label className="block mb-4">
            <span className="text-xs text-muted">{t('notify.couponField')}</span>
            <input className="input mt-1 font-mono" value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="WELCOME10" />
            <span className="text-[11px] text-muted mt-1 block">{t('notify.couponHint')}</span>
          </label>

          <div className="flex items-center gap-3">
            <button type="submit" className="btn-primary" disabled={sending}>
              {sending ? t('common.loading') : t('notify.send')}
            </button>
            {typeof selectedCount === 'number' ? (
              <span className="text-sm text-muted">
                {t('notify.queuedFor')} {selectedCount} {t('notify.users')}
              </span>
            ) : null}
            {msg && (
              <span role="status" className={`text-sm ${msg.kind === 'ok' ? 'text-success' : 'text-danger'}`}>
                {msg.text}
              </span>
            )}
          </div>
        </form>

        <aside className="card">
          <h3 className="font-bold surface-text mb-3">{t('notify.audience')}</h3>
          <div className="space-y-2 text-sm">
            {audiences.map((a) => (
              <div key={a.value} className="flex items-center justify-between">
                <span className="text-muted">{t(a.labelKey)}</span>
                <span className="font-bold surface-text tabular-nums">{a.count ?? '—'}</span>
              </div>
            ))}
          </div>
          <p className="text-[12px] text-muted mt-4 leading-relaxed">{t('notify.segmentHint')}</p>
        </aside>
      </div>
    </div>
  );
}
