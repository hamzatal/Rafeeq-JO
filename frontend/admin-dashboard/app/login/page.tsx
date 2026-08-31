'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RafeeqApiError } from '@rafeeq/api-client';
import { useAuth } from '../../src/lib/auth';
import { LogoMark } from '../../src/components/Logo';
import { Icon } from '../../src/components/Icon';
import { CityBackdrop } from '../../src/components/CityBackdrop';

/* ═══════════════════════════════════════════════════════════════════════════
   SIGN IN — rebuilt on the identity.

   ── What this replaced ─────────────────────────────────────────────────────

   A 163 KB PHOTOGRAPH of Amman (`public/amman-map.jpg`) stretched full-bleed, under a
   three-stop gradient `from-primary/80 via-primary/45 to-primary/15`, with the form on a
   `bg-white/95 backdrop-blur` card floating over it.

   Every part of that contradicts the approved identity, which states «بلا تدرّجات ولا
   تفاصيل تموت بالتصغير» and carries no photography anywhere. It also cost real things:
   the photo is the single largest asset the dashboard ships and it blocks first paint on
   the one screen that must be fast; the text sat on a gradient, so its contrast ratio
   changed across the viewport and could not be verified at all — the `contrast` gate
   checks token pairs, and a value over a photograph is not a token pair.

   ── The backdrop is the apps' splash, not a lookalike ─────────────────────

   The brand panel is backed by `CityBackdrop`, which draws `MAP_BACKDROP` from
   `@rafeeq/tokens` — the very paths `packages/ui/.../MapBackdrop.tsx` draws behind the
   student and captain splash. So signing in to the dashboard and opening either app show
   the same artwork, from one source, rather than two drawings that resemble each other
   until someone edits one.

   Its journey line runs origin-ring → curve → destination-node, which is the same
   sentence the brand mark makes. That is why the mark can sit on top of it without the
   two competing.

   ── The rest of the panel ─────────────────────────────────────────────────

   Three lines that are claims about the product, not marketing. The form side stays a
   plain surface: the fields are the only thing on it, because this screen has one job.
   The mark is drawn from `BRAND_MARK`, so it cannot drift the way the old raster did.
   ═══════════════════════════════════════════════════════════════════════════ */

/** What the platform actually is. Each line names a real capability, not a promise. */
const PILLARS = [
  {
    icon: 'route',
    title: 'مقعد بسعر معلَن',
    body: 'كل مسار (منطقة ↔ جامعة) له تعرفة معتمدة تُحسب على السيرفر. لا عدّاد ولا مضاعف ذروة.',
  },
  {
    icon: 'shield-check',
    title: 'دفتر لا يختلّ',
    body: 'كل فلس له طرفان في الدفتر، وكل إجراء حسّاس مُسجَّل في سجلّ تدقيق لا يُحذف.',
  },
  {
    icon: 'life-buoy',
    title: 'سلامة قبل النموّ',
    body: 'استغاثة، وتوثيق كباتن، ومركز نزاعات — والوثائق مشفّرة لا يراها إلا فريق التوثيق.',
  },
];

export default function LoginPage() {
  const { login, verifyMfa } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'credentials' | 'mfa'>('credentials');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('البريد الإلكتروني غير صالح');
    if (!password) return setError('كلمة المرور مطلوبة');

    setLoading(true);
    try {
      const result = await login(email.trim().toLowerCase(), password);
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
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-background">
      {/* ── brand ──────────────────────────────────────────────────────── */}
      <aside className="relative hidden lg:flex flex-col justify-between p-12 bg-primary text-white overflow-hidden">
        {/*
          Fainter than the splash, on purpose. The splash carries a centred mark and two
          short lines, so the artwork can hold its own weight; this panel carries a
          headline and three paragraphs, and at splash opacity the dashed journey ran
          straight through «مقعد بسعر معلَن». Backdrop means behind.
        */}
        <CityBackdrop
          roadColor="rgba(255,255,255,0.10)"
          routeColor="rgba(255,255,255,0.20)"
          nodeColor="rgba(255,255,255,0.16)"
        />

        <div className="relative flex items-center gap-3">
          {/* onDark: ring and route go white, the destination dot stays amber. */}
          <LogoMark size={56} onDark />
          <div>
            <div className="text-2xl font-bold font-display leading-tight">رفيق</div>
            <div className="text-xs text-white/70">لوحة التحكّم</div>
          </div>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-3xl font-bold font-display leading-snug mb-8">
            النقل الجامعي في الأردن،
            <br />
            بمقعد بسعر معلَن.
          </h1>
          <ul className="space-y-6">
            {PILLARS.map((pillar) => (
              <li key={pillar.icon} className="flex items-start gap-4">
                <div className="mt-0.5 w-10 h-10 shrink-0 rounded-xl bg-white/10 flex items-center justify-center">
                  <Icon name={pillar.icon} size={20} />
                </div>
                <div>
                  <div className="font-bold mb-0.5">{pillar.title}</div>
                  <div className="text-sm text-white/70 leading-relaxed">{pillar.body}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative text-xs text-white/50">© {new Date().getFullYear()} رفيق — النقل الجامعي الذكي</div>
      </aside>

      {/* ── form ───────────────────────────────────────────────────────── */}
      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <LogoMark size={44} />
            <div className="text-2xl font-bold font-display text-primary">رفيق</div>
          </div>

          <h2 className="text-xl font-bold surface-text">
            {step === 'credentials' ? 'تسجيل دخول الموظفين' : 'التحقّق بخطوتين'}
          </h2>
          <p className="text-sm text-muted mt-1 mb-7">
            {step === 'credentials'
              ? 'هذه اللوحة للموظّفين المصرّح لهم. كل إجراء فيها مُسجَّل باسمك.'
              : 'أدخل الرمز من تطبيق المصادقة، أو أحد رموز الاسترداد.'}
          </p>

          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2.5 text-sm text-danger"
            >
              <Icon name="triangle-alert" size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 'credentials' ? (
            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1.5 surface-text">
                  البريد الإلكتروني
                </label>
                <input
                  id="email"
                  className="input"
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="username"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1.5 surface-text">
                  كلمة المرور
                </label>
                <input
                  id="password"
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'جارٍ التحقّق…' : 'تسجيل الدخول'}
              </button>
            </form>
          ) : (
            <form onSubmit={onVerify} className="space-y-5">
              <div>
                <label htmlFor="code" className="block text-sm font-medium mb-1.5 surface-text">
                  رمز التحقق
                </label>
                <input
                  id="code"
                  className="input tracking-[0.4em] text-center"
                  dir="ltr"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'جارٍ التحقّق…' : 'تأكيد'}
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

          <p className="mt-8 flex items-start gap-2 text-xs text-muted leading-relaxed">
            <Icon name="lock" size={14} className="mt-0.5 shrink-0" />
            <span>الجلسة تنتهي بعد ساعتين من عدم النشاط، والرمز محفوظ في كوكي لا تقرؤه أي سكربت.</span>
          </p>
        </div>
      </main>
    </div>
  );
}
