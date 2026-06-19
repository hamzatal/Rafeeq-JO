'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Zone } from '@rafeeq/shared';
import { RafeeqApiError, type ZonePayload } from '@rafeeq/api-client';
import { api } from '../../../src/lib/api';
import { useT } from '../../../src/lib/i18n';

type Vertex = [number, number];

interface FormState {
  id: string | null;
  name_ar: string;
  name_en: string;
  city: string;
  center_lat: string;
  center_lng: string;
  radius_km: string;
  is_active: boolean;
  boundary: Vertex[];
}

const emptyForm = (): FormState => ({
  id: null,
  name_ar: '',
  name_en: '',
  city: '',
  center_lat: '',
  center_lng: '',
  radius_km: '3',
  is_active: true,
  boundary: [],
});

export default function ZonesPage() {
  const { t } = useT();
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.zones
      .list()
      .then(setZones)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startCreate = () => {
    setError(null);
    setForm(emptyForm());
  };

  const startEdit = (z: Zone) => {
    setError(null);
    setForm({
      id: z.id,
      name_ar: z.name_ar,
      name_en: z.name_en,
      city: z.city ?? '',
      center_lat: String(z.center_lat),
      center_lng: String(z.center_lng),
      radius_km: String(z.radius_km),
      is_active: z.is_active,
      boundary: (z.boundary ?? []).map((v) => [Number(v[0]), Number(v[1])] as Vertex),
    });
  };

  const addVertex = () => {
    if (!form) return;
    setForm({ ...form, boundary: [...form.boundary, [0, 0]] });
  };

  const updateVertex = (idx: number, pos: 0 | 1, value: string) => {
    if (!form) return;
    const next = form.boundary.map((v, i) => (i === idx ? ([pos === 0 ? Number(value) : v[0], pos === 1 ? Number(value) : v[1]] as Vertex) : v));
    setForm({ ...form, boundary: next });
  };

  const removeVertex = (idx: number) => {
    if (!form) return;
    setForm({ ...form, boundary: form.boundary.filter((_, i) => i !== idx) });
  };

  const save = async () => {
    if (!form) return;
    setError(null);

    if (!form.name_ar.trim() || !form.name_en.trim()) return setError(t('zones.nameRequired'));
    if (form.boundary.length > 0 && form.boundary.length < 3) return setError(t('zones.polygonMinVertices'));

    const payload: ZonePayload = {
      name_ar: form.name_ar.trim(),
      name_en: form.name_en.trim(),
      city: form.city.trim() || null,
      center_lat: Number(form.center_lat),
      center_lng: Number(form.center_lng),
      radius_km: Number(form.radius_km),
      is_active: form.is_active,
      boundary: form.boundary.length >= 3 ? form.boundary : null,
    };

    setBusy(true);
    try {
      if (form.id) await api.zones.update(form.id, payload);
      else await api.zones.create(payload);
      setForm(null);
      load();
    } catch (err) {
      setError(err instanceof RafeeqApiError ? err.firstError() ?? err.message : t('zones.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (z: Zone) => {
    if (!window.confirm(`${t('zones.deleteConfirm')} "${z.name_ar}"?`)) return;
    await api.zones.remove(z.id);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="page-title">{t('zones.title')}</h1>
        <button onClick={startCreate} className="btn-primary">{t('zones.new')}</button>
      </div>

      <div className="card p-0 overflow-hidden mb-6">
        {loading ? (
          <div className="p-6 text-center text-muted">{t('common.loading')}</div>
        ) : zones.length === 0 ? (
          <div className="p-6 text-center text-muted">{t('zones.none')}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="table-head">
              <tr>
                <th className="text-right p-3 font-medium">{t('zones.colZone')}</th>
                <th className="text-right p-3 font-medium">{t('zones.colCity')}</th>
                <th className="text-right p-3 font-medium">{t('zones.colCenter')}</th>
                <th className="text-right p-3 font-medium">{t('zones.colRadius')}</th>
                <th className="text-right p-3 font-medium">{t('zones.colGeofence')}</th>
                <th className="text-right p-3 font-medium">{t('zones.colStatus')}</th>
                <th className="text-right p-3 font-medium">{t('zones.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {zones.map((z) => (
                <tr key={z.id} className="row-line">
                  <td className="p-3 surface-text font-medium">{z.name_ar}<div className="text-xs text-muted">{z.name_en}</div></td>
                  <td className="p-3 text-muted">{z.city ?? '—'}</td>
                  <td className="p-3 text-muted text-xs">{z.center_lat.toFixed(4)}, {z.center_lng.toFixed(4)}</td>
                  <td className="p-3 text-muted">{z.radius_km} {t('zones.km')}</td>
                  <td className="p-3">
                    {z.has_boundary ? (
                      <span className="badge bg-primary/10 text-primary">{t('zones.polygon')} ({z.boundary?.length})</span>
                    ) : (
                      <span className="badge bg-background text-muted">{t('zones.circular')}</span>
                    )}
                  </td>
                  <td className="p-3">
                    {z.is_active ? (
                      <span className="badge bg-success/10 text-success">{t('zones.active')}</span>
                    ) : (
                      <span className="badge bg-background text-muted">{t('zones.inactive')}</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(z)} className="badge border border-line text-primary">{t('zones.edit')}</button>
                      <button onClick={() => remove(z)} className="badge border border-line text-danger">{t('zones.delete')}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {form && (
        <div className="card">
          <h2 className="text-lg font-bold surface-text mb-4">{form.id ? t('zones.editTitle') : t('zones.newTitle')}</h2>

          {error && (
            <div className="mb-4 rounded-lg border border-danger/30 bg-red-50 px-3 py-2 text-sm text-danger">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs mb-1 muted-text">{t('zones.nameAr')}</label>
              <input className="input" value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs mb-1 muted-text">{t('zones.nameEn')}</label>
              <input className="input" value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs mb-1 muted-text">{t('zones.city')}</label>
              <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs mb-1 muted-text">{t('zones.radiusKm')}</label>
              <input className="input" type="number" step="0.5" value={form.radius_km} onChange={(e) => setForm({ ...form, radius_km: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs mb-1 muted-text">{t('zones.centerLat')}</label>
              <input className="input" type="number" step="0.0001" value={form.center_lat} onChange={(e) => setForm({ ...form, center_lat: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs mb-1 muted-text">{t('zones.centerLng')}</label>
              <input className="input" type="number" step="0.0001" value={form.center_lng} onChange={(e) => setForm({ ...form, center_lng: e.target.value })} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm surface-text mb-4">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            {t('zones.activeZone')}
          </label>

          <div className="border-t border-line pt-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-medium surface-text">{t('zones.geofence')}</div>
                <div className="text-xs text-muted">{t('zones.geofenceHint')}</div>
              </div>
              <button type="button" onClick={addVertex} className="btn-outline px-3 py-1 text-xs">{t('zones.addVertex')}</button>
            </div>

            {form.boundary.length === 0 ? (
              <div className="text-xs text-muted">{t('zones.noBoundary')}</div>
            ) : (
              <div className="space-y-2">
                {form.boundary.map((v, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs text-muted w-6">{idx + 1}.</span>
                    <input
                      className="input"
                      type="number"
                      step="0.0001"
                      placeholder="Lat"
                      value={v[0]}
                      onChange={(e) => updateVertex(idx, 0, e.target.value)}
                    />
                    <input
                      className="input"
                      type="number"
                      step="0.0001"
                      placeholder="Lng"
                      value={v[1]}
                      onChange={(e) => updateVertex(idx, 1, e.target.value)}
                    />
                    <button type="button" onClick={() => removeVertex(idx)} className="badge border border-line text-danger shrink-0">{t('zones.delete')}</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={save} disabled={busy} className="btn-primary">{busy ? '...' : t('common.save')}</button>
            <button onClick={() => setForm(null)} className="btn-outline">{t('common.cancel')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
