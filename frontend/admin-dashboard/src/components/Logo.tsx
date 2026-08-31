import { BRAND_MARK, brandMarkColors } from '@rafeeq/tokens';

/* ═══════════════════════════════════════════════════════════════════════════
   The brand mark, drawn — not loaded.

   This used to be `<img src="/r-logo.png">`, with a docstring calling it "the official
   uploaded logo image, unified across the app". Both halves of that were false: the
   file was the RETIRED cyan-and-orange Latin "R", and it was duplicated byte-for-byte
   into `packages/ui/assets/` for the two Expo apps.

   The approved identity is a vector on a 96×96 grid («الطريق هو الحرف»), so it is now
   drawn from `BRAND_MARK` in `@rafeeq/tokens` — the one package this app and the apps
   both already depend on. Tokens exports geometry rather than a component because
   `admin-dashboard` must never import `@rafeeq/ui` or `react-native`.

   Drawn instead of loaded also means it is crisp at every size, it inherits no network
   request, and there is no raster left in the tree to go stale.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface LogoMarkProps {
  size?: number;
  className?: string;
  /** For a dark surface: the ring and route go white, the destination stays amber. */
  onDark?: boolean;
}

export function LogoMark({ size = 44, className = '', onDark = false }: LogoMarkProps) {
  const { viewBox, strokeWidth, origin, route, destination } = BRAND_MARK;
  const stroke = onDark ? brandMarkColors.onDark : brandMarkColors.path;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${viewBox} ${viewBox}`}
      fill="none"
      className={className}
      role="img"
      aria-label="رفيق"
    >
      {/* الحلقة المفتوحة — نقطة الانطلاق */}
      <circle cx={origin.cx} cy={origin.cy} r={origin.r} stroke={stroke} strokeWidth={strokeWidth} />
      {/* المنحنى — المسار، وهو جسم الـ«ر» */}
      <path d={route} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* النقطة المصمتة — الوجهة */}
      <circle cx={destination.cx} cy={destination.cy} r={destination.r} fill={brandMarkColors.dot} />
    </svg>
  );
}

/**
 * Mark + wordmark, the lockup the sheet recommends (option أ): the two stay SEPARATE,
 * with clear space between them, so «رفيق» reads as a word and the mark as a mark.
 */
export function LogoFull({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <LogoMark size={compact ? 40 : 48} />
      <div className="leading-tight">
        <div className={`font-bold tracking-tight text-primary ${compact ? 'text-lg' : 'text-2xl'}`}>
          رفيق
        </div>
        <div className="text-[11px] text-muted">النقل الجامعي الذكي</div>
      </div>
    </div>
  );
}
