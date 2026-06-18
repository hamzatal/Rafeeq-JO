'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { normalizeJordanPhone, validators } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { useAuth } from '../../src/lib/auth';

export default function LoginPage() {
  const { login, verifyMfa } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'credentials' | 'mfa'>('credentials');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const phoneErr = validators.phone(phone);
    if (phoneErr) return setError(phoneErr);
    if (!password) return setError('كلمة المرور مطلوبة');

    setLoading(true);
    try {
      const result = await login(normalizeJordanPhone(phone)!, password);
      if (result === 'mfa') {
        setStep('mfa');
      } else {
        router.replace('/');
      }
    } catch (err) {
      setError(err instanceof RafeeqApiError ? err.firstError() ?? err.message : 'تعذّر تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!code.trim()) return setError('رمز التحقق مطلوب');

    setLoading(true);
    try {
      await verifyMfa(code.trim());
      router.replace('/');
    } catch (err) {
      setError(err instanceof RafeeqApiError ? err.firstError() ?? err.message : 'رمز التحقق غير صحيح');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy px-4">
      <div className="w-full max-w-sm card bg-white">
        <div className="text-center mb-6">
          <div className="text-3xl font-extrabold text-primary">رفيق</div>
          <div className="text-sm muted-text mt-1">لوحة الإدارة — دخول الموظفين</div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-red-50 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        {step === 'credentials' ? (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1 font-medium">رقم الهاتف</label>
              <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XXXXXXXX" />
            </div>
            <div>
              <label className="block text-sm mb-1 font-medium">كلمة المرور</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? '...' : 'تسجيل الدخول'}
            </button>
          </form>
        ) : (
          <form onSubmit={onVerify} className="space-y-4">
            <div className="rounded-lg bg-background px-3 py-2 text-sm muted-text">
              أدخل رمز المصادقة الثنائية من تطبيق المصادقة، أو رمز استرداد.
            </div>
            <div>
              <label className="block text-sm mb-1 font-medium">رمز التحقق</label>
              <input
                className="input tracking-widest text-center"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                autoFocus
                inputMode="numeric"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? '...' : 'تأكيد'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('credentials');
                setCode('');
                setError(null);
              }}
              className="btn-outline w-full"
            >
              رجوع
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
