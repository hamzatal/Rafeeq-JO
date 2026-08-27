'use client';

import { useEffect, useState } from 'react';
import { formatJod } from '@rafeeq/shared';
import type { AdminInsights } from '@rafeeq/shared';
import { api } from '../../../src/lib/api';
import { useT } from '../../../src/lib/i18n';
import { Icon } from '../../../src/components/Icon';

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

function Stat({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="card flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl bg-primary/15 text-primary-dark flex items-center justify-center shrink-0">
        <Icon name={icon} size={22} />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-bold uppercase tracking-wider muted-text truncate">{label}</div>
        <div className="text-xl font-bold surface-text">{value}</div>
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const { t } = useT();
  const [data, setData] = useState<AdminInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    api.assistant
      .insights()
      .then(setData)
      .catch(() => setError(t('insights.loadError')))
      .finally(() => setLoading(false));
  };

  useEffect(() => load(), []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-end gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Icon name="brain" className="text-primary-dark" />
            {t('nav.insights')}
          </h1>
          <p className="muted-text mt-1">{t('insights.subtitle')}</p>
        </div>
        <button onClick={load} className="btn-primary flex items-center gap-2" disabled={loading}>
          <Icon name="refresh-cw" size={18} />
          {t('insights.refresh')}
        </button>
      </div>

      {error && <div className="rounded-lg border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger">{error}</div>}

      {loading ? (
        <div className="card text-center text-muted py-10">{t('insights.generating')}</div>
      ) : data ? (
        <>
          {/* AI / rules badge */}
          <div className="flex items-center gap-2 text-xs">
            <span className={data.source === 'ai' ? 'pill-success' : 'badge bg-slate-100 text-muted'}>
              {data.source === 'ai' ? t('insights.sourceAi') : t('insights.sourceRules')}
            </span>
            <span className="text-muted font-mono">
              {new Date(data.generated_at).toLocaleString('ar')}
            </span>
          </div>

          {/* Narrative analysis */}
          <div className="card border-r-4 border-primary">
            <h3 className="font-bold surface-text mb-2 flex items-center gap-2">
              <Icon name="chart-line" size={20} className="text-primary-dark" />
              {t('insights.analysis')}
            </h3>
            <p className="surface-text leading-relaxed">{data.analysis}</p>
          </div>

          {/* Recommendations */}
          {data.recommendations.length > 0 && (
            <div className="card">
              <h3 className="font-bold surface-text mb-3 flex items-center gap-2">
                <Icon name="thumbs-up" size={20} className="text-success" />
                {t('insights.recommendations')}
              </h3>
              <ul className="space-y-2">
                {data.recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 surface-text">
                    <Icon name="circle-check" size={18} className="text-success mt-0.5" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* KPI grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            <Stat label={t('insights.kpi.newUsers')} value={String(data.metrics.users.new_this_month)} icon="user-plus" />
            <Stat label={t('insights.kpi.totalUsers')} value={String(data.metrics.users.total)} icon="users" />
            <Stat label={t('insights.kpi.tripsThisMonth')} value={String(data.metrics.trips.this_month)} icon="car" />
            <Stat label={t('insights.kpi.tripsCompleted')} value={String(data.metrics.trips.completed)} icon="circle-check" />
            <Stat label={t('insights.kpi.tripsCancelled')} value={String(data.metrics.trips.cancelled)} icon="circle-x" />
            <Stat label={t('insights.kpi.activeSubs')} value={String(data.metrics.subscriptions.active)} icon="clipboard-list" />
            {/*
              An unavailable figure shows as «—», not as 0. A zero here would be
              indistinguishable from a month with no business, which is exactly how
              a broken revenue query goes unnoticed for a week.
            */}
            <Stat
              label={t('insights.kpi.platformRevenue')}
              value={data.metrics.finance_available ? jod(data.metrics.finance.platform_revenue_fils) : '—'}
              icon="wallet"
            />
            <Stat
              label={t('insights.kpi.grossFare')}
              value={data.metrics.finance_available ? jod(data.metrics.finance.gross_fare_fils) : '—'}
              icon="banknote"
            />
            <Stat label={t('insights.kpi.driversPending')} value={String(data.metrics.drivers.pending_review)} icon="user-check" />
            <Stat label={t('insights.kpi.openDisputes')} value={String(data.metrics.safety.open_disputes)} icon="gavel" />
            <Stat label={t('insights.kpi.openRiskFlags')} value={String(data.metrics.safety.unresolved_risk_flags)} icon="triangle-alert" />
            <Stat label={t('insights.kpi.pendingPayments')} value={String(data.metrics.safety.pending_payments)} icon="hourglass" />
          </div>

          {!data.metrics.finance_available && (
            <div className="rounded-lg border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger flex items-center gap-2">
              <Icon name="circle-alert" size={18} />
              {t('insights.financeUnavailable')}
            </div>
          )}

          {!data.ai_enabled && (
            <div className="rounded-lg border border-line bg-background px-4 py-3 text-sm muted-text">
              {t('insights.aiDisabledHint')}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
