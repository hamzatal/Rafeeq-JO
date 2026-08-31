'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { AdminSosIncident, RiskScore } from '@rafeeq/shared';
import { api } from '../../../src/lib/api';
import { useT } from '../../../src/lib/i18n';
import { Skeleton } from '../../../src/components/Skeleton';
import { NavPageHeader } from '../../../src/components/NavPageHeader';
import { Panel } from '../../../src/components/Panel';
import { Pill } from '../../../src/components/Pill';
import { Phone } from '../../../src/components/Phone';
import { Num } from '../../../src/components/Num';
import { Since } from '../../../src/components/Since';
import { LoadError } from '../../../src/components/LoadError';
import { downloadCsv } from '../../../src/lib/download';

/* ═══════════════════════════════════════════════════════════════════════════
   السلامة و SOS — screen 38 of `docs/design/src/06-admin-3.html`.

   The sheet annotates it «غير موجودة عملياً اليوم — أخطر فجوة في المشروع», and that was
   literally true of the code: this page fetched `assistant.risks(30)` — AI risk SCORES —
   and nothing else. The SOS incidents were unreachable, because although
   `Modules/Safety/Routes/api.php` has served `GET /admin/safety/sos` and
   `POST /admin/safety/sos/{id}/resolve` since the module landed, `constants.ts` had no
   entry for either. An endpoint with no client is indistinguishable from a missing
   feature, and this one is the emergency queue.

   Two panels, in the sheet's order: open incidents first, because they are a person
   waiting; the risk board second, because it is a pattern to investigate. The primary
   row action on an incident is «اتصال بالطالب» — a `tel:` link, so it dials from the
   operator's own handset with no dependency on a softphone this product does not have.
   ═══════════════════════════════════════════════════════════════════════════ */

const LEVEL_TONE: Record<string, 'done' | 'open' | 'urgent' | 'neutral'> = {
  low: 'neutral',
  medium: 'open',
  high: 'open',
  critical: 'urgent',
};

const SOS_TONE: Record<string, 'urgent' | 'progress' | 'done'> = {
  open: 'urgent',
  acknowledged: 'progress',
  resolved: 'done',
};

const SOS_LABEL: Record<string, string> = {
  open: 'مفتوح',
  acknowledged: 'قيد المعالجة',
  resolved: 'مُغلق',
};

/** «TRP-4821» — the same projection of the trip key the other queues use. */
const tripRef = (id: string) => `TRP-${id.replace(/-/g, '').slice(-4).toUpperCase()}`;

/** «SOS-4821» — likewise, so an incident can be quoted in a phone call. */
const sosRef = (id: string) => `SOS-${id.replace(/-/g, '').slice(-4).toUpperCase()}`;

