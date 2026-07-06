import { Feather } from '@expo/vector-icons';
import { I18nManager } from 'react-native';
import { useTheme } from '../theme';

/** App-wide icon set (Feather). Centralised so we can swap the set in one place. */
export type IconName = keyof typeof Feather.glyphMap;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

/**
 * Directional glyphs that must be horizontally mirrored under RTL — Feather
 * icons don't auto-flip, so a "back" chevron would otherwise point the wrong
 * way in Arabic. We flip only these; symmetric icons are untouched.
 */
const RTL_MIRROR = new Set<string>([
  'chevron-left', 'chevron-right', 'chevrons-left', 'chevrons-right',
  'arrow-left', 'arrow-right',
  'arrow-up-left', 'arrow-up-right', 'arrow-down-left', 'arrow-down-right',
  'corner-up-left', 'corner-up-right', 'corner-down-left', 'corner-down-right',
  'corner-left-up', 'corner-right-up', 'corner-left-down', 'corner-right-down',
  'log-in', 'log-out', 'send',
]);

export function Icon({ name, size = 22, color }: IconProps) {
  const theme = useTheme();
  const mirror = I18nManager.isRTL && RTL_MIRROR.has(name);
  return (
    <Feather
      name={name}
      size={size}
      color={color ?? theme.colors.text}
      style={mirror ? { transform: [{ scaleX: -1 }] } : undefined}
    />
  );
}
