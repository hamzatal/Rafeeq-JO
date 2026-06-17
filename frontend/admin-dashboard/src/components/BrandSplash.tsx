/** Animated branded splash — Admin. Jordan-inspired R emblem + a driving car. */
export function BrandSplash() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-navy">
      <div className="splash-badge relative w-28 h-28 rounded-3xl bg-[#0E261C] flex items-center justify-center mb-6 overflow-hidden">
        {/* Jordan red chevron + seven-pointed star */}
        <svg viewBox="0 0 512 512" className="absolute inset-0 w-full h-full" aria-hidden>
          <path d="M0 0 L 250 256 L 0 512 Z" fill="#CE1126" />
          <g transform="translate(98 250) scale(0.82)" fill="#FFFFFF">
            <path d="M 0,-72 L 14.75,-30.63 L 56.29,-44.89 L 33.15,-7.57 L 70.19,16.02 L 26.58,21.2 L 31.24,64.86 L 0,34 L -31.24,64.86 L -26.58,21.2 L -70.19,16.02 L -33.15,-7.57 L -56.29,-44.89 L -14.75,-30.63 Z" />
          </g>
        </svg>
        <span className="relative text-gold text-5xl font-black leading-none ml-6">R</span>
      </div>

      <div className="text-4xl font-extrabold text-white">رفيق</div>
      <div className="text-sm text-white/70 mt-1">لوحة الإدارة</div>

      {/* Road with a driving car */}
      <div className="relative mt-8 h-10 w-56 rounded-lg bg-white/5 overflow-hidden">
        <div className="absolute bottom-3 left-2 right-2 border-b-2 border-dashed border-gold/40" />
        <div className="splash-car absolute bottom-2 w-11 h-6">
          <div className="splash-car-bob relative w-full h-full">
            <span className="absolute bottom-1.5 w-11 h-3 rounded bg-gold" />
            <span className="absolute bottom-3.5 left-2 w-6 h-3 rounded-t-md bg-gold" />
            <span className="absolute bottom-0 left-1.5 w-3 h-3 rounded-full bg-black border-2 border-white" />
            <span className="absolute bottom-0 right-1.5 w-3 h-3 rounded-full bg-black border-2 border-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
