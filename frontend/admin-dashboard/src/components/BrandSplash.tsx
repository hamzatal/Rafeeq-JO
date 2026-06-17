/** Animated branded splash — Admin (new circular emblem + analytics bars). */
export function BrandSplash() {
  const bars = [0, 0.15, 0.3, 0.45, 0.6];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-navy">
      <div className="splash-badge relative w-28 h-28 rounded-full bg-primary flex items-center justify-center mb-6 border-4 border-gold">
        <span className="text-white text-5xl font-extrabold leading-none">ر</span>
      </div>

      <div className="text-4xl font-extrabold text-white">رفيق</div>
      <div className="text-sm text-white/70 mt-1">لوحة الإدارة</div>

      <div className="flex items-end gap-1.5 h-12 mt-8">
        {bars.map((delay, i) => (
          <span key={i} className="splash-bar w-2.5 h-full rounded-full bg-gold" style={{ animationDelay: `${delay}s` }} />
        ))}
      </div>
    </div>
  );
}
