'use client';

import { useEffect, useState } from 'react';
import type { AdminInsights } from '@rafeeq/shared';
import { api } from '../../../src/lib/api';
import { useT } from '../../../src/lib/i18n';

const jod = (fils: number) => `${(fils / 1000).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

function Stat({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="card flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl bg-cyan/15 text-cyan-deep flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-[22px]">{icon}</span>
      </div>
      <div className="min-w-0">
        <div className="text-xs font-bold uppercase tracking-wider muted-text truncate">{label}</div>
        <div className="text-xl font-extrabold surface-text">{value}</div>
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
            <span className="material-symbols-outlined text-cyan-deep">neurology</span>
            {t('nav.insights')}
          </h1>
          <p className="muted-text mt-1">{t('insights.subtitle')}</p>
        </div>
        <button onClick={load} className="btn-primary flex items-center gap-2" disabled={loading}>
          <span className="material-symbols-outlined text-[18px]">refresh</span>
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
          <div className="card border-r-4 border-cyan">
            <h3 className="font-bold surface-text mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-cyan-deep text-[20px]">insights</span>
              {t('insights.analysis')}
            </h3>
            <p className="surface-text leading-relaxed">{data.analysis}</p>
          </div>

          {/* Recommendations */}
          {data.recommendations.length > 0 && (
            <div className="card">
              <h3 className="font-bold surface-text mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-success text-[20px]">recommend</span>
                {t('insights.recommendations')}
              </h3>
              <ul className="space-y-2">
                {data.recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 surface-text">
                    <span className="material-symbols-outlined text-success text-[18px] mt-0.5">check_circle</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* KPI grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            <Stat label={t('insights.kpi.newUsers')} value={String(data.metrics.users.new_this_month)} icon="person_add" />
            <Stat label={t('insights.kpi.totalUsers')} value={String(data.metrics.users.total)} icon="group" />
            <Stat label={t('insights.kpi.tripsThisMonth')} value={String(data.metrics.trips.this_month)} icon="directions_car" />
            <Stat label={t('insights.kpi.tripsCompleted')} value={String(data.metrics.trips.completed)} icon="task_alt" />
            <Stat label={t('insights.kpi.tripsCancelled')} value={String(data.metrics.trips.cancelled)} icon="cancel" />
            <Stat label={t('insights.kpi.activeSubs')} value={String(data.metrics.subscriptions.active)} icon="card_membership" />
            <Stat label={t('insights.kpi.commission')} value={jod(data.metrics.finance.commission_fils)} icon="account_balance_wallet" />
            <Stat label={t('insights.kpi.grossFare')} value={jod(data.metrics.finance.gross_fare_fils)} icon="payments" />
            <Stat label={t('insights.kpi.driversPending')} value={String(data.metrics.drivers.pending_review)} icon="how_to_reg" />
            <Stat label={t('insights.kpi.openDisputes')} value={String(data.metrics.safety.open_disputes)} icon="gavel" />
            <Stat label={t('insights.kpi.openRiskFlags')} value={String(data.metrics.safety.unresolved_risk_flags)} icon="warning" />
            <Stat label={t('insights.kpi.pendingPayments')} value={String(data.metrics.safety.pending_payments)} icon="hourglass_top" />
          </div>

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
