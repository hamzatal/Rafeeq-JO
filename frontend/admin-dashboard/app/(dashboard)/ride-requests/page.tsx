'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { ApiSuccess, RideRequest } from '@rafeeq/shared';
import { ENDPOINTS, formatJod } from '@rafeeq/shared';
import { api } from '../../../src/lib/api';
import { LoadError } from '../../../src/components/LoadError';
import { useT } from '../../../src/lib/i18n';
import { Skeleton } from '../../../src/components/Skeleton';
import { Tooltip } from '../../../src/components/Tooltip';
import { Num } from '../../../src/components/Num';
import { NavPageHeader } from '../../../src/components/NavPageHeader';
import { Panel } from '../../../src/components/Panel';
import { Pill } from '../../../src/components/Pill';
import { Since } from '../../../src/components/Since';
import { downloadCsv } from '../../../src/lib/download';

/* ═══════════════════════════════════════════════════════════════════════════
   الطلبات الحيّة — screen 34 of `docs/design/src/06-admin-1.html`,
   «الطابور الذي يقرّر نجاح المنصّة يومياً».

   ── What this table showed instead ────────────────────────────────────────

   Four columns: the zone, express-or-scheduled, `pickup_lat.toFixed(4), pickup_lng` —
   raw decimal coordinates — and the status. On the queue that decides whether a student
   gets to a lecture, an operator could not see WHO was waiting, where they were going,
   what it costs, or how long they had been in the queue.

   The sheet asks for الطلب · الطالب · من · إلى · الفئة · الأجرة · منذ · الحالة. Three of
   those had no source in the payload, so `RideRequestResource` now carries the student,
   the university and the corridor's tariff price, and `RideRequestController::index`
   eager-loads the two relations and resolves each distinct corridor's fare once.

   ── The fare can legitimately be unknown ──────────────────────────────────

   A corridor with no approved row in the (zone × university) matrix has no price, and
   the estimate endpoint returns `unpriced_corridor` rather than inventing one from GPS
   distance. So «—» here is a real state — an unpriced corridor an operator needs to
   notice — not a loading artefact.
   ═══════════════════════════════════════════════════════════════════════════ */

/** «RQ-4821» — a short stable handle for a request, from its own key. */
const requestRef = (id: string) => `RQ-${id.replace(/-/g, '').slice(-4).toUpperCase()}`;

const STATUS_TONE: Record<string, 'open' | 'progress' | 'done' | 'urgent' | 'neutral'> = {
  pending: 'open',
  searching: 'open',
  assigned: 'progress',
  matched: 'progress',
  fulfilled: 'done',
  cancelled: 'neutral',
  expired: 'urgent',
};

export default function RideRequestsPage() {
  const { t } = useT();
  const [items, setItems] = useState<RideRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [matching, setMatching] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    api.http
      .get<ApiSuccess<RideRequest[]>>(ENDPOINTS.admin.rideRequests)
      .then((r) => setItems(r.data.data))
      .catch(() => setLoadError(true))
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

  const exportCsv = () =>
    downloadCsv(
      'ride-requests',
      ['الطلب', 'الطالب', 'من', 'إلى', 'الفئة', 'الأجرة', 'الحالة', 'وقت الطلب'],
      items.map((r) => [
        requestRef(r.id),
        r.student?.name ?? '',
        r.pickup_address ?? r.zone?.name_ar ?? '',
        r.university?.name_ar ?? '',
        r.is_solo ? 'خاصّة' : r.is_express ? 'سريعة' : 'مجدولة',
        r.fare_fils == null ? '' : formatJod(r.fare_fils),
        r.status_label,
        r.created_at ?? '',
      ]),
    );

  return (
    <div>
      <NavPageHeader
        href="/ride-requests"
        stat={
          loading ? undefined : (
            <>
              <Num value={items.length} /> طلب في الطابور
            </>
          )
        }
        actions={
          <div className="flex items-center gap-2">
            <button onClick={exportCsv} className="btn-outline h-[34px] px-[13px] text-xs">
              تصدير
            </button>
            <Tooltip label={t('rideRequests.matchingHint')} side="start">
              <button
                onClick={runMatching}
                disabled={matching}
                className="btn-primary h-[34px] px-[13px] text-xs"
              >
                {matching ? '...' : 'تشغيل المطابقة الآن'}
              </button>
            </Tooltip>
          </div>
        }
      />
      {msg && <div className="card mb-4 text-sm text-primary">{msg}</div>}

      <Panel>
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : loadError ? (
          <LoadError onRetry={load} />
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-muted">{t('rideRequests.none')}</div>
        ) : (
          <table className="w-full text-sm">
            <caption className="sr-only">{t('nav.rideRequests')}</caption>
            <thead className="table-head">
              <tr>
                <th scope="col" className="text-right p-3 font-medium">الطلب</th>
                <th scope="col" className="text-right p-3 font-medium">الطالب</th>
                <th scope="col" className="text-right p-3 font-medium">من</th>
                <th scope="col" className="text-right p-3 font-medium">إلى</th>
                <th scope="col" className="text-right p-3 font-medium">الفئة</th>
                <th scope="col" className="text-right p-3 font-medium">الأجرة</th>
                <th scope="col" className="text-right p-3 font-medium">منذ</th>
                <th scope="col" className="text-right p-3 font-medium">الحالة</th>
                <th scope="col" className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => {
                /* «مطابقة يدوية» only where matching is still possible. On a request
                   already grouped into a car the useful action is opening that trip, and
                   the sheet's secondary «عرض» is exactly that. */
                const unmatched = !r.trip_id;

                return (
                  <tr key={r.id} className="row-line">
                    <td className="p-3 font-medium surface-text tabular-nums">{requestRef(r.id)}</td>
                    <td className="p-3 surface-text">{r.student?.name ?? '—'}</td>
                    <td className="p-3 text-muted">{r.pickup_address || r.zone?.name_ar || '—'}</td>
                    <td className="p-3 text-muted">{r.university?.name_ar ?? '—'}</td>
                    <td className="p-3">
                      {r.is_solo ? (
                        <Pill tone="brand">خاصّة</Pill>
                      ) : r.is_express ? (
                        <Pill tone="progress">سريعة</Pill>
                      ) : (
                        <Pill tone="neutral">مجدولة</Pill>
                      )}
                    </td>
                    <td className="p-3 surface-text font-semibold">
                      {r.fare_fils == null ? (
                        <Tooltip label="لا يوجد سعر معتمد لهذا الممر في مصفوفة التسعير">
                          <span className="text-muted font-normal">—</span>
                        </Tooltip>
                      ) : (
                        formatJod(r.fare_fils)
                      )}
                    </td>
                    <td className="p-3 text-muted">
                      <Since at={r.created_at} />
                    </td>
                    <td className="p-3">
                      <Pill tone={STATUS_TONE[r.status] ?? 'neutral'}>{r.status_label}</Pill>
                    </td>
                    <td className="p-3 text-left">
                      {unmatched ? (
                        <Link
                          href={`/trips?request=${r.id}`}
                          className="btn-primary h-[34px] px-[13px] text-xs inline-flex items-center"
                        >
                          مطابقة يدوية
                        </Link>
                      ) : (
                        <Link
                          href={`/trips?q=${r.trip_id}`}
                          className="btn-outline h-[34px] px-[13px] text-xs inline-flex items-center"
                        >
                          عرض
                        </Link>
                      )}
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
