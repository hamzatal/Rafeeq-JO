'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { formatJod } from '@rafeeq/shared';
import type { FinancialReport, Dispute } from '@rafeeq/shared';
import { api } from '../../src/lib/api';
import { useT } from '../../src/lib/i18n';
import { Skeleton, StatCardsSkeleton } from '../../src/components/Skeleton';
import { Icon } from '../../src/components/Icon';
import { Num } from '../../src/components/Num';
import { NavPageHeader } from '../../src/components/NavPageHeader';

/*
 * Money goes through the shared formatter. It used to be:
 *   const jod = (fils) => `${(fils / 1000).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
 * which dropped ALL THREE decimals off the platform's own revenue — 1,234,999 fils
 * rendered as "1,235", a full dinar high — and produced a bare Latin numeral with no
 * bidi isolation inside an RTL page, so the digits could reorder against the label.
 *
 * It slipped past `check:money` because that gate only looked for `.toFixed(2)` and a
 * hand-written «د.أ». A rule for it has been added.
 */
const jod = (fils: number) => formatJod(fils);
const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const today = () => new Date().toISOString().slice(0, 10);

/* ═══════════════════════════════════════════════════════════════════════════
   A KPI card, and the two things that used to be wrong with it.

   ── The progress bar was fabricated ────────────────────────────────────────

   `bar` held 0.75, 0.8, 0.6 and 0.3 — four constants typed by hand, with no input
   from the report they sat beside. It was also never RENDERED, so the dashboard
   carried invented progress values that nobody could even see. The approved reference
   (`docs/design/v2/06-admin-1`) does want a bar under each figure, and it wants
   «74% من هدف اليوم» — but this API returns no target and no previous period, so that
   exact caption cannot be computed. Inventing it is what the old constants did.

   `share` therefore carries a MEASURED ratio together with the name of the
   denominator it was measured against, and the caption states that denominator. A bar
   with nothing real to divide by is omitted rather than filled in.

   ── The trend pill pointed up regardless ───────────────────────────────────

   Every card rendered a `trending-up` arrow beside `trend`, and `trend` was never a
   trend: «منذ بداية الشهر» is a period, «عمولة رحلات + بيع اشتراكات» is a composition,
   and «لا يوجد حالياً» — no open disputes — was shown under an arrow meaning growth.
   A rising arrow next to "none right now" is not decoration; it is a wrong reading of
   the number it is attached to. Removed.
   ═══════════════════════════════════════════════════════════════════════════ */
interface Kpi {
  label: string;
  value: string;
  icon: string;
  /** A measured ratio, and the denominator it is a share of. Omitted when none exists. */
  share?: { ratio: number; ofLabel: string };
  danger?: boolean;
}

