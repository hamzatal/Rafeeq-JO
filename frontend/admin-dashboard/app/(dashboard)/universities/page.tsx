'use client';

import { useCallback, useEffect, useState } from 'react';
import type { University } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { api } from '../../../src/lib/api';
import { useT } from '../../../src/lib/i18n';
import { Skeleton } from '../../../src/components/Skeleton';

const EMPTY = { name_ar: '', name_en: '', code: '', city: '' };

export default function UniversitiesPage() {
  const { t } = useT();
  const [items, setItems] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...EMPTY });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.admin.listUniversities({ per_page: 100 }).then((r) => setItems(r.items)).finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);

  const add = async () => {
    setError(null);
    if (!form.name_ar || !form.name_en || !form.code) {
      setError(t('universities.required'));
      return;
    }
    setBusy(true);
    try {
      await api.admin.createUniversity(form);
      setForm({ ...EMPTY });
      load();
    } catch (e) {
      setError(e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('universities.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const toggle = (u: University) => api.admin.updateUniversity(u.id, { is_active: !u.is_active }).then(load);
  const remove = (u: University) => {
    if (confirm(`${t('universities.deleteConfirm')} ${u.name_ar}?`)) api.admin.deleteUniversity(u.id).then(load);
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold surface-text mb-4">{t('nav.universities')}</h1>

      <div className="card mb-5">
        <h2 className="font-bold surface-text mb-3">{t('universities.add')}</h2>
        {error && <div className="mb-3 rounded-lg border border-danger/30 bg-red-50 px-3 py-2 text-sm text-danger">{error}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input className="input" placeholder={t('universities.nameArPh')} value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} />
          <input className="input" placeholder={t('universities.nameEnPh')} value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} />
          <input className="input" placeholder={t('universities.codePh')} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <input className="input" placeholder={t('universities.cityPh')} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
        <button disabled={busy} onClick={add} className="btn-primary mt-3">{t('universities.addBtn')}</button>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{Array.from({ length: 6 }).map((_, i) => (<Skeleton key={i} className="h-9 w-full" />))}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="table-head">
              <tr>
                <th className="text-right p-3 font-medium">{t('universities.colName')}</th>
                <th className="text-right p-3 font-medium">{t('universities.colCode')}</th>
                <th className="text-right p-3 font-medium">{t('universities.colCity')}</th>
                <th className="text-right p-3 font-medium">{t('universities.colStatus')}</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id} className="row-line">
                  <td className="p-3 font-medium surface-text">{u.name_ar}</td>
                  <td className="p-3 text-muted">{u.code}</td>
                  <td className="p-3 text-muted">{u.city ?? '—'}</td>
                  <td className="p-3">
                    <button onClick={() => toggle(u)} className={`badge ${u.is_active ? 'bg-green-100 text-success' : 'bg-slate-100 text-muted'}`}>
                      {u.is_active ? t('universities.active') : t('universities.inactive')}
                    </button>
                  </td>
                  <td className="p-3 text-left">
                    <button onClick={() => remove(u)} className="text-danger text-sm hover:underline">{t('universities.delete')}</button>
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
