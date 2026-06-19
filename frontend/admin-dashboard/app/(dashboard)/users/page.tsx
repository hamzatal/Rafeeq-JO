'use client';

import { useEffect, useState } from 'react';
import type { User } from '@rafeeq/shared';
import { api } from '../../../src/lib/api';
import { useT } from '../../../src/lib/i18n';

const TYPES = [
  { value: '', labelAr: 'الكل', labelEn: 'All' },
  { value: 'student', labelAr: 'طلاب', labelEn: 'Students' },
  { value: 'driver', labelAr: 'كباتن', labelEn: 'Captains' },
  { value: 'support', labelAr: 'دعم', labelEn: 'Support' },
  { value: 'admin', labelAr: 'إدارة', labelEn: 'Admin' },
];

export default function UsersPage() {
  const { t, locale } = useT();
  const [users, setUsers] = useState<User[]>([]);
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [topupUser, setTopupUser] = useState<User | null>(null);

  // Pick up a ?q= search term coming from the global Topbar search.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) setSearch(q);
  }, []);

  const reload = () => {
    setLoading(true);
    api.admin
      .listUsers({ type: type || undefined, search: search || undefined, per_page: 50 })
      .then((r) => setUsers(r.items))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    const handle = setTimeout(reload, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, search]);

  const canTopup = (u: User) => u.type === 'student' || u.type === 'driver';

  return (
    <div>
      <h1 className="text-2xl font-extrabold surface-text mb-4">{t('nav.users')}</h1>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {TYPES.map((tp) => (
          <button
            key={tp.value}
            onClick={() => setType(tp.value)}
            className={`badge border ${type === tp.value ? 'bg-primary text-white border-primary' : 'bg-white text-muted border-line'}`}
          >
            {locale === 'ar' ? tp.labelAr : tp.labelEn}
          </button>
        ))}
        <input
          className="input max-w-xs ms-auto"
          placeholder={locale === 'ar' ? 'بحث بالاسم أو الهاتف...' : 'Search by name or phone...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-muted">{t('common.loading')}</div>
        ) : users.length === 0 ? (
          <div className="p-6 text-center text-muted">{locale === 'ar' ? 'لا يوجد مستخدمون' : 'No users'}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="table-head">
              <tr>
                <th className="text-start p-3 font-medium">{t('profile.fullName')}</th>
                <th className="text-start p-3 font-medium">{t('profile.phone')}</th>
                <th className="text-start p-3 font-medium">{locale === 'ar' ? 'النوع' : 'Type'}</th>
                <th className="text-start p-3 font-medium">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                <th className="text-start p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="row-line">
                  <td className="p-3 font-medium surface-text">{u.full_name}</td>
                  <td className="p-3 text-muted">{u.phone}</td>
                  <td className="p-3 text-muted">{u.type_label}</td>
                  <td className="p-3 text-muted">{u.status_label}</td>
                  <td className="p-3 text-end">
                    {canTopup(u) && (
                      <button
                        onClick={() => setTopupUser(u)}
                        className="inline-flex items-center gap-1 text-cyan-deep hover:underline text-xs font-semibold"
                      >
                        <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
                        {t('wallet.topup')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {topupUser && (
        <TopupModal user={topupUser} onClose={() => setTopupUser(null)} onDone={() => setTopupUser(null)} />
      )}
    </div>
  );
}

function TopupModal({ user, onClose, onDone }: { user: User; onClose: () => void; onDone: () => void }) {
  const { t } = useT();
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const jod = parseFloat(amount);
    if (!jod || jod <= 0) {
      setMsg({ kind: 'err', text: t('wallet.invalidAmount') });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      await api.admin.creditWallet({
        user_id: user.id,
        amount_fils: Math.round(jod * 1000),
        reference: reference || undefined,
      });
      setMsg({ kind: 'ok', text: t('wallet.credited') });
      setTimeout(onDone, 900);
    } catch (err) {
      setMsg({ kind: 'err', text: (err as Error)?.message || t('common.error') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <form
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="card w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold surface-text">
            {t('wallet.topupFor')} — {user.full_name}
          </h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-danger">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="grid gap-4">
          <label className="block">
            <span className="text-xs text-muted">{t('wallet.amountJod')}</span>
            <input
              type="number"
              step="0.001"
              min="0.001"
              className="input mt-1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted">{t('wallet.reference')}</span>
            <input className="input mt-1" value={reference} onChange={(e) => setReference(e.target.value)} />
          </label>
        </div>
        <div className="flex items-center gap-3 mt-5">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? t('common.loading') : t('wallet.confirmCredit')}
          </button>
          <button type="button" onClick={onClose} className="btn-outline">
            {t('common.cancel')}
          </button>
          {msg && <span className={`text-sm ${msg.kind === 'ok' ? 'text-success' : 'text-danger'}`}>{msg.text}</span>}
        </div>
      </form>
    </div>
  );
}
