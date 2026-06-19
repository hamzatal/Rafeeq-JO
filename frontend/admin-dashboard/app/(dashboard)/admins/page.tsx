'use client';

import { useEffect, useState } from 'react';
import type { User } from '@rafeeq/shared';
import { api } from '../../../src/lib/api';
import { useT } from '../../../src/lib/i18n';

type StaffRole = { name: string; label_ar: string; label_en: string };

export default function AdminsPage() {
  const { t, locale } = useT();
  const [staff, setStaff] = useState<User[]>([]);
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [creating, setCreating] = useState(false);

  const roleLabel = (name?: string) => {
    const r = roles.find((x) => x.name === name);
    return r ? (locale === 'ar' ? r.label_ar : r.label_en) : name ?? '';
  };

  const reload = () => {
    setLoading(true);
    api.admin
      .listStaff({ per_page: 100 })
      .then((r) => setStaff(r.items))
      .catch((e) => {
        if ((e as { status?: number })?.status === 403) setForbidden(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api.admin.staffRoles().then(setRoles).catch(() => {});
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (forbidden) {
    return (
      <div className="card max-w-lg">
        <p className="surface-text">{t('admins.noAccess')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-extrabold surface-text">{t('admins.title')}</h1>
        <button onClick={() => setCreating(true)} className="btn-primary">
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          {t('admins.add')}
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-muted">{t('common.loading')}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="table-head">
              <tr>
                <th className="text-start p-3 font-medium">{t('profile.fullName')}</th>
                <th className="text-start p-3 font-medium">{t('profile.phone')}</th>
                <th className="text-start p-3 font-medium">{t('admins.role')}</th>
                <th className="text-start p-3 font-medium">{t('admins.status')}</th>
                <th className="text-start p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {staff.map((u) => (
                <tr key={u.id} className="row-line">
                  <td className="p-3 font-medium surface-text">{u.full_name}</td>
                  <td className="p-3 text-muted">{u.phone}</td>
                  <td className="p-3 text-muted">{roleLabel(u.roles?.[0])}</td>
                  <td className="p-3 text-muted">{u.status_label}</td>
                  <td className="p-3 text-end">
                    <button onClick={() => setEditing(u)} className="text-cyan-deep hover:underline text-xs font-semibold">
                      {t('admins.edit')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {creating && (
        <StaffModal
          roles={roles}
          onClose={() => setCreating(false)}
          onDone={() => {
            setCreating(false);
            reload();
          }}
        />
      )}
      {editing && (
        <StaffModal
          roles={roles}
          user={editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function StaffModal({
  roles,
  user,
  onClose,
  onDone,
}: {
  roles: StaffRole[];
  user?: User;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t, locale } = useT();
  const isEdit = !!user;
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<string>(user?.roles?.[0] ?? 'support');
  const [status, setStatus] = useState<string>(user?.status ?? 'active');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      if (isEdit && user) {
        await api.admin.updateStaff(user.id, {
          full_name: fullName,
          email: email || null,
          role,
          status,
          password: password || undefined,
        });
      } else {
        await api.admin.createStaff({ full_name: fullName, phone, email: email || null, password, role });
      }
      onDone();
    } catch (e2) {
      setErr((e2 as Error)?.message || t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const STATUSES = [
    { value: 'active', ar: 'نشط', en: 'Active' },
    { value: 'suspended', ar: 'موقوف', en: 'Suspended' },
    { value: 'banned', ar: 'محظور', en: 'Banned' },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <form onMouseDown={(e) => e.stopPropagation()} onSubmit={submit} className="card w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold surface-text">{isEdit ? t('admins.edit') : t('admins.add')}</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-danger">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="grid gap-4">
          <label className="block">
            <span className="text-xs text-muted">{t('profile.fullName')}</span>
            <input className="input mt-1" value={fullName} onChange={(e) => setFullName(e.target.value)} minLength={3} required />
          </label>
          <label className="block">
            <span className="text-xs text-muted">{t('profile.phone')}</span>
            <input
              className="input mt-1"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07xxxxxxxx"
              disabled={isEdit}
              required={!isEdit}
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted">{t('profile.email')}</span>
            <input type="email" className="input mt-1" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-xs text-muted">{t('admins.role')}</span>
            <select className="input mt-1" value={role} onChange={(e) => setRole(e.target.value)}>
              {roles.map((r) => (
                <option key={r.name} value={r.name}>
                  {locale === 'ar' ? r.label_ar : r.label_en}
                </option>
              ))}
            </select>
          </label>
          {isEdit && (
            <label className="block">
              <span className="text-xs text-muted">{t('admins.status')}</span>
              <select className="input mt-1" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {locale === 'ar' ? s.ar : s.en}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block">
            <span className="text-xs text-muted">{isEdit ? t('admins.newPassword') : t('admins.password')}</span>
            <input
              type="password"
              className="input mt-1"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required={!isEdit}
              autoComplete="new-password"
            />
          </label>
        </div>
        <div className="flex items-center gap-3 mt-5">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? t('common.loading') : t('common.save')}
          </button>
          <button type="button" onClick={onClose} className="btn-outline">
            {t('common.cancel')}
          </button>
          {err && <span className="text-sm text-danger">{err}</span>}
        </div>
      </form>
    </div>
  );
}
