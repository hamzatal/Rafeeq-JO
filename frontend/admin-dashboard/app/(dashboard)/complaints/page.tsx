'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Complaint } from '@rafeeq/shared';
import { api } from '../../../src/lib/api';
import { useT } from '../../../src/lib/i18n';
import { Skeleton } from '../../../src/components/Skeleton';

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-line dark:border-dline last:border-0">
      <span className="text-xs muted-text">{label}</span>
      <span className="text-sm surface-text font-medium text-left">{value}</span>
    </div>
  );
}

const SEVERITY_CLASS: Record<string, string> = {
  low: 'bg-white text-muted border-line',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  critical: 'bg-red-50 text-red-700 border-red-300',
};

export default function ComplaintsPage() {
  const { t } = useT();
  const [items, setItems] = useState<Complaint[]>([]);
  const [severity, setSeverity] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [detail, setDetail] = useState<Complaint | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      setDetail(await api.complaints.show(id));
    } finally {
      setDetailLoading(false);
    }
  };

  const load = useCallback(() => {
    setLoading(true);
    api.complaints
      .adminList({ severity: severity || undefined })
      .then(setItems)
      .finally(() => setLoading(false));
  }, [severity]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (id: string, status: string, reinstate = false) => {
    setBusy(id);
    try {
      const resolution = status === 'resolved' || status === 'dismissed' ? window.prompt(t('complaints.resolutionPrompt')) ?? undefined : undefined;
      const updated = await api.complaints.setStatus(id, { status, resolution, reinstate });
      if (detail?.id === id) setDetail(updated);
      load();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold surface-text mb-4">{t('nav.complaints')}</h1>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {['', 'critical', 'high', 'medium', 'low'].map((sv) => (
          <button
            key={sv}
            onClick={() => setSeverity(sv)}
            className={`badge border ${severity === sv ? 'bg-primary text-white border-primary' : 'bg-white text-muted border-line'}`}
          >
            {sv === '' ? t('complaints.all') : sv}
          </button>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{Array.from({ length: 6 }).map((_, i) => (<Skeleton key={i} className="h-9 w-full" />))}</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-muted">{t('complaints.none')}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="table-head">
              <tr>
                <th className="text-right p-3 font-medium">{t('complaints.colNumber')}</th>
                <th className="text-right p-3 font-medium">{t('complaints.colCategory')}</th>
                <th className="text-right p-3 font-medium">{t('complaints.colSeverity')}</th>
                <th className="text-right p-3 font-medium">{t('complaints.colReported')}</th>
                <th className="text-right p-3 font-medium">{t('complaints.colStatus')}</th>
                <th className="text-right p-3 font-medium">{t('complaints.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="row-line align-top">
                  <td className="p-3 font-medium surface-text">{c.number}</td>
                  <td className="p-3 text-muted">{c.category}</td>
                  <td className="p-3">
                    <span className={`badge border ${SEVERITY_CLASS[c.severity] ?? ''}`}>{c.severity_label}</span>
                  </td>
                  <td className="p-3 text-muted">{c.against?.name ?? '—'}{c.against ? ` (${c.against.status})` : ''}</td>
                  <td className="p-3 text-muted">{c.status_label}</td>
                  <td className="p-3">
                    <button onClick={() => openDetail(c.id)} className="btn-primary px-3 py-1 text-xs">{t('complaints.view')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail / investigation modal */}
      {(detail || detailLoading) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onMouseDown={() => setDetail(null)}>
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto" onMouseDown={(e) => e.stopPropagation()}>
            {detailLoading || !detail ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => (<Skeleton key={i} className="h-6 w-full" />))}</div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold surface-text">{t('complaints.details')} — {detail.number}</h2>
                  <button type="button" onClick={() => setDetail(null)} className="text-muted hover:text-danger">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
                <div className="mb-4">
                  <DetailField label={t('complaints.colCategory')} value={detail.category} />
                  <DetailField label={t('complaints.colSeverity')} value={detail.severity_label} />
                  <DetailField label={t('complaints.colStatus')} value={detail.status_label} />
                  <DetailField label={t('complaints.reporter')} value={detail.reporter?.name ?? '—'} />
                  <DetailField label={t('complaints.against')} value={detail.against ? `${detail.against.name} (${detail.against.status})` : '—'} />
                  {detail.resolution ? <DetailField label={t('complaints.resolution')} value={detail.resolution} /> : null}
                </div>
                <div className="mb-4">
                  <div className="text-xs muted-text mb-1">{t('complaints.description')}</div>
                  <p className="text-sm surface-text bg-background dark:bg-dsurface rounded-lg p-3 whitespace-pre-wrap">{detail.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setStatus(detail.id, 'investigating')} disabled={busy === detail.id} className="btn-outline px-3 py-1.5 text-xs">{t('complaints.markInvestigating')}</button>
                  <button onClick={() => setStatus(detail.id, 'resolved')} disabled={busy === detail.id} className="btn-primary px-3 py-1.5 text-xs">{t('complaints.resolve')}</button>
                  <button onClick={() => setStatus(detail.id, 'dismissed', true)} disabled={busy === detail.id} className="btn-outline px-3 py-1.5 text-xs">{t('complaints.dismissReinstate')}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
