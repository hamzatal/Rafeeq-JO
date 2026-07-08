'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AdBanner, AdPlacement } from '@rafeeq/shared';
import { RafeeqApiError, type AdBannerPayload } from '@rafeeq/api-client';
import { api } from '../../../src/lib/api';
import { useT } from '../../../src/lib/i18n';
import { Skeleton } from '../../../src/components/Skeleton';

const PLACEMENTS: AdPlacement[] = ['student_home', 'student_wallet', 'driver_home'];

interface FormState {
  id: string | null;
  title: string;
  image_url: string;
  link_url: string;
  placement: AdPlacement;
  sort_order: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
}

const emptyForm = (): FormState => ({
  id: null,
  title: '',
  image_url: '',
  link_url: '',
  placement: 'student_home',
  sort_order: '0',
  starts_at: '',
  ends_at: '',
  is_active: true,
});

export default function AdsPage() {
  const { t } = useT();
  const [banners, setBanners] = useState<AdBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.ads
      .adminList()
      .then(setBanners)
      .catch(() => setBanners([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = (b: AdBanner) => {
    setError(null);
    setForm({
      id: b.id,
      title: b.title,
      image_url: b.image_url,
      link_url: b.link_url ?? '',
      placement: b.placement,
      sort_order: String(b.sort_order),
      starts_at: b.starts_at ? b.starts_at.slice(0, 10) : '',
      ends_at: b.ends_at ? b.ends_at.slice(0, 10) : '',
      is_active: b.is_active,
    });
  };

  const save = async () => {
    if (!form) return;
    setError(null);
    if (!form.title.trim() || !/^https?:\/\//.test(form.image_url) || !form.placement) {
      return setError(t('ads.required'));
    }
    const payload: AdBannerPayload = {
      title: form.title.trim(),
      image_url: form.image_url.trim(),
      link_url: form.link_url.trim() || null,
      placement: form.placement,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
    };
    setBusy(true);
    try {
      if (form.id) await api.ads.update(form.id, payload);
      else await api.ads.create(payload);
      setForm(null);
      load();
    } catch (err) {
      setError(err instanceof RafeeqApiError ? (err.firstError() ?? err.message) : t('ads.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (b: AdBanner) => {
    if (!window.confirm(`${t('ads.deleteConfirm')}: ${b.title}?`)) return;
    await api.ads.remove(b.id);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="page-title">{t('ads.title')}</h1>
        <button onClick={() => { setError(null); setForm(emptyForm()); }} className="btn-primary">{t('ads.new')}</button>
      </div>
      <p className="text-sm text-muted mb-4">{t('ads.intro')}</p>

      <div className="card p-0 overflow-hidden mb-6">
        {loading ? (
          <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => (<Skeleton key={i} className="h-9 w-full" />))}</div>
        ) : banners.length === 0 ? (
          <div className="p-6 text-center text-muted">{t('ads.none')}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="table-head">
              <tr>
                <th className="text-right p-3 font-medium">{t('ads.colTitle')}</th>
                <th className="text-right p-3 font-medium">{t('ads.colPlacement')}</th>
                <th className="text-right p-3 font-medium">{t('ads.colOrder')}</th>
                <th className="text-right p-3 font-medium">{t('ads.colStatus')}</th>
                <th className="text-right p-3 font-medium">{t('ads.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {banners.map((b) => (
                <tr key={b.id} className="row-line">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={b.image_url} alt="" className="w-16 h-10 rounded object-cover bg-background" />
                      <span className="surface-text font-medium">{b.title}</span>
                    </div>
                  </td>
                  <td className="p-3 text-muted">{t(`ads.placement.${b.placement}`)}</td>
                  <td className="p-3 text-muted">{b.sort_order}</td>
                  <td className="p-3">
                    {b.is_active ? (
                      <span className="badge bg-success/10 text-success">{t('ads.active')}</span>
                    ) : (
                      <span className="badge bg-background text-muted">{t('ads.inactive')}</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(b)} className="badge border border-line text-primary">{t('zones.edit')}</button>
                      <button onClick={() => remove(b)} className="badge border border-line text-danger">{t('zones.delete')}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {form && (
        <div className="card max-w-2xl">
          <h2 className="text-lg font-bold surface-text mb-4">{form.id ? t('ads.editTitle') : t('ads.newTitle')}</h2>

          {error && (
            <div className="mb-4 rounded-lg border border-danger/30 bg-red-50 px-3 py-2 text-sm text-danger">{error}</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <label className="block sm:col-span-2">
              <span className="text-xs muted-text">{t('ads.fieldTitle')}</span>
              <input className="input mt-1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs muted-text">{t('ads.fieldImage')}</span>
              <input className="input mt-1" placeholder="https://…" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs muted-text">{t('ads.fieldLink')}</span>
              <input className="input mt-1" placeholder="https://…" value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-xs muted-text">{t('ads.fieldPlacement')}</span>
              <select className="input mt-1" value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value as AdPlacement })}>
                {PLACEMENTS.map((p) => (<option key={p} value={p}>{t(`ads.placement.${p}`)}</option>))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs muted-text">{t('ads.fieldOrder')}</span>
              <input className="input mt-1" type="number" min="0" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-xs muted-text">{t('ads.fieldStarts')}</span>
              <input className="input mt-1" type="date" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-xs muted-text">{t('ads.fieldEnds')}</span>
              <input className="input mt-1" type="date" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
            </label>
          </div>

          {/^https?:\/\//.test(form.image_url) && (
            <div className="mb-4">
              <span className="text-xs muted-text">{t('ads.preview')}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.image_url} alt="" className="mt-1 w-full max-h-40 rounded-lg object-cover bg-background" />
            </div>
          )}

          <label className="flex items-center gap-2 text-sm surface-text mb-4">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            {t('ads.activeRow')}
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
