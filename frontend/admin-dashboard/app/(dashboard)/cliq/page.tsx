'use client';

import { useEffect, useState } from 'react';
import type { CliqSettings } from '@rafeeq/api-client';
import type { PaymentRequest } from '@rafeeq/shared';
import { api } from '../../../src/lib/api';
import { useT } from '../../../src/lib/i18n';

export default function CliqPage() {
  const { t } = useT();
  const [settings, setSettings] = useState<CliqSettings>({ alias: '', beneficiary_name: '', bank_name: '' });
  const [topups, setTopups] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    api.admin
      .getCliqSettings()
      .then((s) => setSettings({ alias: s.alias ?? '', beneficiary_name: s.beneficiary_name ?? '', bank_name: s.bank_name ?? '' }))
      .catch((e) => {
        if ((e as { status?: number })?.status === 403) setForbidden(true);
      })
      .finally(() => setLoading(false));
    // Recent CliQ payment requests (best-effort; requires payments.view).
    api.payments.adminQueue('').then(setTopups).catch(() => {});
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const updated = await api.admin.updateCliqSettings(settings);
      setSettings({
        alias: updated.alias ?? '',
        beneficiary_name: updated.beneficiary_name ?? '',
        bank_name: updated.bank_name ?? '',
      });
      setMsg({ kind: 'ok', text: t('cliq.saved') });
    } catch (e2) {
      setMsg({ kind: 'err', text: (e2 as Error)?.message || t('common.error') });
    } finally {
      setSaving(false);
    }
  };

  if (forbidden) {
    return (
      <div className="card max-w-lg">
        <p className="surface-text">{t('admins.noAccess')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-extrabold surface-text mb-1">{t('cliq.title')}</h1>
      <p className="text-sm text-muted mb-6">{t('cliq.intro')}</p>

      <form onSubmit={save} className="card mb-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-xs text-muted">{t('cliq.alias')}</span>
            <input
              className="input mt-1 font-mono"
              value={settings.alias ?? ''}
              onChange={(e) => setSettings((s) => ({ ...s, alias: e.target.value }))}
              placeholder="TALR"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted">{t('cliq.beneficiary')}</span>
            <input
              className="input mt-1"
              value={settings.beneficiary_name ?? ''}
              onChange={(e) => setSettings((s) => ({ ...s, beneficiary_name: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted">{t('cliq.bank')}</span>
            <input
              className="input mt-1"
              value={settings.bank_name ?? ''}
              onChange={(e) => setSettings((s) => ({ ...s, bank_name: e.target.value }))}
            />
          </label>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? t('common.loading') : t('cliq.save')}
          </button>
          {msg && <span className={`text-sm ${msg.kind === 'ok' ? 'text-success' : 'text-danger'}`}>{msg.text}</span>}
        </div>
      </form>

      <h2 className="font-bold surface-text mb-3">{t('cliq.recentTopups')}</h2>
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-muted">{t('common.loading')}</div>
        ) : topups.length === 0 ? (
          <div className="p-6 text-center text-muted">{t('cliq.noTopups')}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="table-head">
              <tr>
                <th className="text-start p-3 font-medium">{t('cliq.number')}</th>
                <th className="text-start p-3 font-medium">{t('cliq.payer')}</th>
                <th className="text-start p-3 font-medium">{t('cliq.amount')}</th>
                <th className="text-start p-3 font-medium">{t('cliq.status')}</th>
              </tr>
            </thead>
            <tbody>
              {topups.map((p) => (
                <tr key={p.id} className="row-line">
                  <td className="p-3 font-mono text-xs surface-text">{p.number}</td>
                  <td className="p-3 text-muted">{p.user?.name ?? '—'}</td>
                  <td className="p-3 text-muted">{p.amount_jod} {p.currency}</td>
                  <td className="p-3 text-muted">{p.status_label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
