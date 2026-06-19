'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { normalizeJordanPhone, validators } from '@rafeeq/shared';
import { RafeeqApiError } from '@rafeeq/api-client';
import { useAuth } from '../../src/lib/auth';
import { LogoMark } from '../../src/components/Logo';

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
    <div className="relative min-h-screen w-full overflow-hidden bg-navy">
      {/* Amman map backdrop — kept clearly visible */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/amman-map.jpg')" }}
        aria-hidden
      />
      {/* Light scrim only on the info (left) side for text contrast; form side stays clear */}
      <div className="absolute inset-0 bg-gradient-to-r from-navy/80 via-navy/45 to-navy/15" aria-hidden />

      {/* Content */}
      <div className="relative z-10 min-h-screen grid lg:grid-cols-2">
        {/* Left — brand & info */}
        <div className="hidden lg:flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <LogoMark size={52} />
            <div>
              <div className="text-2xl font-extrabold text-cyan-soft leading-tight">رفيق JO</div>
              <div className="text-xs text-white/60">مركز قيادة المنصّة</div>
            </div>
          </div>

          <div className="space-y-6 max-w-md">
            <h1 className="text-3xl font-extrabold leading-snug">
              منصّة النقل الذكي للطلاب في الأردن
            </h1>
            <ul className="space-y-4">
              {[
                { icon: 'verified_user', title: 'أمان أولاً', desc: 'كشف احتيال بالذكاء الاصطناعي + مركز سلامة ونزاعات.' },
                { icon: 'account_balance_wallet', title: 'محفظة ودفع CliQ', desc: 'شحن موثّق بالـ AI مع ضمان حقّ المستخدم.' },
                { icon: 'insights', title: 'رؤى ذكية', desc: 'تحليلات لحظية ومراقبة العمليات والرحلات.' },
                { icon: 'support_agent', title: 'دعم مُدار بالـ AI', desc: 'فرز التذاكر والشكاوى وتوجيهها تلقائياً.' },
              ].map((f) => (
                <li key={f.icon} className="flex items-start gap-3">
                  <div className="mt-0.5 w-9 h-9 shrink-0 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center">
                    <span className="material-symbols-outlined text-cyan-soft text-[20px]">{f.icon}</span>
                  </div>
                  <div>
                    <div className="font-bold text-white">{f.title}</div>
                    <div className="text-sm text-white/65">{f.desc}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="text-xs text-white/40">© {new Date().getFullYear()} رفيق JO — جميع الحقوق محفوظة.</div>
        </div>

        {/* Right — form */}
        <div className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md rounded-2xl bg-white/95 backdrop-blur shadow-lift p-7 sm:p-9">
            <div className="text-center mb-6">
              <div className="lg:hidden text-3xl font-extrabold text-primary mb-1">رفيق</div>
              <div className="text-xl font-extrabold text-ink">تسجيل دخول الموظفين</div>
              <div className="text-sm muted-text mt-1">لوحة الإدارة — مركز القيادة</div>
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
      </div>
    </div>
  );
}
