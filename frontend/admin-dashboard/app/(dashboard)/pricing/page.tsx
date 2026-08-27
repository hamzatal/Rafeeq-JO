'use client';

import { useEffect, useState } from 'react';
import type { PricingSettings } from '@rafeeq/api-client';
import { api } from '../../../src/lib/api';
import { useT } from '../../../src/lib/i18n';
import { Skeleton } from '../../../src/components/Skeleton';

type FieldKey = keyof PricingSettings;

/**
 * Four knobs, down from thirteen.
 *
 * The "distance" group (opening fare, per-km, per-minute, minimum fare, average
 * speed) and half the "pooling" group (night multiplier, night start hour, max surge)
 * are gone, because the things they controlled are gone. The fare is read from the
 * (zone × university) matrix, so there is no meter to calibrate; and surge and the
 * night multiplier both charged above the approved tariff.
 *
 * They were not merely hidden. A form field that posts a value the API discards is a
 * trap: an admin will set it, watch it save, and plan a month of margin around a
 * number that never reached the fare.
 */
const GROUPS: { titleKey: string; hintKey?: string; fields: { key: FieldKey; step?: string }[] }[] = [
  {
    titleKey: 'pricing.groupCommission',
    fields: [{ key: 'commission_percent' }, { key: 'default_fare_fils' }],
  },
  {
    titleKey: 'pricing.groupPooling',
    hintKey: 'pricing.groupPooling_hint',
    fields: [{ key: 'express_fee_fils' }, { key: 'min_fill_riders' }],
  },
];

const HINTS: Partial<Record<FieldKey, string>> = {
  commission_percent: 'pricing.commission_percent_hint',
  default_fare_fils: 'pricing.default_fare_fils_hint',
  express_fee_fils: 'pricing.express_fee_fils_hint',
  min_fill_riders: 'pricing.min_fill_riders_hint',
};

export default function PricingPage() {
  const { t } = useT();
  const [form, setForm] = useState<PricingSettings | null>(null);
  const [initial, setInitial] = useState<PricingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    api.admin
      .getPricingSettings()
      .then((p) => {
        setForm(p);
        setInitial(p);
      })
      .catch((e) => {
        if ((e as { status?: number })?.status === 403) setForbidden(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const setField = (key: FieldKey, value: string) =>
    setForm((f) => (f ? { ...f, [key]: value === '' ? 0 : Number(value) } : f));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setMsg(null);
    try {
      const updated = await api.admin.updatePricingSettings(form);
      setForm(updated);
      setInitial(updated);
      setMsg({ kind: 'ok', text: t('pricing.saved') });
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
    <div>
      <h1 className="text-2xl font-extrabold surface-text mb-1">{t('pricing.title')}</h1>
      <p className="text-sm text-muted mb-1">{t('pricing.intro')}</p>
      <p className="text-xs text-muted mb-4">{t('pricing.filsHint')}</p>

      {/*
        Says out loud where a seat price actually comes from. Without this, the
        obvious reading of a page titled "Pricing" holding four fields is that these
        four fields set the fares — and then nobody finds the fare matrix.
      */}
      <div className="card mb-6 border-s-4 border-s-brand-500">
        <p className="text-sm surface-text font-semibold mb-1">{t('pricing.tariffNotice')}</p>
        <p className="text-xs text-muted">{t('pricing.tariffNotice_body')}</p>
      </div>

      {loading || !form ? (
        <div className="card space-y-3">{Array.from({ length: 8 }).map((_, i) => (<Skeleton key={i} className="h-10 w-full" />))}</div>
      ) : (
        <form onSubmit={save}>
          {GROUPS.map((g) => (
            <div key={g.titleKey} className="card mb-4">
              <h2 className="font-bold surface-text mb-1">{t(g.titleKey)}</h2>
              {g.hintKey && <p className="text-xs text-muted mb-4">{t(g.hintKey)}</p>}
              <div className={`grid gap-4 sm:grid-cols-2 ${g.hintKey ? '' : 'mt-4'}`}>
                {g.fields.map(({ key, step }) => (
                  <label key={key} className="block">
                    <span className="text-xs text-muted">{t(`pricing.${key}`)}</span>
                    <input
                      className="input mt-1"
                      type="number"
                      step={step ?? '1'}
                      min="0"
                      value={String(form[key])}
                      onChange={(e) => setField(key, e.target.value)}
                    />
                    {HINTS[key] && (
                      <span className="mt-1 block text-[11px] text-muted">{t(HINTS[key]!)}</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div className="flex items-center gap-3">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? t('common.loading') : t('pricing.save')}
            </button>
            <button
              type="button"
              className="btn-outline"
              onClick={() => initial && setForm(initial)}
              disabled={saving}
            >
              {t('pricing.reset')}
            </button>
            {msg && <span className={`text-sm ${msg.kind === 'ok' ? 'text-success' : 'text-danger'}`}>{msg.text}</span>}
          </div>
        </form>
      )}
    </div>
  );
}
