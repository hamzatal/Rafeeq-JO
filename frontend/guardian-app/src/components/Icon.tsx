import { Feather } from '@expo/vector-icons';
import { useTheme } from '../theme';

/** App-wide icon set (Feather). Centralised so we can swap the set in one place. */
export type IconName = keyof typeof Feather.glyphMap;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

export function Icon({ name, size = 22, color }: IconProps) {
  const theme = useTheme();
  return <Feather name={name} size={size} color={color ?? theme.colors.text} />;
}
