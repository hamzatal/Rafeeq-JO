/**
 * Rafeeq brand mark — a modern "companion journey" emblem: a gradient roundel
 * with a route arc from a gold origin dot to a cyan destination pin.
 */
export function LogoMark({ size = 44, className = '' }: { size?: number; className?: string }) {
  const id = 'rfq-grad';
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0B192C" />
          <stop offset="0.55" stopColor="#123A52" />
          <stop offset="1" stopColor="#1FB6C1" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill={`url(#${id})`} />
      <rect x="0.6" y="0.6" width="46.8" height="46.8" rx="13.4" stroke="#ffffff" strokeOpacity="0.12" strokeWidth="1.2" />
      {/* route arc */}
      <path
        d="M13 34 C 13 23, 35 27, 35 15"
        stroke="#ffffff"
        strokeOpacity="0.85"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeDasharray="0.1 6.4"
      />
      {/* origin (gold) */}
      <circle cx="13" cy="34" r="3.6" fill="#FFBF00" />
      {/* destination pin (cyan) */}
      <circle cx="35" cy="15" r="5" fill="#ffffff" />
      <circle cx="35" cy="15" r="2.3" fill="#1FB6C1" />
    </svg>
  );
}

export function LogoFull({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <LogoMark size={compact ? 40 : 48} />
      <div className="leading-tight">
        <div className={`font-extrabold tracking-tight text-cyan-soft ${compact ? 'text-lg' : 'text-2xl'}`}>
          رفيق<span className="text-white/90"> JO</span>
        </div>
        <div className="text-[11px] text-white/55">Smart Student Mobility</div>
      </div>
    </div>
  );
}
