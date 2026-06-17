'use client';

import { useCallback, useEffect, useState } from 'react';
import type { University } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { api } from '../../../src/lib/api';

const EMPTY = { name_ar: '', name_en: '', code: '', city: '' };

export default function UniversitiesPage() {
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
      setError('الاسم بالعربي والإنجليزي والرمز مطلوبة');
      return;
    }
    setBusy(true);
    try {
      await api.admin.createUniversity(form);
      setForm({ ...EMPTY });
      load();
    } catch (e) {
      setError(e instanceof RafeeqApiError ? e.firstError() ?? e.message : 'فشل الحفظ');
    } finally {
      setBusy(false);
    }
  };

  const toggle = (u: University) => api.admin.updateUniversity(u.id, { is_active: !u.is_active }).then(load);
  const remove = (u: University) => {
    if (confirm(`حذف ${u.name_ar}؟`)) api.admin.deleteUniversity(u.id).then(load);
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold surface-text mb-4">الجامعات</h1>

      <div className="card mb-5">
        <h2 className="font-bold surface-text mb-3">إضافة جامعة</h2>
        {error && <div className="mb-3 rounded-lg border border-danger/30 bg-red-50 px-3 py-2 text-sm text-danger">{error}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input className="input" placeholder="الاسم بالعربي" value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} />
          <input className="input" placeholder="Name (EN)" value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} />
          <input className="input" placeholder="الرمز (JU)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <input className="input" placeholder="المدينة" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
        <button disabled={busy} onClick={add} className="btn-primary mt-3">إضافة</button>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-muted">جارٍ التحميل...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="table-head">
              <tr>
                <th className="text-right p-3 font-medium">الاسم</th>
                <th className="text-right p-3 font-medium">الرمز</th>
                <th className="text-right p-3 font-medium">المدينة</th>
                <th className="text-right p-3 font-medium">الحالة</th>
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
                      {u.is_active ? 'نشطة' : 'متوقفة'}
                    </button>
                  </td>
                  <td className="p-3 text-left">
                    <button onClick={() => remove(u)} className="text-danger text-sm hover:underline">حذف</button>
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
