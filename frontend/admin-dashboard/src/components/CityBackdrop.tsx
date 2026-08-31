import { MAP_BACKDROP } from '@rafeeq/tokens';

/* ═══════════════════════════════════════════════════════════════════════════
   The apps' splash backdrop, on the web.

   Literally the same artwork: the paths come from `MAP_BACKDROP` in `@rafeeq/tokens`,
   which is what `packages/ui/src/components/MapBackdrop.tsx` draws behind the splash.
   The dashboard cannot import that component — `admin-dashboard` may never reach into
   `@rafeeq/ui` or `react-native` — so the two share the DATA and each brings its own
   renderer. Copying the forty path strings would have produced a backdrop that drifts
   the first time either side is touched.

   ── Why it replaced a photograph ──────────────────────────────────────────

   Sign-in used a 163 KB JPEG of Amman under a three-stop gradient. This is a few
   kilobytes of inline SVG, it scales to any viewport without a second asset, and the
   colours are tokens — so `check:design` can actually see them, which it cannot do
   inside a photo.

   `preserveAspectRatio="slice"` because the artwork is portrait (drawn for a phone
   splash) and this panel is not: cropping keeps the road curvature honest, where
   stretching would flatten it.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface CityBackdropProps {
  /** Roads and highways. */
  roadColor?: string;
  /** The one dashed journey. */
  routeColor?: string;
  /** City nodes. */
  nodeColor?: string;
  className?: string;
}

export function CityBackdrop({
  roadColor = 'rgba(255,255,255,0.14)',
  routeColor = 'rgba(255,255,255,0.55)',
  nodeColor = 'rgba(255,255,255,0.38)',
  className = '',
}: CityBackdropProps) {
  const { viewBox, roads, highways, roadWidth, highwayWidth, route, routeWidth, routeDash, nodes } =
    MAP_BACKDROP;

  return (
    <svg
      className={`absolute inset-0 w-full h-full ${className}`}
      viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <g fill="none" stroke={roadColor} strokeWidth={roadWidth} strokeLinecap="round">
        {roads.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>

      <g fill="none" stroke={roadColor} strokeWidth={highwayWidth} strokeLinecap="round">
        {highways.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>

      {/* The journey: origin node → destination node, the same story the mark tells. */}
      <path
        d={route}
        fill="none"
        stroke={routeColor}
        strokeWidth={routeWidth}
        strokeLinecap="round"
        strokeDasharray={routeDash}
      />

      <g fill={nodeColor}>
        {nodes.map((n) => (
          <circle key={`${n.cx}-${n.cy}`} cx={n.cx} cy={n.cy} r={n.r} />
        ))}
      </g>
    </svg>
  );
}
