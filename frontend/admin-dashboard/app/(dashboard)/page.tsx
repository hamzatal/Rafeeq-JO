'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { bareJod, formatJod } from '@rafeeq/shared';
import type { AdminInsights, FinancialReport, Trip, Zone } from '@rafeeq/shared';
import { api } from '../../src/lib/api';
import { useT } from '../../src/lib/i18n';
import { Icon } from '../../src/components/Icon';
import { Num } from '../../src/components/Num';
import { Pill } from '../../src/components/Pill';
import { Panel } from '../../src/components/Panel';
import { KpiCard, type KpiTone } from '../../src/components/KpiCard';
import { NavPageHeader } from '../../src/components/NavPageHeader';
import { Skeleton, StatCardsSkeleton } from '../../src/components/Skeleton';
import { LoadError } from '../../src/components/LoadError';
import { downloadBlob, stamp } from '../../src/lib/download';

/* ═══════════════════════════════════════════════════════════════════════════
   لوحة القيادة — «ما يحتاج إجراءً في المقدّمة، لا مؤشّرات للزينة»

   That sentence is the caption of screen 33 in `docs/design/src/06-admin-1.html`, and it
   is the whole brief. What stood here before did the opposite: four KPI cards, a
   commission-by-zone chart, a quick-links grid and a disputes table — none of which tell
   an operator what to DO when they sit down.

   The reference composition, which this now follows exactly:

     · header with the day, and two actions
     · four KPI cards, each with a bar and a caption naming its denominator
     · `.a2` — a 1.5fr / 1fr split
         left   the live trips table
         right  «يحتاج إجراءً» over «أعلى المناطق طلباً»

   ── Where the reference numbers could not be honoured ──────────────────────

   Its third card is «كباتن متصلون 48 / 126». There is no online-presence count anywhere
   in this API — no heartbeat, no session table for captains. So rather than print a
   number that looks live and is not, this card reports the same underlying question the
   reference is asking (is there enough supply?) with the figures that DO exist:
   approved captains against all captains.

   Everything else is measured: the bars divide two values from the same response, and
   every «يحتاج إجراءً» row is a count the API returned. A row whose count is zero is not
   rendered — a panel titled "needs action" listing four things that need none is how an
   operator learns to stop reading it.
   ═══════════════════════════════════════════════════════════════════════════ */

