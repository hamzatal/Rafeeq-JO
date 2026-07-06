/* eslint-disable @next/next/no-img-element */

/** Rafeeq brand mark — the official uploaded logo image, unified across the app. */
export function LogoMark({ size = 44, className = '' }: { size?: number; className?: string }) {
  return (
    <img
      src="/r-logo.png"
      alt="Rafeeq"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export function LogoFull({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <LogoMark size={compact ? 40 : 48} />
      <div className="leading-tight">
        <div className={`font-extrabold tracking-tight text-cyan-soft ${compact ? 'text-lg' : 'text-2xl'}`}>
          رفيق
        </div>
        <div className="text-[11px] text-white/55">النقل الجامعي الذكي</div>
      </div>
    </div>
  );
}
