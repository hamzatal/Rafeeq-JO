'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Complaint } from '@rafeeq/shared';
import { api } from '../../../src/lib/api';
import { useT } from '../../../src/lib/i18n';

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
      await api.complaints.setStatus(id, { status, resolution, reinstate });
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
          <div className="p-6 text-center text-muted">{t('common.loading')}</div>
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
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setStatus(c.id, 'investigating')} disabled={busy === c.id} className="btn-outline px-3 py-1 text-xs">{t('complaints.investigate')}</button>
                      <button onClick={() => setStatus(c.id, 'resolved')} disabled={busy === c.id} className="btn-primary px-3 py-1 text-xs">{t('complaints.resolve')}</button>
                      <button onClick={() => setStatus(c.id, 'dismissed', true)} disabled={busy === c.id} className="btn-outline px-3 py-1 text-xs">{t('complaints.dismissReinstate')}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
