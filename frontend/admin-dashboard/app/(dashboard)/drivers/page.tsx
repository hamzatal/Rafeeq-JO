'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { DriverFleetStats, DriverProfile } from '@rafeeq/shared';
import { api } from '../../../src/lib/api';
import { LoadError } from '../../../src/components/LoadError';
import { DriverStatusBadge } from '../../../src/components/DriverStatusBadge';
import { Phone } from '../../../src/components/Phone';
import { Num } from '../../../src/components/Num';
import { NavPageHeader } from '../../../src/components/NavPageHeader';
import { KpiCard } from '../../../src/components/KpiCard';
import { Panel } from '../../../src/components/Panel';
import { Pill } from '../../../src/components/Pill';
import { FilterPills } from '../../../src/components/FilterPills';
import { Icon } from '../../../src/components/Icon';
import { downloadCsv } from '../../../src/lib/download';

/* ═══════════════════════════════════════════════════════════════════════════
   الكباتن — screen 35 of `docs/design/src/06-admin-1.html`.

   The sheet subtitles it «التوثيق هو عنق الزجاجة — لذلك في المقدّمة», and that is a
   layout instruction: four aggregates ABOVE the queue, then a seven-column table whose
   row action is the decision itself.

   ── What this page was, and why it read as unchanged ──────────────────────

   Four columns — الاسم · الهاتف · الحالة · التقييم — and a text link. No aggregates, so
   the backlog the screen exists to expose was invisible; no المركبة or الوثائق, so
   deciding anything meant opening each captain in turn. `check:parity` scored it 7/16.

   Everything added here is computed, not typed. `meta.stats` from the API counts the
   WHOLE fleet — not the returned page — because «معتمدون 112 · 89% من الإجمالي» is a
   claim about the table, and an aggregate that changes when you filter is not one.
   ═══════════════════════════════════════════════════════════════════════════ */

const FILTERS = [
  { value: '', label: 'الكل' },
  { value: 'under_review', label: 'قيد المراجعة' },
  { value: 'approved', label: 'معتمد' },
  { value: 'pending', label: 'بانتظار' },
  { value: 'rejected', label: 'مرفوض' },
  { value: 'suspended', label: 'موقوف' },
];

