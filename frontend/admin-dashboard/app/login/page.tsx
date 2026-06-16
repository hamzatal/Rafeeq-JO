'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { normalizeJordanPhone, validators } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { useAuth } from '../../src/lib/auth';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
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
      await login(normalizeJordanPhone(phone)!, password);
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof RafeeqApiError ? err.firstError() ?? err.message : 'تعذّر تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy px-4">
      <div className="w-full max-w-sm card bg-white">
        <div className="text-center mb-6">
          <div className="text-3xl font-extrabold text-primary">رفيق</div>
          <div className="text-sm text-muted mt-1">لوحة الإدارة — دخول الموظفين</div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-red-50 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

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
      </div>
    </div>
  );
}