const monthStart = () => {
  const d = new Date();

  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const today = () => new Date().toISOString().slice(0, 10);

const jod = (fils: number) => formatJod(fils);

/**
 * A short, stable trip reference — «TRP-4821» in the sheet.
 *
 * Trips carry a UUIDv7 and no short code, and the table needs a column an operator can
 * read aloud on a phone call. This renders the LAST four hex of the real id, so it is a
 * projection of the actual key rather than an invented number: the same trip always
 * renders the same reference, and it is unique enough to disambiguate a screenful.
 * `route.name` was standing here and repeats across every pooled trip on a corridor, so
 * the column identified nothing.
 */
const tripRef = (id: string) => `TRP-${id.replace(/-/g, '').slice(-4).toUpperCase()}`;

/** The riders on a pooled seat-share. The sheet's «الطالب» assumes one; there are many. */
const riders = (trip: Trip): string => {
  const names = (trip.passengers ?? []).map((p) => p.student_name).filter(Boolean) as string[];
  if (names.length === 0) return '—';

  return names.length === 1 ? names[0]! : `${names[0]!} +${names.length - 1}`;
};

/** One row of «يحتاج إجراءً». */
interface ActionRow {
  icon: string;
  tone: 'bad' | 'warn' | 'info';
  title: string;
  hint: string;
  pill: string;
  href: string;
  count: number;
}

const ROW_TILE: Record<ActionRow['tone'], string> = {
  bad: 'bg-danger/10 text-danger',
  warn: 'bg-warning-soft text-warning',
  info: 'bg-brand-50 text-primary',
};

const ROW_PILL: Record<ActionRow['tone'], 'urgent' | 'open' | 'progress'> = {
  bad: 'urgent',
  warn: 'open',
  info: 'progress',
};

export default function CommandCenter() {
  const { t, locale } = useT();
  const [month, setMonth] = useState<FinancialReport | null>(null);
  const [day, setDay] = useState<FinancialReport | null>(null);
  const [insights, setInsights] = useState<AdminInsights | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);
      setFailed(false);

      const [m, d, ins, tr, zn] = await Promise.allSettled([
        api.reports.financial({ from: monthStart(), to: today() }),
        api.reports.financial({ from: today(), to: today() }),
        api.assistant.insights(),
        api.admin.listTrips({ per_page: 7 }),
        api.zones.list(),
      ]);
      if (!alive) return;

      if (m.status === 'fulfilled') setMonth(m.value);
      if (d.status === 'fulfilled') setDay(d.value);
      if (ins.status === 'fulfilled') setInsights(ins.value);
      if (tr.status === 'fulfilled') setTrips(tr.value.items);
      if (zn.status === 'fulfilled') setZones(zn.value);

      // Every panel failing is a broken screen; one failing is a partial one, and the
      // panels say so individually.
      setFailed([m, d, ins, tr].every((r) => r.status === 'rejected'));
      setLoading(false);
    };

    void load();

    return () => {
      alive = false;
    };
  }, []);

  const metrics = insights?.metrics;

  /* ── KPIs ──────────────────────────────────────────────────────────────── */
  const kpis = useMemo(() => {
    const dayGross = day?.gross_fare_fils ?? 0;
    const dayRevenue = day?.platform_revenue_fils ?? 0;
    const tripsMonth = metrics?.trips.this_month ?? 0;
    const tripsDone = metrics?.trips.completed ?? 0;
    const captains = metrics?.users.drivers ?? 0;
    const approved = metrics?.drivers.approved ?? 0;
    const pendingPayments = metrics?.safety.pending_payments ?? 0;

    const out: (KpiCardProps & { key: string; plain: string })[] = [
      {
        key: 'revenue',
        plain: jod(dayRevenue),
        label: t('home.kpi.dayRevenue'),
        /* `t-display` number beside a `t-label` unit — the sheet keeps them separate so
           the figure is the thing you read and «د.أ» merely qualifies it. */
        value: bareJod(dayRevenue),
        unit: t('common.dinar'),
        ...(dayGross > 0
          ? { share: dayRevenue / dayGross, caption: t('home.share.ofGross'), tone: 'good' as KpiTone }
          : { caption: t('home.noneToday'), tone: 'neutral' as KpiTone }),
      },
      {
        key: 'trips',
        plain: String(tripsDone),
        label: t('home.kpi.completedTrips'),
        value: <Num value={tripsDone} />,
        ...(tripsMonth > 0
          ? { share: tripsDone / tripsMonth, caption: t('home.share.ofMonthTrips'), tone: 'neutral' as KpiTone }
          : { caption: t('home.noneThisMonth'), tone: 'neutral' as KpiTone }),
      },
      {
        key: 'captains',
        plain: `${approved} / ${captains}`,
        // The reference asks «كباتن متصلون»; this API has no presence signal, so the
        // same question is answered with approved-against-total. See the file header.
        label: t('home.kpi.approvedCaptains'),
        /*
         * ONE isolated run, not two.
         *
         * `<Num>{approved}</Num> / <Num>{captains}</Num>` isolates each number
         * separately and leaves the slash bidi-neutral between them — so the paragraph's
         * RTL direction ordered the two RUNS right-to-left and «3 / 6» rendered as
         * «6 / 3». A ratio displayed backwards is not a cosmetic problem: it said three
         * captains out of six were approved as six out of three. Passing the whole
         * string through `value` wraps it in a single isolate, which is what the sheet
         * does too (`unicode-bidi:isolate` on «48 / 126»).
         */
        value: <Num value={`${approved} / ${captains}`} />,
        ...(captains > 0
          ? {
              share: approved / captains,
              caption: t('home.share.ofAllCaptains'),
              tone: (approved / captains < 0.5 ? 'warn' : 'good') as KpiTone,
            }
          : {}),
      },
      {
        key: 'payments',
        plain: String(pendingPayments),
        label: t('home.kpi.pendingPayments'),
        value: <Num value={pendingPayments} />,
        // No total-payments figure exists to divide by, so no bar — only the fact.
        caption: pendingPayments > 0 ? t('home.needsReviewNow') : t('home.allReviewed'),
        tone: (pendingPayments > 0 ? 'bad' : 'good') as KpiTone,
      },
    ];

    return out;
  }, [day, metrics, t]);

  /* ── «يحتاج إجراءً» — only what actually does ──────────────────────────── */
  const actions = useMemo<ActionRow[]>(() => {
    if (!metrics) return [];

    return (
      [
        {
          icon: 'shield',
          tone: 'bad',
          title: t('home.action.riskFlags'),
          hint: t('home.action.riskFlagsHint'),
          pill: t('home.pill.urgent'),
          href: '/safety',
          count: metrics.safety.unresolved_risk_flags,
        },
        {
          icon: 'banknote',
          tone: 'warn',
          title: t('home.action.payments'),
          hint: t('home.action.paymentsHint'),
          pill: t('home.pill.review'),
          href: '/payments',
          count: metrics.safety.pending_payments,
        },
        {
          icon: 'car-front',
          tone: 'info',
          title: t('home.action.drivers'),
          hint: t('home.action.driversHint'),
          pill: t('home.pill.verify'),
          href: '/drivers',
          count: metrics.drivers.pending_review,
        },
        {
          icon: 'gavel',
          tone: 'warn',
          title: t('home.action.disputes'),
          hint: t('home.action.disputesHint'),
          pill: t('home.pill.resolve'),
          href: '/disputes',
          count: metrics.safety.open_disputes,
        },
      ] as ActionRow[]
    ).filter((row) => row.count > 0);
  }, [metrics, t]);

  /* ── «أعلى المناطق طلباً» — by_zone, named and ranked ──────────────────── */
  const topZones = useMemo(() => {
    const rows = (month?.by_zone ?? [])
      .filter((z) => z.rides_count > 0)
      .sort((a, b) => b.rides_count - a.rides_count)
      .slice(0, 4);
    const max = Math.max(1, ...rows.map((z) => z.rides_count));

    return rows.map((z) => ({
      id: z.zone_id ?? 'none',
      name: zones.find((zone) => zone.id === z.zone_id)?.name_ar ?? t('home.general'),
      rides: z.rides_count,
      share: z.rides_count / max,
    }));
  }, [month, zones, t]);

  const exportCsv = () => {
    /*
     * A BOM, and quotes around every cell.
     *
     * Excel reads a BOM-less UTF-8 CSV as the system codepage, which turns every Arabic
     * label into mojibake — and this file exists so an operator can open it. The quoting
     * matters for the same practical reason: `formatJod` returns bidi isolate characters
     * and a label may contain a comma.
     */
    const rows: string[][] = [
      [t('home.csvMetric'), t('home.csvValue')],
      ...kpis.map((k) => [k.label, k.plain]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\r\n');

    downloadBlob(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }), `dashboard-${stamp()}.csv`);
  };

  if (failed) return <LoadError onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-4">
      <NavPageHeader
        href="/"
        stat={new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        actions={
          <>
            <button onClick={exportCsv} className="btn-outline h-[34px] px-[13px] text-xs">
              {t('home.exportCsv')}
            </button>
            <Link href="/ride-requests" className="btn-primary h-[34px] px-[13px] text-xs">
              {t('rideRequests.runMatching')}
            </Link>
          </>
        }
      />

      {/* `.akpis{grid-template-columns:repeat(4,1fr);gap:11px}` */}
      {loading ? (
        <StatCardsSkeleton />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-[11px]">
          {kpis.map(({ key, plain: _plain, ...kpi }) => (
            <KpiCard key={key} {...kpi} />
          ))}
        </div>
      )}

      {/* `.a2{grid-template-columns:1.5fr 1fr;gap:14px}` */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-[14px] items-start">
        <Panel>
          <table className="data-table">
            <caption className="sr-only">{t('nav.trips')}</caption>
            <thead>
              <tr>
                <th scope="col">{t('home.col.trip')}</th>
                <th scope="col">{t('home.col.rider')}</th>
                <th scope="col">{t('home.col.captain')}</th>
                <th scope="col">{t('home.col.seats')}</th>
                <th scope="col">{t('home.col.fareUnit')}</th>
                <th scope="col">{t('home.col.status')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6}>
                      <Skeleton className="h-5 w-full" />
                    </td>
                  </tr>
                ))
              ) : trips.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-6">
                    {t('trips.none')}
                  </td>
                </tr>
              ) : (
                trips.map((trip) => (
                  <tr key={trip.id}>
                    <td className="font-bold surface-text tabular-nums" dir="ltr">{tripRef(trip.id)}</td>
                    <td className="text-muted">{riders(trip)}</td>
                    <td className="text-muted">{trip.captain?.name ?? '—'}</td>
                    {/*
                      «0 / 4», not `range`. `Num range` joins with an EN DASH, which means
                      "from–to": «0–4» reads as a span of seats rather than "0 of 4 taken".
                      One isolate around the whole string, so the two numbers cannot be
                      reordered by the RTL paragraph the way the captains ratio was.
                    */}
                    <td className="text-muted">
                      <Num value={`${trip.booked_count ?? 0} / ${trip.capacity}`} />
                    </td>
                    {/*
                      `bareJod`, not `jod`: the sheet's fare cells are «1.250» with the unit
                      carried ONCE by the column header. Repeating «د.أ» down seven rows is
                      noise in the column an operator scans fastest.
                    */}
                    <td>{trip.pricing ? bareJod(trip.pricing.fare_fils) : '—'}</td>
                    <td>
                      <Pill
                        tone={
                          trip.status === 'completed'
                            ? 'done'
                            : trip.status === 'cancelled'
                              ? 'urgent'
                              : trip.status === 'started'
                                ? 'open'
                                : 'progress'
                        }
                      >
                        {trip.status_label}
                      </Pill>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Panel>

        <div className="flex flex-col gap-[14px]">
          <Panel title={t('home.needsAction')}>
            {loading ? (
              <div className="px-[14px] py-3 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : actions.length === 0 ? (
              <div className="px-[14px] py-6 flex items-center gap-2 text-sm text-success">
                <Icon name="check" size={16} />
                {t('home.nothingNeedsAction')}
              </div>
            ) : (
              actions.map((row) => (
                <Link
                  key={row.href}
                  href={row.href}
                  className="flex items-center gap-2.5 px-[14px] py-[9px] border-t border-neutral-100 hover:bg-primary/5 transition-colors"
                >
                  <div className={`w-[30px] h-[30px] rounded-[9px] grid place-items-center shrink-0 ${ROW_TILE[row.tone]}`}>
                    <Icon name={row.icon} size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold surface-text truncate">
                      <Num value={row.count} /> {row.title}
                    </div>
                    <div className="text-[11px] text-neutral-500 truncate">{row.hint}</div>
                  </div>
                  <Pill tone={ROW_PILL[row.tone]}>{row.pill}</Pill>
                </Link>
              ))
            )}
          </Panel>

          <Panel title={t('home.topZones')} padded>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : topZones.length === 0 ? (
              <p className="text-sm text-muted py-2">{t('home.noData')}</p>
            ) : (
              topZones.map((zone) => (
                <div key={zone.id} className="mb-[11px] last:mb-0">
                  <div className="flex items-center mb-1">
                    <span className="text-xs surface-text">{zone.name}</span>
                    <span className="ms-auto text-xs text-neutral-600">
                      <Num value={zone.rides} />
                    </span>
                  </div>
                  <div aria-hidden="true" className="h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(zone.share * 100)}%` }} />
                  </div>
                </div>
              ))
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

/** Local alias so the KPI array can carry a `key` alongside the component's props. */
type KpiCardProps = React.ComponentProps<typeof KpiCard>;
