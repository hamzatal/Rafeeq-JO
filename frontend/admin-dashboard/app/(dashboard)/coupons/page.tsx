'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Coupon, CouponScope, CouponType } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { api } from '../../../src/lib/api';
import { useT } from '../../../src/lib/i18n';
import { Skeleton } from '../../../src/components/Skeleton';

const EMPTY = {
  code: '',
  description: '',
  type: 'percentage' as CouponType,
  value: '',
  max_discount_jod: '',
  min_amount_jod: '',
  scope: 'any' as CouponScope,
  usage_limit: '',
  per_user_limit: '',
  first_order_only: false,
  expires_at: '',
};

const SCOPES: CouponScope[] = ['any', 'subscription', 'wallet_topup', 'ride'];

export default function CouponsPage() {
  const { t } = useT();
  const [items, setItems] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...EMPTY });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.admin.listCoupons({ per_page: 100 }).then((r) => setItems(r.items)).finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);

  const add = async () => {
    setError(null);
    if (!form.code || !form.value) {
      setError(t('coupons.codeValueRequired'));
      return;
    }
    setBusy(true);
    try {
      await api.admin.createCoupon({
        code: form.code.trim().toUpperCase(),
        description: form.description || null,
        type: form.type,
        // percentage: value is the percent; fixed: value is fils.
        value: form.type === 'percentage' ? parseInt(form.value, 10) : Math.round(parseFloat(form.value) * 1000),
        max_discount_fils: form.max_discount_jod ? Math.round(parseFloat(form.max_discount_jod) * 1000) : null,
        min_amount_fils: form.min_amount_jod ? Math.round(parseFloat(form.min_amount_jod) * 1000) : 0,
        scope: form.scope,
        usage_limit: form.usage_limit ? parseInt(form.usage_limit, 10) : null,
        per_user_limit: form.per_user_limit ? parseInt(form.per_user_limit, 10) : null,
        first_order_only: form.first_order_only,
        expires_at: form.expires_at || null,
      });
      setForm({ ...EMPTY });
      load();
    } catch (e) {
      setError(e instanceof RafeeqApiError ? e.firstError() ?? e.message : t('coupons.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const toggle = (c: Coupon) => api.admin.updateCoupon(c.id, { is_active: !c.is_active }).then(load);
  const remove = (c: Coupon) => {
    if (confirm(`${t('coupons.deleteConfirm')} ${c.code}`)) api.admin.deleteCoupon(c.id).then(load);
  };
  const valueLabel = (c: Coupon) =>
    c.type === 'percentage' ? `${c.value}%` : `${(c.value / 1000).toFixed(2)} د.أ`;

  return (
    <div>
      <h1 className="text-2xl font-extrabold surface-text mb-4">{t('coupons.title')}</h1>

      <div className="card mb-5">
        <h2 className="font-bold surface-text mb-3">{t('coupons.create')}</h2>
        {error && <div className="mb-3 rounded-lg border border-danger/30 bg-red-50 px-3 py-2 text-sm text-danger">{error}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <input className="input" placeholder={t('coupons.codePlaceholder')} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as CouponType })}>
            <option value="percentage">{t('coupons.percentage')}</option>
            <option value="fixed">{t('coupons.fixed')}</option>
          </select>
          <input className="input" type="number" placeholder={form.type === 'percentage' ? t('coupons.percentValue') : t('coupons.jodValue')} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
          <select className="input" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value as CouponScope })}>
            {SCOPES.map((sc) => (
              <option key={sc} value={sc}>{t(`coupons.scope.${sc}`)}</option>
            ))}
          </select>
          <input className="input" type="number" placeholder={t('coupons.maxDiscount')} value={form.max_discount_jod} onChange={(e) => setForm({ ...form, max_discount_jod: e.target.value })} />
          <input className="input" type="number" placeholder={t('coupons.minAmount')} value={form.min_amount_jod} onChange={(e) => setForm({ ...form, min_amount_jod: e.target.value })} />
          <input className="input" type="number" placeholder={t('coupons.usageLimit')} value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} />
          <input className="input" type="number" placeholder={t('coupons.perUserLimit')} value={form.per_user_limit} onChange={(e) => setForm({ ...form, per_user_limit: e.target.value })} />
          <input className="input" type="date" placeholder={t('coupons.expiry')} value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
          <input className="input sm:col-span-2" placeholder={t('coupons.descPlaceholder')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <label className="flex items-center gap-2 text-sm surface-text">
            <input type="checkbox" checked={form.first_order_only} onChange={(e) => setForm({ ...form, first_order_only: e.target.checked })} />
            {t('coupons.firstOnly')}
          </label>
        </div>
        <button disabled={busy} onClick={add} className="btn-primary mt-3">{t('coupons.create')}</button>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">{Array.from({ length: 6 }).map((_, i) => (<Skeleton key={i} className="h-9 w-full" />))}</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-muted">{t('coupons.none')}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="table-head">
              <tr>
                <th className="text-right p-3 font-medium">{t('coupons.colCode')}</th>
                <th className="text-right p-3 font-medium">{t('coupons.colValue')}</th>
                <th className="text-right p-3 font-medium">{t('coupons.colScope')}</th>
                <th className="text-right p-3 font-medium">{t('coupons.colUsage')}</th>
                <th className="text-right p-3 font-medium">{t('coupons.colExpiry')}</th>
                <th className="text-right p-3 font-medium">{t('coupons.colStatus')}</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="row-line">
                  <td className="p-3 font-mono font-bold surface-text">{c.code}</td>
                  <td className="p-3 text-muted">{valueLabel(c)}</td>
                  <td className="p-3 text-muted">{c.scope_label}</td>
                  <td className="p-3 text-muted">{c.used_count}{c.usage_limit ? ` / ${c.usage_limit}` : ''}</td>
                  <td className="p-3 text-muted font-mono">{c.expires_at ? new Date(c.expires_at).toLocaleDateString('ar') : '—'}</td>
                  <td className="p-3">
                    <button onClick={() => toggle(c)} className={`badge ${c.is_active ? 'bg-green-100 text-success' : 'bg-slate-100 text-muted'}`}>
                      {c.is_active ? t('coupons.active') : t('coupons.inactive')}
                    </button>
                  </td>
                  <td className="p-3 text-left">
                    <button onClick={() => remove(c)} className="text-danger text-sm hover:underline">{t('coupons.delete')}</button>
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