function KpiCard({ k }: { k: Kpi }) {
  const percent = k.share ? Math.round(Math.min(1, Math.max(0, k.share.ratio)) * 100) : 0;

  return (
    <div className={`kpi-card p-6 flex flex-col justify-between ${k.danger ? 'border-danger/40' : ''}`}>
      <div className="flex justify-between items-start mb-4">
        <div
          className={`w-12 h-12 rounded-lg flex items-center justify-center ${
            k.danger ? 'bg-danger/10 text-danger' : 'bg-brand-100 text-primary'
          }`}
        >
          <Icon name={k.icon} size={22} />
        </div>
      </div>
      <div>
        <p className="muted-text text-sm mb-1">{k.label}</p>
        {/*
          There was a `unit` slot printing "JOD" beside the value, and `formatJod`
          already returns the amount WITH the dinar mark — so the two money cards showed
          the same currency twice, in two scripts, on the first screen of the product.
          The unit belongs to the formatter, which is also the only thing that gets the
          bidi isolation right.
        */}
        <div className={`stat-number ${k.danger ? 'text-danger' : ''}`}>{k.value}</div>

        {k.share && (
          <div className="mt-3">
            {/*
              `aria-hidden` on the bar, because the caption below already states the
              same ratio in words — announcing a progressbar as well would read the
              figure twice, and this is decoration for a number that is already there.
            */}
            <div aria-hidden="true" className="h-1.5 rounded-full bg-line overflow-hidden">
              <div
                className={`h-full rounded-full ${k.danger ? 'bg-danger' : 'bg-primary'}`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted">
              <Num percent={percent} /> {k.share.ofLabel}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CommandCenter() {
  const { t, locale } = useT();
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const [rep, disp] = await Promise.allSettled([
        api.reports.financial({ from: monthStart(), to: today() }),
        api.disputes.list({ status: 'open' }),
      ]);
      if (!active) return;
      if (rep.status === 'fulfilled') setReport(rep.value);
      if (disp.status === 'fulfilled') setDisputes(disp.value);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const criticalOpen = useMemo(
    () => disputes.filter((d) => d.severity === 'critical' || d.severity === 'high').length,
    [disputes],
  );

  /*
   * Every `share` below divides two numbers this report actually returned. There is no
   * target and no previous period in `FinancialReport`, so «% من هدف اليوم» and
   * «% عن أمس» from the reference cannot be computed here — and are therefore absent
   * rather than approximated. A card with no honest denominator gets no bar.
   */
  const gross = report?.gross_fare_fils ?? 0;
  const ridesTotal = report?.rides_count ?? 0;
  const subscriptionRides = report?.by_funding?.subscription?.rides_count ?? 0;
  const openTotal = disputes.length;

  const kpis: Kpi[] = [
    {
      label: t('home.kpi.rides'),
      value: (ridesTotal).toLocaleString(locale),
      icon: 'car',
      // How many of the month's paid seats were covered by a plan rather than paid per ride.
      ...(ridesTotal > 0
        ? { share: { ratio: subscriptionRides / ridesTotal, ofLabel: t('home.share.onSubscription') } }
        : {}),
    },
    {
      label: t('home.kpi.commission'),
      // platform_revenue_fils, not commission_fils: the latter double-counts
      // commission booked on subscription-covered seats.
      value: jod(report?.platform_revenue_fils ?? 0),
      icon: 'wallet',
      ...(gross > 0
        ? { share: { ratio: (report?.platform_revenue_fils ?? 0) / gross, ofLabel: t('home.share.ofGross') } }
        : {}),
    },
    {
      label: t('home.kpi.gross'),
      value: jod(gross),
      icon: 'banknote',
      // The captains' cut of that same gross — the other side of the figure above.
      ...(gross > 0
        ? { share: { ratio: (report?.captain_earnings_fils ?? 0) / gross, ofLabel: t('home.share.captainCut') } }
        : {}),
    },
    {
      label: t('home.kpi.disputes'),
      value: String(criticalOpen),
      icon: 'triangle-alert',
      ...(openTotal > 0
        ? { share: { ratio: criticalOpen / openTotal, ofLabel: t('home.share.ofOpenDisputes') } }
        : {}),
      danger: criticalOpen > 0,
    },
  ];

  const maxZone = Math.max(1, ...(report?.by_zone ?? []).map((z) => z.ride_commission_fils));

  return (
    <div className="space-y-6">
      {/* Page header */}
      {/*
        The reference header (docs/design/v2/06-admin-1) states the DAY and when the
        figures were last refreshed, because every number below is scoped to a period —
        a dashboard that does not say "as of when" invites an operator to act on a stale
        screen. The greeting moved out: the sidebar footer already says who is signed in.
      */}
      <NavPageHeader
        href="/"
        stat={`${t('home.lastUpdate')}: ${new Date().toLocaleString(locale)}`}
      />

      {/* KPI row */}
      {loading ? (
        <StatCardsSkeleton />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {kpis.map((k) => (
            <KpiCard key={k.label} k={k} />
          ))}
        </div>
      )}

      {/* Bento: revenue-by-zone chart + quick links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 card p-0 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-line flex justify-between items-center">
            <h3 className="font-bold text-ink flex items-center gap-2">
              <Icon name="activity" size={20} className="text-primary-dark" />
              {t('home.commissionByZone')}
            </h3>
            <Link href="/reports" className="text-sm text-primary-dark hover:underline">
              {t('home.fullReports')}
            </Link>
          </div>
          <div className="p-5 flex-1 min-h-[280px]">
            {loading ? (
              <Skeleton className="h-[240px] w-full" />
            ) : (report?.by_zone?.length ?? 0) === 0 ? (
              <div className="h-full flex items-center justify-center text-muted">{t('home.noData')}</div>
            ) : (
              <div className="flex items-end gap-3 h-[260px]">
                {report!.by_zone.slice(0, 8).map((z, i) => (
                  <div key={z.zone_id ?? i} className="flex-1 flex flex-col items-center justify-end gap-2 h-full">
                    <div className="text-[11px] font-mono text-muted">{jod(z.ride_commission_fils)}</div>
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-primary to-primary-dark min-h-[6px] transition-all"
                      style={{ height: `${(z.ride_commission_fils / maxZone) * 100}%` }}
                    />
                    <div className="text-[10px] text-muted truncate w-full text-center">
                      {z.zone_id ? z.zone_id.slice(0, 6) : t('home.general')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick links / module summary */}
        <div className="card flex flex-col">
          <h3 className="font-bold text-ink mb-4">{t('home.quickAccess')}</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: '/disputes', label: t('nav.disputes'), icon: 'gavel' },
              { href: '/withdrawals', label: t('nav.withdrawals'), icon: 'wallet' },
              { href: '/drivers', label: t('nav.drivers'), icon: 'car-front' },
              { href: '/zones', label: t('nav.zones'), icon: 'map' },
              { href: '/reports', label: t('nav.reports'), icon: 'activity' },
              { href: '/safety', label: t('nav.safety'), icon: 'shield' },
            ].map((q) => (
              <Link
                key={q.href}
                href={q.href}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-line bg-background hover:bg-primary/5 hover:border-primary/40 transition-colors py-4"
              >
                <Icon name={q.icon} className="text-primary-dark" />
                <span className="text-xs font-semibold surface-text">{q.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent open disputes */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex justify-between items-center">
          <h3 className="font-bold text-ink flex items-center gap-2">
            <Icon name="gavel" size={20} className="text-danger" />
            {t('home.recentDisputes')}
          </h3>
          <Link href="/disputes" className="text-sm text-primary-dark hover:underline">
            {t('common.viewAll')}
          </Link>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : disputes.length === 0 ? (
            <div className="p-6 text-center text-muted">{t('home.noDisputes')}</div>
          ) : (
            <table className="data-table">
            <caption className="sr-only">{t('home.title')}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('home.account')}</th>
                  <th scope="col">{t('home.type')}</th>
                  <th scope="col">{t('home.severity')}</th>
                  <th scope="col">{t('home.riskScore')}</th>
                </tr>
              </thead>
              <tbody>
                {disputes.slice(0, 6).map((d) => (
                  <tr key={d.id}>
                    <td className="font-medium">{d.subject.name ?? '—'}</td>
                    <td className="text-muted">{d.type}</td>
                    <td>
                      <span
                        className={
                          d.severity === 'critical' || d.severity === 'high' ? 'pill-danger' : 'pill-warning'
                        }
                      >
                        {d.severity_label}
                      </span>
                    </td>
                    <td className="font-mono">{d.risk_score ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
