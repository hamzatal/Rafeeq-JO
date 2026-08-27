/* ═══════════════════════════════════════════════════════════════════════════
   A stand-in for `react-native-svg`, for tests only.

   The real package ships TypeScript source containing `import typeof`, which Node's
   ESM loader cannot parse — the same class of problem as the Flow syntax in
   `react-native` that broke `next build` in phase 6. It arrives here transitively:
   `Icon` → `lucide-react-native` → `react-native-svg`.

   Every export is a `View`. The tests assert PROPS and BRANCHES — which label a
   control announces, which state a list renders — never vector geometry, so a real
   SVG implementation would add a parse problem and prove nothing.
   ═══════════════════════════════════════════════════════════════════════════ */

import { View, type ViewProps } from 'react-native';

const stub = (name: string) => {
  const C = (props: ViewProps) => <View {...props} />;
  C.displayName = name;

  return C;
};

export const Svg = stub('Svg');
export const Circle = stub('Circle');
export const Ellipse = stub('Ellipse');
export const G = stub('G');
export const Text = stub('SvgText');
export const TSpan = stub('TSpan');
export const TextPath = stub('TextPath');
export const Path = stub('Path');
export const Polygon = stub('Polygon');
export const Polyline = stub('Polyline');
export const Line = stub('Line');
export const Rect = stub('Rect');
export const Use = stub('Use');
export const Image = stub('SvgImage');
export const Symbol = stub('SvgSymbol');
export const Defs = stub('Defs');
export const LinearGradient = stub('LinearGradient');
export const RadialGradient = stub('RadialGradient');
export const Stop = stub('Stop');
export const ClipPath = stub('ClipPath');
export const Pattern = stub('Pattern');
export const Mask = stub('Mask');
export const Marker = stub('Marker');
export const ForeignObject = stub('ForeignObject');

export default Svg;
