'use client';

import { useCallback, useEffect, useState } from 'react';
import { bareJod, formatJod } from '@rafeeq/shared';
import type { User, WalletTransaction } from '@rafeeq/shared';
import { api } from '../../../src/lib/api';
import { LoadError } from '../../../src/components/LoadError';
import { useT } from '../../../src/lib/i18n';
import { Skeleton } from '../../../src/components/Skeleton';
import { Icon } from '../../../src/components/Icon';
import { Phone } from '../../../src/components/Phone';
import { Num } from '../../../src/components/Num';
import { NavPageHeader } from '../../../src/components/NavPageHeader';

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
  const [loadError, setLoadError] = useState(false);
  const [topupUser, setTopupUser] = useState<User | null>(null);

  // Pick up a ?q= search term coming from the global Topbar search.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) setSearch(q);
  }, []);

  const reload = () => {
    setLoading(true);
    setLoadError(false);
    api.admin
      .listUsers({ type: type || undefined, search: search || undefined, per_page: 50 })
      .then((r) => setUsers(r.items))
      .catch(() => setLoadError(true))
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
      <NavPageHeader
        href="/users"
        stat={loading ? undefined : <><Num value={users.length} /> مستخدم</>}
      />

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
          <div className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : loadError ? (
          <LoadError onRetry={reload} />
        ) : users.length === 0 ? (
          <div className="p-6 text-center text-muted">{locale === 'ar' ? 'لا يوجد مستخدمون' : 'No users'}</div>
        ) : (
          <table className="w-full text-sm">
            <caption className="sr-only">{t('nav.users')}</caption>
            <thead className="table-head">
              <tr>
                <th scope="col" className="text-start p-3 font-medium">{t('profile.fullName')}</th>
                <th scope="col" className="text-start p-3 font-medium">{t('profile.phone')}</th>
                <th scope="col" className="text-start p-3 font-medium">{locale === 'ar' ? 'النوع' : 'Type'}</th>
                <th scope="col" className="text-start p-3 font-medium">{locale === 'ar' ? 'الحالة' : 'Status'}</th>
                <th scope="col" className="text-start p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="row-line">
                  <td className="p-3 font-medium surface-text">{u.full_name}</td>
                  <td className="p-3 text-muted"><Phone value={u.phone} /></td>
                  <td className="p-3 text-muted">{u.type_label}</td>
                  <td className="p-3 text-muted">{u.status_label}</td>
                  <td className="p-3 text-end">
                    {canTopup(u) && (
                      <button
                        onClick={() => setTopupUser(u)}
                        className="inline-flex items-center gap-1 text-primary-dark hover:underline text-xs font-semibold"
                      >
                        <Icon name="wallet" size={16} />
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
  const [balance, setBalance] = useState<number | null>(null);
  const [txns, setTxns] = useState<WalletTransaction[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadTxns = useCallback(() => {
    api.admin
      .listUserWalletTransactions(user.id)
      .catch(() => null)
      .then((r) => {
        /* `null` on failure rather than an unhandled rejection: the top-up drawer
           showed a blank balance and an empty history, which reads as "this user has
           no money and has never moved any" — on the screen where an operator is
           about to credit them. */
        if (!r) return;
        setBalance(r.wallet.balance_fils);
        setTxns(r.transactions);
      })
      .catch(() => undefined);
  }, [user.id]);

  useEffect(() => {
    loadTxns();
  }, [loadTxns]);

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
      setAmount('');
      setReference('');
      loadTxns();
    } catch (err) {
      setMsg({ kind: 'err', text: (err as Error)?.message || t('common.error') });
    } finally {
      setSaving(false);
    }
  };

  const reverse = async (txn: WalletTransaction) => {
    if (!window.confirm(t('wallet.reverseConfirm'))) return;
    setBusyId(txn.id);
    setMsg(null);
    try {
      await api.admin.reverseWalletTransaction({ transaction_id: txn.id });
      setMsg({ kind: 'ok', text: t('wallet.reversed') });
      loadTxns();
    } catch (err) {
      setMsg({ kind: 'err', text: (err as Error)?.message || t('common.error') });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="card w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold surface-text">
            {t('wallet.topupFor')} — {user.full_name}
          </h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-danger">
            <Icon name="x" />
          </button>
        </div>

        {balance !== null && (
          <div className="mb-4 rounded-xl bg-background p-3 flex items-center justify-between">
            <span className="text-xs muted-text">{t('wallet.balance')}</span>
            <span className="font-bold surface-text">{formatJod(balance)}</span>
          </div>
        )}

        <form onSubmit={submit} className="grid gap-4">
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
          <div className="flex items-center gap-3">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? t('common.loading') : t('wallet.confirmCredit')}
            </button>
            {msg && <span className={`text-sm ${msg.kind === 'ok' ? 'text-success' : 'text-danger'}`}>{msg.text}</span>}
          </div>
        </form>

        <div className="mt-6">
          <h3 className="text-sm font-bold surface-text mb-2">{t('wallet.recentTopups')}</h3>
          {txns.length === 0 ? (
            <p className="text-xs muted-text py-3">{t('wallet.noTransactions')}</p>
          ) : (
            <ul className="divide-y divide-line">
              {txns.map((tx) => (
                <li key={tx.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="surface-text font-medium truncate">{tx.type_label}</p>
                    <p className="text-xs muted-text truncate">
                      {tx.description || tx.reference || '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`font-bold ${tx.amount_fils >= 0 ? 'text-success' : 'text-danger'}`}>
                      {tx.amount_fils >= 0 ? '+' : ''}
                      {bareJod(tx.amount_fils)}
                    </span>
                    {tx.reversed_at ? (
                      <span className="pill-muted">{t('wallet.reversedBadge')}</span>
                    ) : tx.is_reversible ? (
                      <button
                        onClick={() => reverse(tx)}
                        disabled={busyId === tx.id}
                        className="inline-flex items-center gap-1 text-danger hover:underline text-xs font-semibold disabled:opacity-50"
                      >
                        <Icon name="undo-2" size={16} />
                        {busyId === tx.id ? t('common.loading') : t('wallet.reverse')}
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <button type="button" onClick={onDone} className="btn-outline">
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
