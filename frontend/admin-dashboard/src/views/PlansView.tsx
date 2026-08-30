'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatJod } from '@rafeeq/shared';
import type { SubscriptionPlan, SubscriptionType } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { api } from '../lib/api';
import { LoadError } from '../components/LoadError';
import { useT } from '../lib/i18n';
import { Skeleton } from '../components/Skeleton';

const EMPTY = { name: '', type: 'monthly' as SubscriptionType, price_jod: '', rides_count: '', duration_days: '30' };
const TYPES: SubscriptionType[] = ['daily', 'weekly', 'monthly', 'term'];

export function PlansView() {
  const { t } = useT();
  const [items, setItems] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    api.admin
      .listPlans()
      .then(setItems)
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);

  const add = async () => {
    setError(null);
    /*
       `rides_count` is required now, and that is the whole point of the change.

       It used to be optional, and an empty box meant «unlimited» — an unbounded
       liability sold for a fixed sum. A student riding twice a day for a month on the
       top band costs 84 000 fils to serve; the شهرية plan sold that for 25 000. The
       backend refuses a null count outright (`PlanSolvency`), so leaving the field
       optional here only moved the failure to a 422 the operator had to decode.
    */
    if (!form.name || !form.price_jod || !form.rides_count) {
      setError(t('plans.required'));
      return;
    }
    setBusy(true);
    try {
      await api.admin.createPlan({
        name: form.name,
        type: form.type,
        price_fils: Math.round(parseFloat(form.price_jod) * 1000),
        rides_count: parseInt(form.rides_count, 10),
        duration_days: parseInt(form.duration_days, 10) || 30,
      });
      setForm({ ...EMPTY });
      load();
    } catch (e) {
      setError(e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('plans.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  /* A failed toggle used to do nothing at all — no reload, no message, so the row
     simply stayed as it was and the operator clicked again. */
  const toggle = (p: SubscriptionPlan) =>
    api.admin
      .updatePlan(p.id, { is_active: !p.is_active })
      .then(load)
      .catch(() => setError(t('plans.saveFailed')));

  const remove = (p: SubscriptionPlan) => {
    if (!confirm(`${t('plans.deleteConfirm')} ${p.name}?`)) return;
    api.admin.deletePlan(p.id).then(load).catch(() => setError(t('plans.saveFailed')));
  };

  return (
    <div>
      <h1 className="text-2xl font-bold surface-text mb-4">{t('nav.plans')}</h1>

      <div className="card mb-5">
        <h2 className="font-bold surface-text mb-3">{t('plans.add')}</h2>
        {error && <div className="mb-3 rounded-lg border border-danger/30 bg-red-50 px-3 py-2 text-sm text-danger">{error}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <input className="input" placeholder={t('plans.namePh')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as SubscriptionType })}>
            {TYPES.map((pt) => (
              <option key={pt} value={pt}>{t(`plans.type.${pt}`)}</option>
            ))}
          </select>
          <input className="input" type="number" placeholder={t('plans.pricePh')} value={form.price_jod} onChange={(e) => setForm({ ...form, price_jod: e.target.value })} />
          <input className="input" type="number" min={1} required placeholder={t('plans.ridesPh')} value={form.rides_count} onChange={(e) => setForm({ ...form, rides_count: e.target.value })} />
          <input className="input" type="number" placeholder={t('plans.durationPh')} value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })} />
        </div>
        <button disabled={busy} onClick={add} className="btn-primary mt-3">{t('plans.addBtn')}</button>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{Array.from({ length: 6 }).map((_, i) => (<Skeleton key={i} className="h-9 w-full" />))}</div>
        ) : loadError ? (
          <LoadError onRetry={load} />
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-muted">{t('plans.none')}</div>
        ) : (
          <table className="w-full text-sm">
            <caption className="sr-only">{t('nav.plans')}</caption>
            <thead className="table-head">
              <tr>
                <th scope="col" className="text-right p-3 font-medium">{t('plans.colPlan')}</th>
                <th scope="col" className="text-right p-3 font-medium">{t('plans.colType')}</th>
                <th scope="col" className="text-right p-3 font-medium">{t('plans.colPrice')}</th>
                <th scope="col" className="text-right p-3 font-medium">{t('plans.colRides')}</th>
                <th scope="col" className="text-right p-3 font-medium">{t('plans.colDuration')}</th>
                <th scope="col" className="text-right p-3 font-medium">{t('plans.colStatus')}</th>
                <th scope="col" className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="row-line">
                  <td className="p-3 font-medium surface-text">{p.name}</td>
                  <td className="p-3 text-muted">{p.type_label}</td>
                  <td className="p-3 text-muted">{formatJod(p.price_fils)}</td>
                  <td className="p-3 text-muted tabular-nums">{p.rides_count}</td>
                  <td className="p-3 text-muted">{p.duration_days} {t('plans.daysUnit')}</td>
                  <td className="p-3">
                    <button onClick={() => toggle(p)} className={`badge ${p.is_active ? 'bg-green-100 text-success' : 'bg-slate-100 text-muted'}`}>
                      {p.is_active ? t('plans.active') : t('plans.inactive')}
                    </button>
                  </td>
                  <td className="p-3 text-left">
                    <button onClick={() => remove(p)} className="text-danger text-sm hover:underline">{t('plans.delete')}</button>
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
