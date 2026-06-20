import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme, type AppTheme } from '../theme';

/**
 * Minimal, professional tab bar (no colored pills) — captain. Quiet icon +
 * label; active tab tinted with the brand color + a thin top indicator.
 */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const s = makeStyles(t);

  const routes = state.routes.filter((r) => descriptors[r.key].options.tabBarIcon);

  return (
    <View style={[s.wrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {routes.map((route) => {
        const { options } = descriptors[route.key];
        const focused = state.routes[state.index]?.key === route.key;
        const color = focused ? t.colors.primary : t.colors.muted;
        const label = (options.title ?? route.name) as string;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <Pressable key={route.key} onPress={onPress} style={s.item} hitSlop={4}>
            <View style={[s.indicator, focused && { backgroundColor: t.colors.accent }]} />
            {options.tabBarIcon?.({ focused, color, size: 23 })}
            <Text style={[s.label, { color }, focused && s.labelOn]} numberOfLines={1}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    wrap: {
      flexDirection: 'row-reverse',
      alignItems: 'flex-start',
      justifyContent: 'space-around',
      backgroundColor: t.colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.colors.border,
      paddingTop: 9,
    },
    item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
    indicator: { position: 'absolute', top: -9, width: 26, height: 3, borderRadius: 2, backgroundColor: 'transparent' },
    label: { fontFamily: t.fontFamily.medium, fontSize: 11 },
    labelOn: { fontFamily: t.fontFamily.bold },
  });
