'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Dispute, DisputeDetail } from '@rafeeq/shared';
import { api } from '../../../src/lib/api';
import { useT } from '../../../src/lib/i18n';
import { Skeleton } from '../../../src/components/Skeleton';

const SEVERITY_CLASS: Record<string, string> = {
  low: 'bg-background text-muted',
  medium: 'bg-gold/15 text-gold',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-danger',
};

export default function DisputesPage() {
  const { t } = useT();
  const [items, setItems] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open');
  const [detail, setDetail] = useState<DisputeDetail | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.disputes
      .list(filter ? { status: filter } : undefined)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (id: string) => {
    setBusy(true);
    try {
      setDetail(await api.disputes.show(id));
    } finally {
      setBusy(false);
    }
  };

  const refresh = async (id: string) => {
    setDetail(await api.disputes.show(id));
    load();
  };

  const resolve = async (id: string) => {
    const resolution = window.prompt(t('disputes.resolvePrompt'));
    if (!resolution) return;
    const action = window.prompt(t('disputes.actionPrompt'), 'cleared');
    if (!action) return;
    setBusy(true);
    try {
      await api.disputes.resolve(id, resolution, action as never);
      await refresh(id);
    } finally {
      setBusy(false);
    }
  };

  const dismiss = async (id: string) => {
    const reason = window.prompt(t('disputes.dismissPrompt')) ?? undefined;
    setBusy(true);
    try {
      await api.disputes.dismiss(id, reason);
      await refresh(id);
    } finally {
      setBusy(false);
    }
  };

  const toggleFreeze = async (id: string, frozen: boolean) => {
    setBusy(true);
    try {
      if (frozen) await api.disputes.unfreeze(id);
      else await api.disputes.freeze(id);
      await refresh(id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="page-title mb-4">{t('disputes.title')}</h1>

      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { v: 'open', l: t('disputes.f.open') },
          { v: 'investigating', l: t('disputes.f.investigating') },
          { v: 'resolved', l: t('disputes.f.resolved') },
          { v: 'dismissed', l: t('disputes.f.dismissed') },
          { v: '', l: t('disputes.f.all') },
        ].map((s) => (
          <button
            key={s.v}
            onClick={() => setFilter(s.v)}
            className={`badge border ${filter === s.v ? 'bg-primary text-white border-primary' : 'bg-white text-muted border-line'}`}
          >
            {s.l}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* List */}
        <div className="card p-0 overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 6 }).map((_, i) => (<Skeleton key={i} className="h-9 w-full" />))}</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center text-muted">{t('disputes.none')}</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="table-head">
                <tr>
                  <th className="text-right p-3 font-medium">{t('disputes.colAccount')}</th>
                  <th className="text-right p-3 font-medium">{t('disputes.colType')}</th>
                  <th className="text-right p-3 font-medium">{t('disputes.colSeverity')}</th>
                  <th className="text-right p-3 font-medium">{t('disputes.colRisk')}</th>
                  <th className="text-right p-3 font-medium">{t('disputes.colStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((d) => (
                  <tr
                    key={d.id}
                    onClick={() => openDetail(d.id)}
                    className={`row-line cursor-pointer hover:bg-background ${detail?.dispute.id === d.id ? 'bg-background' : ''}`}
                  >
                    <td className="p-3 surface-text">
                      <div className="font-medium">{d.subject.name ?? '—'}</div>
                      <div className="text-xs text-muted">{d.subject.phone}</div>
                    </td>
                    <td className="p-3 text-muted">{d.type}</td>
                    <td className="p-3">
                      <span className={`badge ${SEVERITY_CLASS[d.severity] ?? ''}`}>{d.severity_label}</span>
                    </td>
                    <td className="p-3 font-bold surface-text">{d.risk_score ?? '—'}</td>
                    <td className="p-3 text-muted text-xs">{t(`disputes.status.${d.status}`, d.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail + evidence */}
        <div className="card">
          {!detail ? (
            <div className="text-center text-muted py-10">{t('disputes.selectPrompt')}</div>
          ) : (
            <div>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-lg font-bold surface-text">{detail.dispute.subject.name}</div>
                  <div className="text-xs text-muted">{detail.dispute.subject.phone} · {detail.dispute.subject.type}</div>
                </div>
                <span className={`badge ${SEVERITY_CLASS[detail.dispute.severity] ?? ''}`}>
                  {detail.dispute.severity_label}
                </span>
              </div>

              <div className="rounded-lg bg-background p-3 mb-3 text-sm">
                <div className="flex justify-between"><span className="muted-text">{t('disputes.type')}</span><span className="surface-text">{detail.dispute.type}</span></div>
                <div className="flex justify-between"><span className="muted-text">{t('disputes.statusLabel')}</span><span className="surface-text">{t(`disputes.status.${detail.dispute.status}`, detail.dispute.status)}</span></div>
                <div className="flex justify-between"><span className="muted-text">{t('disputes.riskScore')}</span><span className="font-bold surface-text">{detail.evidence.risk.score} ({detail.evidence.risk.level})</span></div>
                <div className="flex justify-between"><span className="muted-text">{t('disputes.accountStatus')}</span><span className="surface-text">{detail.dispute.subject.status}</span></div>
                {detail.dispute.summary && <div className="muted-text mt-2">{detail.dispute.summary}</div>}
              </div>

              {/* Actions */}
              {detail.dispute.status !== 'resolved' && detail.dispute.status !== 'dismissed' && (
                <div className="flex flex-wrap gap-2 mb-4">
                  <button disabled={busy} onClick={() => resolve(detail.dispute.id)} className="btn-primary px-3 py-1 text-xs">{t('disputes.resolve')}</button>
                  <button disabled={busy} onClick={() => dismiss(detail.dispute.id)} className="btn-outline px-3 py-1 text-xs">{t('disputes.dismiss')}</button>
                  <button
                    disabled={busy}
                    onClick={() => toggleFreeze(detail.dispute.id, detail.dispute.subject.status === 'suspended')}
                    className="btn-outline px-3 py-1 text-xs"
                  >
                    {detail.dispute.subject.status === 'suspended' ? t('disputes.unfreeze') : t('disputes.freeze')}
                  </button>
                </div>
              )}

              {/* Evidence: risk flags */}
              <h3 className="font-bold surface-text text-sm mb-2">{t('disputes.riskFlags')} ({detail.evidence.risk_flags.length})</h3>
              <div className="space-y-1 mb-4 max-h-48 overflow-auto">
                {detail.evidence.risk_flags.map((f) => (
                  <div key={f.id} className="text-xs border border-line rounded-lg p-2">
                    <div className="flex justify-between">
                      <span className="surface-text font-medium">{f.type}</span>
                      <span className={`badge ${SEVERITY_CLASS[f.severity] ?? ''}`}>{f.severity_label}</span>
                    </div>
                    {f.description && <div className="text-muted mt-1">{f.description}</div>}
                  </div>
                ))}
                {detail.evidence.risk_flags.length === 0 && <div className="text-xs text-muted">{t('disputes.empty')}</div>}
              </div>

              {/* Evidence: cancellations */}
              <h3 className="font-bold surface-text text-sm mb-2">{t('disputes.cancellations')} ({detail.evidence.cancellations.length})</h3>
              <div className="space-y-1 mb-2 max-h-40 overflow-auto">
                {detail.evidence.cancellations.map((c) => (
                  <div key={c.id} className="text-xs border border-line rounded-lg p-2 flex justify-between">
                    <span className="text-muted">{c.reason ?? t('disputes.noReason')} · {t('disputes.passengers')}: {c.passengers_count}</span>
                    <span className="text-muted">{c.created_at ? new Date(c.created_at).toLocaleDateString('ar') : ''}</span>
                  </div>
                ))}
                {detail.evidence.cancellations.length === 0 && <div className="text-xs text-muted">{t('disputes.empty')}</div>}
              </div>

              {detail.evidence.ghost_watches.length > 0 && (
                <div className="text-xs text-danger">{t('disputes.ghostWatches')}: {detail.evidence.ghost_watches.length}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
