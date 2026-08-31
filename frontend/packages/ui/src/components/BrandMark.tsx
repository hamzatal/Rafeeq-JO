import Svg, { Circle, Path } from 'react-native-svg';
import { BRAND_MARK, brandMarkColors } from '@rafeeq/tokens';

/* ═══════════════════════════════════════════════════════════════════════════
   The brand mark for the two apps — drawn, not loaded.

   `WelcomeScreen` rendered `<Image source={require('…/r-logo.png')}>`, and that PNG was
   the RETIRED cyan-and-orange Latin "R" rather than the approved «ر». The same file was
   duplicated byte-for-byte into `admin-dashboard/public/`.

   The approved identity is vector («متجهي (SVG)» on the sheet), so it is drawn from
   `BRAND_MARK` in `@rafeeq/tokens`. `react-native-svg` is already a dependency of this
   package — `MapBackdrop` uses it — so this costs nothing new, and it removes the last
   raster the apps could render a stale identity from.

   It also fixes a subtler thing the PNG could not: at the 40–48pt the welcome screen
   uses, a 96px raster was being upscaled on a 3x device.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface BrandMarkProps {
  size?: number;
  /** On a dark surface the ring and route go white; the destination stays amber. */
  onDark?: boolean;
}

export function BrandMark({ size = 96, onDark = false }: BrandMarkProps) {
  const { viewBox, strokeWidth, origin, route, destination } = BRAND_MARK;
  const stroke = onDark ? brandMarkColors.onDark : brandMarkColors.path;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${viewBox} ${viewBox}`} fill="none">
      {/* الحلقة المفتوحة — نقطة الانطلاق */}
      <Circle cx={origin.cx} cy={origin.cy} r={origin.r} stroke={stroke} strokeWidth={strokeWidth} />
      {/* المنحنى — المسار، وهو جسم الـ«ر» */}
      <Path d={route} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
      {/* النقطة المصمتة — الوجهة */}
      <Circle cx={destination.cx} cy={destination.cy} r={destination.r} fill={brandMarkColors.dot} />
    </Svg>
  );
}
