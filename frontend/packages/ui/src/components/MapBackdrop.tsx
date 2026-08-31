import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';
import { alpha, brand, neutral, MAP_BACKDROP } from '@rafeeq/tokens';

interface MapBackdropProps {
  /** Faint road network color. */
  roadColor?: string;
  /** Highlighted journey route color. */
  routeColor?: string;
  /** City node color. */
  nodeColor?: string;
  /** Overall opacity of the backdrop. */
  opacity?: number;
}

/**
 * A stylised Jordan road-map backdrop (vector, no image asset), used behind the
 * splash — approved decision 15 asks for «خريطة باهتة» there. Curved roads and
 * highways criss-cross with city nodes, and one highlighted route evokes a trip
 * across the kingdom. Purely decorative.
 *
 * ── The default route colour was not the brand ─────────────────────────────
 *
 * It was `#2F6BFF`. The brand blue is `#1259E3`. A different blue, close enough
 * that nobody would question it side by side and far enough to be a different
 * colour — which is exactly the failure mode the token package exists to end. The
 * three defaults now come from `@rafeeq/tokens`, so the gate sees them.
 */
export function MapBackdrop({
  roadColor = alpha(neutral[0], 0.1),
  routeColor = brand[600],
  nodeColor = alpha(neutral[0], 0.35),
  opacity = 1,
}: MapBackdropProps) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${MAP_BACKDROP.viewBox.width} ${MAP_BACKDROP.viewBox.height}`}
        preserveAspectRatio="xMidYMid slice"
        style={{ opacity }}
      >
        <Defs>
          <LinearGradient id="route" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={routeColor} stopOpacity="0.9" />
            <Stop offset="1" stopColor={routeColor} stopOpacity="0.45" />
          </LinearGradient>
        </Defs>

        {/* Faint road network — paths live in @rafeeq/tokens so the admin sign-in screen
            can draw the same backdrop without importing this package. */}
        <G fill="none" stroke={roadColor} strokeWidth={MAP_BACKDROP.roadWidth} strokeLinecap="round">
          {MAP_BACKDROP.roads.map((d) => (
            <Path key={d} d={d} />
          ))}
        </G>

        <G fill="none" stroke={roadColor} strokeWidth={MAP_BACKDROP.highwayWidth} strokeLinecap="round">
          {MAP_BACKDROP.highways.map((d) => (
            <Path key={d} d={d} />
          ))}
        </G>

        <Path
          d={MAP_BACKDROP.route}
          fill="none"
          stroke="url(#route)"
          strokeWidth={MAP_BACKDROP.routeWidth}
          strokeLinecap="round"
          strokeDasharray={MAP_BACKDROP.routeDash}
        />

        <G fill={nodeColor}>
          {MAP_BACKDROP.nodes.map((n) => (
            <Circle key={`${n.cx}-${n.cy}`} cx={n.cx} cy={n.cy} r={n.r} />
          ))}
        </G>
      </Svg>
    </View>
  );
}
