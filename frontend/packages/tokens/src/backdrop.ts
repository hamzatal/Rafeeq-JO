/* ═══════════════════════════════════════════════════════════════════════════
   THE MAP BACKDROP — «خريطة باهتة» (decision 15)

   The stylised road network that sits behind the apps' splash: curved roads, two
   thicker highways, one dashed journey from an origin node to a destination, and a
   scatter of city nodes. Vector, so there is no image asset to go stale — the same
   reason the brand mark is geometry in `brand.ts`.

   ── Why the paths moved here ──────────────────────────────────────────────

   They were literals inside `packages/ui/src/components/MapBackdrop.tsx`, which is a
   `react-native-svg` component — and `admin-dashboard` may never import
   `@rafeeq/ui` or `react-native` (the `layer-violation` gate). So the dashboard could
   not have the same backdrop as the apps without copying forty path strings, and a
   copied backdrop is one that diverges the first time either is touched.

   Here they are data. `MapBackdrop` draws them with `react-native-svg`, the dashboard's
   `CityBackdrop` draws them with plain `<svg>`, and the sign-in screen is therefore
   backed by the identical artwork as the splash rather than an imitation of it.

   ── Coordinates ──────────────────────────────────────────────────────────

   A 400×820 viewBox — portrait, because it was drawn for a phone splash. Consumers
   scale it with `preserveAspectRatio="xMidYMid slice"`, so a landscape surface crops
   the top and bottom rather than stretching the roads.
   ═══════════════════════════════════════════════════════════════════════════ */

export const MAP_BACKDROP = {
  viewBox: { width: 400, height: 820 },

  /** The faint network. Deliberately drawn past the edges so no road ends in view. */
  roads: [
    'M-20,120 C80,90 150,200 260,170 S420,120 460,180',
    'M-20,300 C120,260 180,360 300,330 S430,300 460,350',
    'M-20,520 C90,480 200,560 300,520 S430,470 460,520',
    'M-20,690 C120,660 220,740 340,700 S430,680 460,700',
    'M60,-20 C40,140 120,220 90,360 S140,560 110,840',
    'M220,-20 C250,160 180,260 230,420 S280,620 250,840',
    'M350,-20 C320,150 380,280 340,440 S360,640 360,840',
  ],
  roadWidth: 2.5,

  /** Two of them, so the network reads as a hierarchy rather than a mesh. */
  highways: [
    'M-20,420 C120,380 240,470 360,420 S440,380 460,420',
    'M150,-20 C180,180 130,360 170,560 S200,720 180,840',
  ],
  highwayWidth: 5,

  /**
   * One journey, dashed — origin at the first node, destination at the last.
   *
   * It is the same story the brand mark tells (open ring → curve → filled dot), which
   * is why the backdrop and the logo sit together without competing.
   */
  route: 'M70,720 C120,560 200,520 230,400 C260,290 200,210 300,150',
  routeWidth: 4.5,
  routeDash: '1 12',

  /** Cities. The first and last are the route's endpoints, so they are drawn larger. */
  nodes: [
    { cx: 70, cy: 720, r: 5 },
    { cx: 230, cy: 400, r: 4 },
    { cx: 300, cy: 150, r: 6 },
    { cx: 150, cy: 560, r: 3.5 },
    { cx: 340, cy: 430, r: 3.5 },
    { cx: 110, cy: 300, r: 3 },
  ],
} as const;
