import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';

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
 * A stylised Jordan road-map backdrop (vector, no image asset) used behind the
 * splash. Curved "roads" + highways criss-cross with city nodes, and one
 * highlighted route evokes a trip across the kingdom. Purely decorative.
 */
export function MapBackdrop({
  roadColor = 'rgba(255,255,255,0.10)',
  routeColor = '#E7A63A',
  nodeColor = 'rgba(255,255,255,0.35)',
  opacity = 1,
}: MapBackdropProps) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 400 820" preserveAspectRatio="xMidYMid slice" style={{ opacity }}>
        <Defs>
          <LinearGradient id="route" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={routeColor} stopOpacity="0.9" />
            <Stop offset="1" stopColor={routeColor} stopOpacity="0.45" />
          </LinearGradient>
        </Defs>

        {/* Faint road network */}
        <G fill="none" stroke={roadColor} strokeWidth={2.5} strokeLinecap="round">
          <Path d="M-20,120 C80,90 150,200 260,170 S420,120 460,180" />
          <Path d="M-20,300 C120,260 180,360 300,330 S430,300 460,350" />
          <Path d="M-20,520 C90,480 200,560 300,520 S430,470 460,520" />
          <Path d="M-20,690 C120,660 220,740 340,700 S430,680 460,700" />
          <Path d="M60,-20 C40,140 120,220 90,360 S140,560 110,840" />
          <Path d="M220,-20 C250,160 180,260 230,420 S280,620 250,840" />
          <Path d="M350,-20 C320,150 380,280 340,440 S360,640 360,840" />
        </G>

        {/* Thicker highways */}
        <G fill="none" stroke={roadColor} strokeWidth={5} strokeLinecap="round">
          <Path d="M-20,420 C120,380 240,470 360,420 S440,380 460,420" />
          <Path d="M150,-20 C180,180 130,360 170,560 S200,720 180,840" />
        </G>

        {/* Highlighted journey route */}
        <Path
          d="M70,720 C120,560 200,520 230,400 C260,290 200,210 300,150"
          fill="none"
          stroke="url(#route)"
          strokeWidth={4.5}
          strokeLinecap="round"
          strokeDasharray="1 12"
        />

        {/* City nodes */}
        <G fill={nodeColor}>
          <Circle cx="70" cy="720" r="5" />
          <Circle cx="230" cy="400" r="4" />
          <Circle cx="300" cy="150" r="6" />
          <Circle cx="150" cy="560" r="3.5" />
          <Circle cx="340" cy="430" r="3.5" />
          <Circle cx="110" cy="300" r="3" />
        </G>
      </Svg>
    </View>
  );
}
