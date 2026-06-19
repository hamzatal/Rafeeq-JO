'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SubscriptionPlan, SubscriptionType } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { api } from '../../../src/lib/api';

const EMPTY = { name: '', type: 'monthly' as SubscriptionType, price_jod: '', rides_count: '', duration_days: '30' };
const TYPES: { value: SubscriptionType; label: string }[] = [
  { value: 'weekly', label: 'أسبوعي' },
  { value: 'monthly', label: 'شهري' },
  { value: 'term', label: 'فصلي' },
];

export default function PlansPage() {
  const [items, setItems] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...EMPTY });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.admin.listPlans().then(setItems).finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);

  const add = async () => {
    setError(null);
    if (!form.name || !form.price_jod) {
      setError('الاسم والسعر مطلوبان');
      return;
    }
    setBusy(true);
    try {
      await api.admin.createPlan({
        name: form.name,
        type: form.type,
        price_fils: Math.round(parseFloat(form.price_jod) * 1000),
        rides_count: form.rides_count ? parseInt(form.rides_count, 10) : null,
        duration_days: parseInt(form.duration_days, 10) || 30,
      });
      setForm({ ...EMPTY });
      load();
    } catch (e) {
      setError(e instanceof RafeeqApiError ? e.firstError() ?? e.message : 'فشل الحفظ');
    } finally {
      setBusy(false);
    }
  };

  const toggle = (p: SubscriptionPlan) => api.admin.updatePlan(p.id, { is_active: !p.is_active }).then(load);
  const remove = (p: SubscriptionPlan) => {
    if (confirm(`حذف الخطة ${p.name}؟`)) api.admin.deletePlan(p.id).then(load);
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold surface-text mb-4">خطط الاشتراك</h1>

      <div className="card mb-5">
        <h2 className="font-bold surface-text mb-3">إضافة خطة</h2>
        {error && <div className="mb-3 rounded-lg border border-danger/30 bg-red-50 px-3 py-2 text-sm text-danger">{error}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <input className="input" placeholder="اسم الخطة" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as SubscriptionType })}>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <input className="input" type="number" placeholder="السعر (د.أ)" value={form.price_jod} onChange={(e) => setForm({ ...form, price_jod: e.target.value })} />
          <input className="input" type="number" placeholder="عدد الرحلات (فارغ=غير محدود)" value={form.rides_count} onChange={(e) => setForm({ ...form, rides_count: e.target.value })} />
          <input className="input" type="number" placeholder="المدة (أيام)" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })} />
        </div>
        <button disabled={busy} onClick={add} className="btn-primary mt-3">إضافة</button>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-muted">جارٍ التحميل...</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-muted">لا توجد خطط</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="table-head">
              <tr>
                <th className="text-right p-3 font-medium">الخطة</th>
                <th className="text-right p-3 font-medium">النوع</th>
                <th className="text-right p-3 font-medium">السعر</th>
                <th className="text-right p-3 font-medium">الرحلات</th>
                <th className="text-right p-3 font-medium">المدة</th>
                <th className="text-right p-3 font-medium">الحالة</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="row-line">
                  <td className="p-3 font-medium surface-text">{p.name}</td>
                  <td className="p-3 text-muted">{p.type_label}</td>
                  <td className="p-3 text-muted">{(p.price_fils / 1000).toFixed(2)} د.أ</td>
                  <td className="p-3 text-muted">{p.unlimited ? 'غير محدود' : p.rides_count}</td>
                  <td className="p-3 text-muted">{p.duration_days} يوم</td>
                  <td className="p-3">
                    <button onClick={() => toggle(p)} className={`badge ${p.is_active ? 'bg-green-100 text-success' : 'bg-slate-100 text-muted'}`}>
                      {p.is_active ? 'نشطة' : 'متوقفة'}
                    </button>
                  </td>
                  <td className="p-3 text-left">
                    <button onClick={() => remove(p)} className="text-danger text-sm hover:underline">حذف</button>
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