export default function SafetyPage() {
  const { t } = useT();
  const [incidents, setIncidents] = useState<AdminSosIncident[]>([]);
  const [risks, setRisks] = useState<RiskScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(false);

    /*
     * `allSettled`, not `all`: the risk board is an AI feature and returns nothing when
     * GPT is disabled. With `all`, that optional panel failing would blank the SOS queue
     * beside it — the one thing on this page that must never be hidden by an unrelated
     * outage.
     */
    return Promise.allSettled([api.admin.listSosIncidents({ per_page: 30 }), api.assistant.risks(30)])
      .then(([sos, risk]) => {
        if (sos.status === 'fulfilled') setIncidents(sos.value.items);
        else setLoadError(true);
        setRisks(risk.status === 'fulfilled' ? risk.value : []);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const open = incidents.filter((i) => i.status === 'open');

  const act = async (id: string, status: 'acknowledged' | 'resolved') => {
    setBusy(id);
    try {
      await api.admin.resolveSos(id, status);
      await load();
    } finally {
      setBusy(null);
    }
  };

  const exportReport = () =>
    downloadCsv(
      'safety-incidents',
      ['البلاغ', 'الطالب', 'الهاتف', 'الرحلة', 'الحالة', 'وقت البلاغ', 'الموقع'],
      incidents.map((i) => [
        sosRef(i.id),
        i.student_name ?? '',
        i.student_phone ?? '',
        i.trip_id ? tripRef(i.trip_id) : '',
        SOS_LABEL[i.status] ?? i.status,
        i.created_at ?? '',
        i.lat != null && i.lng != null ? `${i.lat},${i.lng}` : '',
      ]),
    );

  return (
    <div>
      <NavPageHeader
        href="/safety"
        stat={
          loading ? undefined : (
            <>
              <Num value={open.length} /> بلاغاً مفتوحاً
            </>
          )
        }
        actions={
          <div className="flex items-center gap-2">
            <button onClick={exportReport} className="btn-outline h-[34px] px-[13px] text-xs">
              تصدير التقرير
            </button>
            {/*
              «الموقع الحيّ» goes to the map with the open incidents plotted rather than
              opening a tracker this product does not have. The coordinates are on each
              incident already; the geography page is where a map lives.
            */}
            <Link href="/geography" className="btn-outline h-[34px] px-[13px] text-xs inline-flex items-center">
              الموقع الحيّ
            </Link>
          </div>
        }
      />

      <Panel title="بلاغات الطوارئ" className="mb-4">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : loadError ? (
          <LoadError onRetry={load} />
        ) : incidents.length === 0 ? (
          /* Not «لا يوجد» phrased as an absence of data — an empty SOS queue is good
             news and should read as such. */
          <div className="p-6 text-center text-muted">لا بلاغات طوارئ — الطابور نظيف</div>
        ) : (
          <table className="w-full text-sm">
            <caption className="sr-only">بلاغات الطوارئ</caption>
            <thead className="table-head">
              <tr>
                <th scope="col" className="text-right p-3 font-medium">البلاغ</th>
                <th scope="col" className="text-right p-3 font-medium">الطالب</th>
                <th scope="col" className="text-right p-3 font-medium">الرحلة</th>
                <th scope="col" className="text-right p-3 font-medium">منذ</th>
                <th scope="col" className="text-right p-3 font-medium">الحالة</th>
                <th scope="col" className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((i) => (
                <tr key={i.id} className="row-line">
                  <td className="p-3 font-medium surface-text tabular-nums">{sosRef(i.id)}</td>
                  <td className="p-3">
                    <div className="surface-text">{i.student_name ?? '—'}</div>
                    <div className="text-[11px] text-muted">
                      <Phone value={i.student_phone} />
                    </div>
                  </td>
                  <td className="p-3 text-muted tabular-nums">{i.trip_id ? tripRef(i.trip_id) : '—'}</td>
                  <td className="p-3 text-muted"><Since at={i.created_at} /></td>
                  <td className="p-3">
                    <Pill tone={SOS_TONE[i.status] ?? 'neutral'}>{SOS_LABEL[i.status] ?? i.status}</Pill>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {i.student_phone ? (
                        /* A real `tel:` — the operator's phone dials it. A button that
                           opened a dialog saying "call this number" would add a step to
                           the one action on this page that is timed in minutes. */
                        <a
                          href={`tel:${i.student_phone}`}
                          className="btn-primary h-[34px] px-[13px] text-xs inline-flex items-center"
                        >
                          اتصال بالطالب
                        </a>
                      ) : null}
                      {i.status === 'open' ? (
                        <button
                          onClick={() => act(i.id, 'acknowledged')}
                          disabled={busy === i.id}
                          className="btn-primary h-[34px] px-[13px] text-xs"
                        >
                          معالجة
                        </button>
                      ) : null}
                      {i.status === 'resolved' ? null : (
                        <button
                          onClick={() => act(i.id, 'resolved')}
                          disabled={busy === i.id}
                          className="btn-danger h-[34px] px-[13px] text-xs"
                        >
                          إغلاق البلاغ
                        </button>
                      )}
                      {i.lat != null && i.lng != null ? (
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${i.lat}&mlon=${i.lng}#map=17/${i.lat}/${i.lng}`}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="btn-outline h-[34px] px-[13px] text-xs inline-flex items-center"
                        >
                          عرض
                        </a>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <Panel title={t('safety.title')}>
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : risks.length === 0 ? (
          <div className="p-6 text-center text-muted">{t('safety.none')}</div>
        ) : (
          <table className="w-full text-sm">
            <caption className="sr-only">{t('safety.title')}</caption>
            <thead className="table-head">
              <tr>
                <th scope="col" className="text-right p-3 font-medium">{t('safety.colAccount')}</th>
                <th scope="col" className="text-right p-3 font-medium">{t('safety.colScore')}</th>
                <th scope="col" className="text-right p-3 font-medium">{t('safety.colLevel')}</th>
                <th scope="col" className="text-right p-3 font-medium">{t('safety.colFactors')}</th>
                <th scope="col" className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {risks.map((r) => (
                <tr key={r.user_id} className="row-line align-top">
                  <td className="p-3 font-mono text-xs surface-text">{r.user_id?.slice(0, 8) ?? '—'}</td>
                  <td className="p-3 font-bold surface-text tabular-nums">
                    <Num value={r.score} /> / 100
                  </td>
                  <td className="p-3">
                    <Pill tone={LEVEL_TONE[r.level] ?? 'neutral'}>{r.level}</Pill>
                  </td>
                  <td className="p-3 text-muted">
                    <div className="flex flex-wrap gap-1">
                      {r.factors.map((f, index) => (
                        <span key={index} className="badge border border-line text-[11px]">
                          {f.label} (+{f.weight})
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 text-left">
                    {/* «فحص» — the account, where a decision can actually be taken. The
                        risk board itself has no verdict to record. */}
                    <Link
                      href={`/users?q=${encodeURIComponent(r.user_id ?? '')}`}
                      className="btn-outline h-[34px] px-[13px] text-xs inline-flex items-center"
                    >
                      فحص
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
