'use client';

import { useState } from 'react';
import type { MfaSetupResult } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { api } from '../../../src/lib/api';
import { useAuth } from '../../../src/lib/auth';

export default function SecurityPage() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState<boolean>(!!user?.mfa_enabled);
  const [setup, setSetup] = useState<MfaSetupResult | null>(null);
  const [code, setCode] = useState('');
  const [recovery, setRecovery] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const begin = async () => {
    setError(null);
    setBusy(true);
    try {
      setSetup(await api.auth.mfaSetup());
    } catch (err) {
      setError(err instanceof RafeeqApiError ? err.firstError() ?? err.message : 'تعذّر بدء الإعداد');
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setError(null);
    if (!code.trim()) return setError('أدخل الرمز من تطبيق المصادقة');
    setBusy(true);
    try {
      const res = await api.auth.mfaConfirm(code.trim());
      setRecovery(res.recovery_codes);
      setEnabled(true);
      setSetup(null);
      setCode('');
    } catch (err) {
      setError(err instanceof RafeeqApiError ? err.firstError() ?? err.message : 'رمز غير صحيح');
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setError(null);
    const c = window.prompt('أدخل رمز المصادقة الحالي (أو رمز استرداد) لإيقاف المصادقة الثنائية:');
    if (!c) return;
    setBusy(true);
    try {
      await api.auth.mfaDisable(c.trim());
      setEnabled(false);
      setRecovery(null);
    } catch (err) {
      setError(err instanceof RafeeqApiError ? err.firstError() ?? err.message : 'رمز غير صحيح');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="page-title mb-4">الأمان — المصادقة الثنائية</h1>

      {error && (
        <div className="mb-4 rounded-lg border border-danger/30 bg-red-50 px-3 py-2 text-sm text-danger">{error}</div>
      )}

      <div className="card mb-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold surface-text">حالة المصادقة الثنائية (TOTP)</div>
            <div className="text-sm muted-text mt-1">
              طبقة حماية إضافية لحساب الإدارة باستخدام تطبيق مصادقة (Google Authenticator / Authy).
            </div>
          </div>
          {enabled ? (
            <span className="badge bg-success/10 text-success">مفعّلة</span>
          ) : (
            <span className="badge bg-background text-muted">غير مفعّلة</span>
          )}
        </div>

        <div className="mt-4">
          {enabled ? (
            <button onClick={disable} disabled={busy} className="btn-danger">إيقاف المصادقة الثنائية</button>
          ) : !setup ? (
            <button onClick={begin} disabled={busy} className="btn-primary">{busy ? '...' : 'تفعيل المصادقة الثنائية'}</button>
          ) : null}
        </div>
      </div>

      {setup && !enabled && (
        <div className="card mb-5">
          <h2 className="font-bold surface-text mb-2">1. أضف الحساب لتطبيق المصادقة</h2>
          <p className="text-sm muted-text mb-3">
            امسح الرابط أدناه في تطبيق المصادقة، أو أدخل المفتاح يدوياً:
          </p>

          <div className="rounded-lg bg-background p-3 mb-2">
            <div className="text-xs muted-text mb-1">مفتاح الإعداد (Manual key)</div>
            <code className="text-sm font-mono surface-text break-all select-all">{setup.secret}</code>
          </div>
          <div className="rounded-lg bg-background p-3 mb-4">
            <div className="text-xs muted-text mb-1">رابط otpauth</div>
            <code className="text-xs font-mono surface-text break-all select-all">{setup.otpauth_uri}</code>
          </div>

          <h2 className="font-bold surface-text mb-2">2. أكّد بالرمز</h2>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs mb-1 muted-text">الرمز المكوّن من 6 أرقام</label>
              <input
                className="input tracking-widest text-center"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                inputMode="numeric"
              />
            </div>
            <button onClick={confirm} disabled={busy} className="btn-primary">{busy ? '...' : 'تأكيد وتفعيل'}</button>
          </div>
        </div>
      )}

      {recovery && (
        <div className="card border-2 border-gold">
          <h2 className="font-bold surface-text mb-1">رموز الاسترداد</h2>
          <p className="text-sm text-danger mb-3">
            احفظ هذه الرموز في مكان آمن — تظهر مرة واحدة فقط. كل رمز يُستخدم مرة واحدة عند فقد تطبيق المصادقة.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {recovery.map((c) => (
              <code key={c} className="rounded-lg bg-background p-2 text-center text-sm font-mono surface-text select-all">
                {c}
              </code>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