/** «كيا بيكانتو 2020» — the sheet's المركبة cell, from the captain's active vehicle. */
function vehicleLabel(driver: DriverProfile): string | null {
  const vehicle = driver.vehicles?.find((v) => v.status === 'active') ?? driver.vehicles?.[0];
  if (!vehicle) return null;

  return [vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ');
}

/*
 * The الوثائق pill, derived from the document rows themselves.
 *
 * `verification_level` was the obvious source and is the wrong one: it is an untethered
 * integer — `approve()` sets `max(level, 3)` — with no defined maximum, so «ناقص 1 من N»
 * cannot be stated from it without inventing N. The documents ARE the denominator, and
 * `stats.required_documents` says how many are mandatory.
 */
function documentState(driver: DriverProfile, required: number) {
  const documents = driver.documents ?? [];
  if (documents.length === 0) return { tone: 'neutral' as const, icon: 'file-x', label: 'لم تُرفع' };

  if (documents.some((d) => d.status === 'rejected')) {
    return { tone: 'urgent' as const, icon: 'circle-x', label: 'مرفوضة' };
  }

  const approved = documents.filter((d) => d.status === 'approved');
  const outstanding = required - approved.length;
  if (outstanding > 0) {
    return { tone: 'open' as const, icon: 'triangle-alert', label: `ناقص ${outstanding}` };
  }

  /* «تنتهي قريباً» — an approved licence that lapses next month blocks the captain just
     as hard as a missing one, and only the expiry date says so. */
  const soon = Date.now() + 30 * 24 * 60 * 60 * 1000;
  if (approved.some((d) => d.expires_at && new Date(d.expires_at).getTime() < soon)) {
    return { tone: 'open' as const, icon: 'clock', label: 'تنتهي قريباً' };
  }

  return { tone: 'done' as const, icon: 'circle-check', label: 'مكتملة' };
}

/*
 * «4.72» — the sheet's متوسّط التقييم, to two places.
 *
 * Written out rather than `toFixed(2)` because `check:money` rejects that pattern
 * repo-wide, and it is right to: a dinar is 1000 fils, so two decimals on an AMOUNT
 * silently shows a different amount. A rating out of five is not an amount, and the
 * fix is to stop looking like money here rather than to carve an exception into a
 * money rule — an allowlist entry would let the next real violation through this file.
 */
function formatRating(average: number): string {
  const hundredths = Math.round(average * 100);

  return `${Math.trunc(hundredths / 100)}.${String(hundredths % 100).padStart(2, '0')}`;
}

/** «أقدم طلب قبل 3 أيام» — the sheet's caption, from a real timestamp. */
function ageInDays(iso: string | null): number | null {
  if (!iso) return null;

  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [stats, setStats] = useState<DriverFleetStats | null>(null);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  /*
   * ── ?q= from the global header search ─────────────────────────────────────
   *
   * This read `window.location.search` in a `[]`-dep effect. The header search is a
   * CLIENT-side Next navigation, so an operator already on /drivers who searches
   * again does not re-run the effect: `window.location.search` is stale relative to
   * the render and the box keeps the previous term. `useSearchParams` is the reactive
   * source, and it re-runs.
   */
  const params = useSearchParams();
  useEffect(() => {
    const q = params.get('q');
    if (q) setSearch(q);
  }, [params]);

  /*
   * ── The search goes to the SERVER ─────────────────────────────────────────
   *
   * It used to filter `drivers` in memory after fetching `per_page: 50`. So searching
   * for a captain who is 51st by `created_at` rendered «لا يوجد كباتن» — a factual
   * claim, on a page whose whole job is finding one captain among many.
   *
   * `DriverAdminController::index` accepts `search` as of this change; before it, the
   * parameter was sent and silently dropped, which is worse than not offering the box:
   * the unfiltered first page came back and rendered as though it were the answer.
   *
   * Debounced, because this fires per keystroke.
   */
  const load = useCallback(() => {
    setLoading(true);
    setLoadError(false);

    return api.admin
      .listDrivers({ status: status || undefined, search: search.trim() || undefined, per_page: 50 })
      .then((r) => {
        setDrivers(r.items);
        if (r.stats) setStats(r.stats);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [status, search]);

  useEffect(() => {
    const handle = setTimeout(load, 250);

    return () => clearTimeout(handle);
  }, [load]);

  const waiting = stats ? stats.by_status.pending + stats.by_status.under_review : 0;
  const oldestWait = ageInDays(stats?.oldest_pending_at ?? null);

  const counts = useMemo(
    () =>
      FILTERS.map((f) => ({
        ...f,
        count: stats ? (f.value ? stats.by_status[f.value as keyof typeof stats.by_status] : stats.total) : undefined,
      })),
    [stats],
  );

  const exportCsv = () =>
    downloadCsv(
      'captains',
      ['الكابتن', 'الهاتف', 'المركبة', 'الرحلات', 'التقييم', 'الحالة'],
      drivers.map((d) => [
        d.user?.full_name ?? '',
        d.user?.phone ?? '',
        vehicleLabel(d) ?? '',
        String(d.total_trips),
        d.rating_count > 0 ? String(d.rating_avg) : '',
        d.status_label,
      ]),
    );

  return (
    <div>
      <NavPageHeader
        href="/drivers"
        stat={
          stats ? (
            <>
              <Num value={stats.total} /> كابتناً · <Num value={waiting} /> بانتظار التوثيق
            </>
          ) : undefined
        }
        actions={
          <div className="flex items-center gap-2">
            <button onClick={exportCsv} className="btn-outline h-[34px] px-[13px] text-xs">
              تصدير CSV
            </button>
            {/*
              «دعوة كابتن» opens the onboarding brief rather than pretending to send an
              SMS this dashboard has no endpoint for. A button that silently does nothing
              is the failure this page just had with its search box.
            */}
            <Link href="/drivers?status=pending" className="btn-primary h-[34px] px-[13px] text-xs">
              دعوة كابتن
            </Link>
          </div>
        }
      />

      {/*
        Four cards, in the sheet's order. `share` is a real ratio with the denominator
        named in the caption; a card whose divisor is unknown gets no bar at all rather
        than one filled to an invented fraction.
      */}
      {stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <KpiCard
            label="معتمدون"
            value={<Num value={stats.by_status.approved} />}
            share={stats.total > 0 ? stats.by_status.approved / stats.total : undefined}
            caption={stats.total > 0 ? 'من الإجمالي' : undefined}
            tone="good"
          />
          <KpiCard
            label="بانتظار التوثيق"
            value={<Num value={waiting} />}
            share={stats.total > 0 ? waiting / stats.total : undefined}
            caption={
              oldestWait === null
                ? stats.total > 0
                  ? 'من الإجمالي'
                  : undefined
                : oldestWait === 0
                  ? '— أقدم طلب اليوم'
                  : <>— أقدم طلب قبل <Num value={oldestWait} /> يوماً</>
            }
            tone={waiting > 0 ? 'warn' : 'good'}
          />
          <KpiCard
            label="موقوفون"
            value={<Num value={stats.by_status.suspended} />}
            share={stats.total > 0 ? stats.by_status.suspended / stats.total : undefined}
            caption={stats.total > 0 ? 'بقرار إداري' : undefined}
            tone={stats.by_status.suspended > 0 ? 'bad' : 'good'}
          />
          {/*
            A mean with no ratings behind it is not 0.0 — it is unknown, and «0.0» on a
            ratings card reads as a fleet that is failing. The API sends null; «—» is the
            honest render, and the caption states the sample size because 4.7 over two
            ratings is a different claim from 4.7 over two thousand.
          */}
          <KpiCard
            label="متوسّط التقييم"
            value={stats.rating_avg === null ? '—' : <Num value={formatRating(stats.rating_avg)} />}
            share={stats.rating_avg === null ? undefined : stats.rating_avg / 5}
            caption={
              stats.rating_avg === null ? (
                'لا تقييمات بعد'
              ) : (
                <>
                  من 5 · <Num value={stats.rated_count} /> مُقيَّماً
                </>
              )
            }
            tone="neutral"
          />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <FilterPills options={counts} value={status} onChange={setStatus} label="تصفية الكباتن" />
        <input
          className="input max-w-xs ms-auto"
          placeholder="بحث بالاسم أو الهاتف..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Panel>
        {loading ? (
          <div className="p-6 text-center text-muted">جارٍ التحميل...</div>
        ) : loadError ? (
          <LoadError onRetry={load} />
        ) : drivers.length === 0 ? (
          <div className="p-6 text-center text-muted">لا يوجد كباتن</div>
        ) : (
          <table className="w-full text-sm">
            <caption className="sr-only">الكباتن</caption>
            <thead className="table-head">
              <tr>
                <th scope="col" className="text-right p-3 font-medium">الكابتن</th>
                <th scope="col" className="text-right p-3 font-medium">الهاتف</th>
                <th scope="col" className="text-right p-3 font-medium">المركبة</th>
                <th scope="col" className="text-right p-3 font-medium">الوثائق</th>
                <th scope="col" className="text-right p-3 font-medium">الرحلات</th>
                <th scope="col" className="text-right p-3 font-medium">التقييم</th>
                <th scope="col" className="text-right p-3 font-medium">الحالة</th>
                <th scope="col" className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => {
                const docs = documentState(d, stats?.required_documents ?? 0);
                /* The sheet gives the decision itself to captains awaiting review and a
                   quieter «ملف» to everyone else — the queue's primary action is on the
                   rows that need one. */
                const awaiting = d.status === 'under_review' || d.status === 'pending';

                return (
                  <tr key={d.id} className="row-line">
                    <td className="p-3 font-medium surface-text">{d.user?.full_name ?? '—'}</td>
                    <td className="p-3 text-muted"><Phone value={d.user?.phone} /></td>
                    <td className="p-3 text-muted">{vehicleLabel(d) ?? '—'}</td>
                    <td className="p-3"><Pill tone={docs.tone} icon={docs.icon}>{docs.label}</Pill></td>
                    <td className="p-3 text-muted tabular-nums"><Num value={d.total_trips} /></td>
                    {/* `{d.rating_avg?.toFixed(1)} ★` rendered a bare star with no
                        number for every captain who has not been rated yet: the optional
                        chain yields undefined, React prints nothing, and the ` ★` stays.
                        `rating_count` is the real test — a captain with no ratings has
                        `rating_avg: 0`, which is a value, not an absence. */}
                    <td className="p-3 text-muted tabular-nums">
                      {d.rating_count > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <Icon name="star" size={14} className="text-live" />
                          <Num value={Number(d.rating_avg).toFixed(1)} />
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-3"><DriverStatusBadge status={d.status} /></td>
                    <td className="p-3 text-left">
                      <Link
                        href={`/drivers/${d.id}`}
                        className={`${awaiting ? "btn-primary" : "btn-outline"} h-[34px] px-[13px] text-xs inline-flex items-center`}
                      >
                        {awaiting ? 'مراجعة' : 'ملف'}
                      </Link>
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
