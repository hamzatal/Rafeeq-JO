'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Zone, University } from '@rafeeq/shared';
import { RafeeqApiError, type ZoneUniversityPrice, type ZonePricePayload } from '@rafeeq/api-client';
import { api } from '../../../src/lib/api';
import { useT } from '../../../src/lib/i18n';
import { Skeleton } from '../../../src/components/Skeleton';

interface FormState {
  id: string | null;
  zone_id: string;
  university_id: string;
  fare_jod: string;
  is_active: boolean;
}

const emptyForm = (): FormState => ({ id: null, zone_id: '', university_id: '', fare_jod: '', is_active: true });

export default function ZonePricesPage() {
  const { t } = useT();
  const [prices, setPrices] = useState<ZoneUniversityPrice[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.admin.listZonePrices(),
      api.zones.list().catch(() => [] as Zone[]),
      api.admin.listUniversities({ per_page: 100 }).then((r) => r.items).catch(() => [] as University[]),
    ])
      .then(([p, z, u]) => {
        setPrices(p);
        setZones(z);
        setUniversities(u);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startCreate = () => {
    setError(null);
    setForm(emptyForm());
  };

  const startEdit = (p: ZoneUniversityPrice) => {
    setError(null);
    setForm({
      id: p.id,
      zone_id: p.zone_id,
      university_id: p.university_id,
      fare_jod: String(p.fare_jod),
      is_active: p.is_active,
    });
  };

  const save = async () => {
    if (!form) return;
    setError(null);
    const fare = Number(form.fare_jod);
    if (!form.zone_id || !form.university_id || !form.fare_jod || Number.isNaN(fare) || fare < 0) {
      return setError(t('zonePrices.required'));
    }

    const payload: ZonePricePayload = {
      zone_id: form.zone_id,
      university_id: form.university_id,
      fare_fils: Math.round(fare * 1000),
      is_active: form.is_active,
    };

    setBusy(true);
    try {
      if (form.id) await api.admin.updateZonePrice(form.id, payload);
      else await api.admin.createZonePrice(payload);
      setForm(null);
      load();
    } catch (err) {
      setError(err instanceof RafeeqApiError ? (err.firstError() ?? err.message) : t('zonePrices.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p: ZoneUniversityPrice) => {
    const zoneName = p.zone?.name_ar ?? '';
    const uniName = p.university?.name_ar ?? '';
    if (!window.confirm(`${t('zonePrices.deleteConfirm')} ${zoneName} ↔ ${uniName}?`)) return;
    await api.admin.deleteZonePrice(p.id);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="page-title">{t('zonePrices.title')}</h1>
        <button onClick={startCreate} className="btn-primary">{t('zonePrices.new')}</button>
      </div>
      <p className="text-sm text-muted mb-4">{t('zonePrices.intro')}</p>

      <div className="card p-0 overflow-hidden mb-6">
        {loading ? (
          <div className="p-4 space-y-3">{Array.from({ length: 6 }).map((_, i) => (<Skeleton key={i} className="h-9 w-full" />))}</div>
        ) : prices.length === 0 ? (
          <div className="p-6 text-center text-muted">{t('zonePrices.none')}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="table-head">
              <tr>
                <th className="text-right p-3 font-medium">{t('zonePrices.colZone')}</th>
                <th className="text-right p-3 font-medium">{t('zonePrices.colUniversity')}</th>
                <th className="text-right p-3 font-medium">{t('zonePrices.colFare')}</th>
                <th className="text-right p-3 font-medium">{t('zonePrices.colStatus')}</th>
                <th className="text-right p-3 font-medium">{t('zonePrices.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {prices.map((p) => (
                <tr key={p.id} className="row-line">
                  <td className="p-3 surface-text font-medium">
                    {p.zone?.name_ar ?? '—'}
                    <div className="text-xs text-muted">{p.zone?.city ?? ''}</div>
                  </td>
                  <td className="p-3 text-muted">{p.university?.name_ar ?? '—'}</td>
                  <td className="p-3 surface-text font-bold">{p.fare_jod.toFixed(2)} <span className="text-xs font-normal text-muted">د.أ</span></td>
                  <td className="p-3">
                    {p.is_active ? (
                      <span className="badge bg-success/10 text-success">{t('zonePrices.active')}</span>
                    ) : (
                      <span className="badge bg-background text-muted">{t('zonePrices.inactive')}</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(p)} className="badge border border-line text-primary">{t('zones.edit')}</button>
                      <button onClick={() => remove(p)} className="badge border border-line text-danger">{t('zones.delete')}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {form && (
        <div className="card max-w-xl">
          <h2 className="text-lg font-bold surface-text mb-4">{form.id ? t('zonePrices.editTitle') : t('zonePrices.newTitle')}</h2>

          {error && (
            <div className="mb-4 rounded-lg border border-danger/30 bg-red-50 px-3 py-2 text-sm text-danger">{error}</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs mb-1 muted-text">{t('zonePrices.zone')}</label>
              <select
                className="input"
                value={form.zone_id}
                disabled={!!form.id}
                onChange={(e) => setForm({ ...form, zone_id: e.target.value })}
              >
                <option value="">{t('zonePrices.selectZone')}</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>{z.name_ar}{z.city ? ` — ${z.city}` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1 muted-text">{t('zonePrices.university')}</label>
              <select
                className="input"
                value={form.university_id}
                disabled={!!form.id}
                onChange={(e) => setForm({ ...form, university_id: e.target.value })}
              >
                <option value="">{t('zonePrices.selectUniversity')}</option>
                {universities.map((u) => (
                  <option key={u.id} value={u.id}>{u.name_ar}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1 muted-text">{t('zonePrices.fareJod')}</label>
              <input
                className="input"
                type="number"
                step="0.25"
                min="0"
                value={form.fare_jod}
                onChange={(e) => setForm({ ...form, fare_jod: e.target.value })}
                placeholder="2.00"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm surface-text mb-4">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            {t('zonePrices.activeRow')}
          </label>

          <div className="flex gap-2">
            <button onClick={save} disabled={busy} className="btn-primary">{busy ? '...' : t('common.save')}</button>
            <button onClick={() => setForm(null)} className="btn-outline">{t('common.cancel')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
