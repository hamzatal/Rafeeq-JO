'use client';

import { useEffect, useState } from 'react';
import type { User } from '@rafeeq/shared';
import { api } from '../../../src/lib/api';
import { useT } from '../../../src/lib/i18n';

export default function ProfilePage() {
  const { t } = useT();
  const [user, setUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    api.profile
      .get()
      .then((u) => {
        setUser(u);
        setFullName(u.full_name ?? '');
        setEmail(u.email ?? '');
      })
      .catch(() => {});
  }, []);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const updated = await api.profile.update({ full_name: fullName, email: email || null });
      setUser(updated);
      setProfileMsg({ kind: 'ok', text: t('profile.saved') });
    } catch (err) {
      setProfileMsg({ kind: 'err', text: (err as Error)?.message || t('common.error') });
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);
    if (newPassword !== confirmPassword) {
      setPwdMsg({ kind: 'err', text: t('profile.passwordMismatch') });
      return;
    }
    setSavingPwd(true);
    try {
      await api.profile.changePassword({
        current_password: currentPassword || undefined,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwdMsg({ kind: 'ok', text: t('profile.passwordChanged') });
    } catch (err) {
      setPwdMsg({ kind: 'err', text: (err as Error)?.message || t('common.error') });
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold surface-text mb-1">{t('profile.title')}</h1>
      <p className="text-sm text-muted mb-6">{user?.phone}</p>

      <div className="grid gap-6 xl:grid-cols-2 items-start">
      {/* Account details */}
      <form onSubmit={saveProfile} className="card mb-6">
        <h2 className="font-bold surface-text mb-4">{t('profile.account')}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs text-muted">{t('profile.fullName')}</span>
            <input className="input mt-1" value={fullName} onChange={(e) => setFullName(e.target.value)} minLength={3} required />
          </label>
          <label className="block">
            <span className="text-xs text-muted">{t('profile.email')}</span>
            <input type="email" className="input mt-1" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-xs text-muted">{t('profile.phone')}</span>
            <input className="input mt-1 opacity-60" value={user?.phone ?? ''} disabled />
          </label>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button type="submit" className="btn-primary" disabled={savingProfile}>
            {savingProfile ? t('common.loading') : t('profile.save')}
          </button>
          {profileMsg && (
            <span className={`text-sm ${profileMsg.kind === 'ok' ? 'text-success' : 'text-danger'}`}>{profileMsg.text}</span>
          )}
        </div>
      </form>

      {/* Change password */}
      <form onSubmit={changePassword} className="card">
        <h2 className="font-bold surface-text mb-4">{t('profile.password')}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-xs text-muted">{t('profile.currentPassword')}</span>
            <input type="password" className="input mt-1" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
          </label>
          <label className="block">
            <span className="text-xs text-muted">{t('profile.newPassword')}</span>
            <input type="password" className="input mt-1" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required autoComplete="new-password" />
          </label>
          <label className="block">
            <span className="text-xs text-muted">{t('profile.confirmPassword')}</span>
            <input type="password" className="input mt-1" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={8} required autoComplete="new-password" />
          </label>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button type="submit" className="btn-primary" disabled={savingPwd}>
            {savingPwd ? t('common.loading') : t('profile.changePassword')}
          </button>
          {pwdMsg && <span className={`text-sm ${pwdMsg.kind === 'ok' ? 'text-success' : 'text-danger'}`}>{pwdMsg.text}</span>}
        </div>
      </form>
      </div>
    </div>
  );
}
