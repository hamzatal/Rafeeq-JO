/** Animated branded splash — Admin (navy + analytics bars motif). */
export function BrandSplash() {
  const bars = [0, 0.15, 0.3, 0.45, 0.6];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-navy">
      <div className="splash-badge w-28 h-28 rounded-3xl bg-white flex items-center justify-center mb-6">
        <div className="w-14 h-14 rounded-full bg-gold flex items-center justify-center">
          <div className="w-5 h-5 rounded-full bg-navy" />
        </div>
      </div>

      <div className="text-4xl font-extrabold text-white">رفيق</div>
      <div className="text-sm text-white/70 mt-1">لوحة الإدارة</div>

      {/* Animated analytics bars */}
      <div className="flex items-end gap-1.5 h-12 mt-8">
        {bars.map((delay, i) => (
          <span
            key={i}
            className="splash-bar w-2.5 h-full rounded-full bg-gold"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
      </div>
    </div>
  );
}
