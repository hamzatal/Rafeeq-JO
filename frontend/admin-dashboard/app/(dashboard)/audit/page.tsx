'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AuditLogEntry } from '@rafeeq/api-client';
import { api } from '../../../src/lib/api';
import { useT } from '../../../src/lib/i18n';
import { downloadBlob, stamp } from '../../../src/lib/download';

const short = (v: string | null, n = 8) => (v ? v.slice(0, n) : '—');

export default function AuditPage() {
  const { t } = useT();
  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api.admin
      .listAuditLogs({ action: action || undefined, from: from || undefined, to: to || undefined, per_page: 50 })
      .then((r) => setItems(r.items))
      .catch(() => setError(t('audit.loadError')))
      .finally(() => setLoading(false));
  }, [action, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.admin.auditActions().then(setActions).catch(() => undefined);
  }, []);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const blob = await api.admin.exportAuditCsv({ action: action || undefined, from: from || undefined, to: to || undefined });
      downloadBlob(blob, `audit-logs-${stamp()}.csv`);
    } catch {
      setError(t('audit.loadError'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <h1 className="page-title mb-1">{t('audit.title')}</h1>
      <p className="muted-text text-sm mb-4">{t('audit.intro')}</p>

      <div className="card mb-5 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs mb-1 muted-text">{t('audit.action')}</label>
          <select className="input" value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">{t('audit.allActions')}</option>
            {actions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs mb-1 muted-text">{t('reports.from')}</label>
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs mb-1 muted-text">{t('reports.to')}</label>
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button onClick={load} className="btn-primary">{t('audit.filter')}</button>
        <button onClick={exportCsv} disabled={exporting} className="btn-outline inline-flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px]">download</span>
          {exporting ? t('common.loading') : t('reports.exportCsv')}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-danger/30 bg-red-50 px-3 py-2 text-sm text-danger">{error}</div>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-right muted-text border-b border-line dark:border-dline">
              <th className="px-4 py-3 font-semibold">{t('audit.when')}</th>
              <th className="px-4 py-3 font-semibold">{t('audit.action')}</th>
              <th className="px-4 py-3 font-semibold">{t('audit.user')}</th>
              <th className="px-4 py-3 font-semibold">{t('audit.target')}</th>
              <th className="px-4 py-3 font-semibold">{t('audit.ip')}</th>
              <th className="px-4 py-3 font-semibold">{t('audit.changes')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">{t('common.loading')}</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">{t('audit.empty')}</td>
              </tr>
            ) : (
              items.map((log) => (
                <tr key={log.id} className="border-b border-line/60 dark:border-dline/60 align-top">
                  <td className="px-4 py-3 whitespace-nowrap text-xs muted-text">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge bg-primary/10 text-primary font-semibold">{log.action}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{short(log.user_id)}</td>
                  <td className="px-4 py-3 text-xs">
                    {log.auditable_type ? `${log.auditable_type.split('\\').pop()} · ${short(log.auditable_id, 6)}` : '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{log.ip ?? '—'}</td>
                  <td className="px-4 py-3 max-w-md">
                    {log.changes ? (
                      <code className="block truncate text-xs text-muted" title={JSON.stringify(log.changes)}>
                        {JSON.stringify(log.changes)}
                      </code>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
