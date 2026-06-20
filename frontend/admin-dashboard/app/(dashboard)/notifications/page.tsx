'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../src/lib/api';
import { useT } from '../../../src/lib/i18n';

type Audience = 'all' | 'students' | 'drivers';

export default function NotificationsPage() {
  const { t } = useT();
  const [counts, setCounts] = useState<{ all: number; students: number; drivers: number } | null>(null);
  const [audience, setAudience] = useState<Audience>('all');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [coupon, setCoupon] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    api.admin.notificationAudience().then(setCounts).catch(() => {});
  }, []);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    setMsg(null);
    try {
      const { sent } = await api.admin.sendNotification({
        audience,
        title: title.trim(),
        body: body.trim(),
        coupon_code: coupon.trim() || undefined,
      });
      setMsg({ kind: 'ok', text: `${t('notify.sentTo')} ${sent} ${t('notify.users')}` });
      setTitle('');
      setBody('');
      setCoupon('');
    } catch (e2) {
      setMsg({ kind: 'err', text: (e2 as Error)?.message || t('common.error') });
    } finally {
      setSending(false);
    }
  };

  const audiences: { value: Audience; labelKey: string; count?: number }[] = [
    { value: 'all', labelKey: 'notify.all', count: counts?.all },
    { value: 'students', labelKey: 'notify.students', count: counts?.students },
    { value: 'drivers', labelKey: 'notify.drivers', count: counts?.drivers },
  ];

  return (
    <div>
      <h1 className="text-2xl font-extrabold surface-text mb-1">{t('notify.title')}</h1>
      <p className="text-sm text-muted mb-6">{t('notify.intro')}</p>

      <div className="grid gap-6 lg:grid-cols-3 items-start">
        <form onSubmit={send} className="card lg:col-span-2">
        <label className="block mb-4">
          <span className="text-xs text-muted">{t('notify.audience')}</span>
          <div className="flex flex-wrap gap-2 mt-2">
            {audiences.map((a) => (
              <button
                type="button"
                key={a.value}
                onClick={() => setAudience(a.value)}
                className={`badge border px-3 py-1.5 ${audience === a.value ? 'bg-primary text-white border-primary' : 'bg-white text-muted border-line dark:bg-dcard dark:border-dline'}`}
              >
                {t(a.labelKey)}{typeof a.count === 'number' ? ` (${a.count})` : ''}
              </button>
            ))}
          </div>
        </label>

        <label className="block mb-4">
          <span className="text-xs text-muted">{t('notify.titleField')}</span>
          <input className="input mt-1" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
        </label>

        <label className="block mb-4">
          <span className="text-xs text-muted">{t('notify.bodyField')}</span>
          <textarea className="input mt-1 h-24 py-2" value={body} onChange={(e) => setBody(e.target.value)} maxLength={500} required />
        </label>

        <label className="block mb-4">
          <span className="text-xs text-muted">{t('notify.couponField')}</span>
          <input className="input mt-1 font-mono" value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="WELCOME10" />
          <span className="text-[11px] text-muted mt-1 block">{t('notify.couponHint')}</span>
        </label>

        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary" disabled={sending}>
            {sending ? t('common.loading') : t('notify.send')}
          </button>
          {msg && <span className={`text-sm ${msg.kind === 'ok' ? 'text-success' : 'text-danger'}`}>{msg.text}</span>}
        </div>
      </form>

        <aside className="card">
          <h3 className="font-bold surface-text mb-3">{t('notify.audience')}</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between"><span className="text-muted">{t('notify.all')}</span><span className="font-bold surface-text">{counts?.all ?? '—'}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted">{t('notify.students')}</span><span className="font-bold surface-text">{counts?.students ?? '—'}</span></div>
            <div className="flex items-center justify-between"><span className="text-muted">{t('notify.drivers')}</span><span className="font-bold surface-text">{counts?.drivers ?? '—'}</span></div>
          </div>
          <p className="text-[12px] text-muted mt-4 leading-relaxed">{t('notify.couponHint')}</p>
        </aside>
      </div>
    </div>
  );
}
