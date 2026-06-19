'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Route, University } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { api } from '../../../src/lib/api';
import { useT } from '../../../src/lib/i18n';

const EMPTY = { name: '', university_id: '', price_jod: '', capacity: '4', departure_time: '' };

export default function RoutesPage() {
  const { t } = useT();
  const [items, setItems] = useState<Route[]>([]);
  const [unis, setUnis] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...EMPTY });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.admin.listRoutes(), api.admin.listUniversities({ per_page: 100 })])
      .then(([r, u]) => {
        setItems(r);
        setUnis(u.items);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);

  const add = async () => {
    setError(null);
    if (!form.name || !form.university_id || !form.price_jod) {
      setError(t('routes.required'));
      return;
    }
    setBusy(true);
    try {
      await api.admin.createRoute({
        name: form.name,
        university_id: form.university_id,
        price_fils: Math.round(parseFloat(form.price_jod) * 1000),
        capacity: parseInt(form.capacity, 10) || 4,
        departure_time: form.departure_time || null,
      });
      setForm({ ...EMPTY });
      load();
    } catch (e) {
      setError(e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('routes.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const toggle = (r: Route) => api.admin.updateRoute(r.id, { is_active: !r.is_active }).then(load);
  const remove = (r: Route) => {
    if (confirm(`${t('routes.deleteConfirm')} ${r.name}?`)) api.admin.deleteRoute(r.id).then(load);
  };
  const uniName = (id: string) => unis.find((u) => u.id === id)?.name_ar ?? '—';

  return (
    <div>
      <h1 className="text-2xl font-extrabold surface-text mb-4">{t('nav.routes')}</h1>

      <div className="card mb-5">
        <h2 className="font-bold surface-text mb-3">{t('routes.add')}</h2>
        {error && <div className="mb-3 rounded-lg border border-danger/30 bg-red-50 px-3 py-2 text-sm text-danger">{error}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <input className="input" placeholder={t('routes.namePh')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className="input" value={form.university_id} onChange={(e) => setForm({ ...form, university_id: e.target.value })}>
            <option value="">{t('routes.selectUniversity')}</option>
            {unis.map((u) => (
              <option key={u.id} value={u.id}>{u.name_ar}</option>
            ))}
          </select>
          <input className="input" type="number" placeholder={t('routes.pricePh')} value={form.price_jod} onChange={(e) => setForm({ ...form, price_jod: e.target.value })} />
          <input className="input" type="number" placeholder={t('routes.capacityPh')} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
          <input className="input" placeholder={t('routes.departurePh')} value={form.departure_time} onChange={(e) => setForm({ ...form, departure_time: e.target.value })} />
        </div>
        <button disabled={busy} onClick={add} className="btn-primary mt-3">{t('routes.addBtn')}</button>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-muted">{t('common.loading')}</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-muted">{t('routes.none')}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="table-head">
              <tr>
                <th className="text-right p-3 font-medium">{t('routes.colRoute')}</th>
                <th className="text-right p-3 font-medium">{t('routes.colUniversity')}</th>
                <th className="text-right p-3 font-medium">{t('routes.colPrice')}</th>
                <th className="text-right p-3 font-medium">{t('routes.colCapacity')}</th>
                <th className="text-right p-3 font-medium">{t('routes.colDeparture')}</th>
                <th className="text-right p-3 font-medium">{t('routes.colStatus')}</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="row-line">
                  <td className="p-3 font-medium surface-text">{r.name}</td>
                  <td className="p-3 text-muted">{uniName(r.university_id)}</td>
                  <td className="p-3 text-muted">{(r.price_fils / 1000).toFixed(2)} د.أ</td>
                  <td className="p-3 text-muted">{r.capacity}</td>
                  <td className="p-3 text-muted font-mono">{r.departure_time ?? '—'}</td>
                  <td className="p-3">
                    <button onClick={() => toggle(r)} className={`badge ${r.is_active ? 'bg-green-100 text-success' : 'bg-slate-100 text-muted'}`}>
                      {r.is_active ? t('routes.active') : t('routes.inactive')}
                    </button>
                  </td>
                  <td className="p-3 text-left">
                    <button onClick={() => remove(r)} className="text-danger text-sm hover:underline">{t('routes.delete')}</button>
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
