import { useEffect } from 'react';
import { LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme, type AppTheme } from '../theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Rafeeq modern tab bar (v4) — captain. Active item expands into a soft pill
 * with an inline label; inactive items are clean icon-only. Pill animates on
 * selection via LayoutAnimation.
 */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const s = makeStyles(t);

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'));
  }, [state.index]);

  const routes = state.routes.filter((r) => descriptors[r.key].options.tabBarIcon);

  return (
    <View style={[s.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={s.bar}>
        {routes.map((route) => {
          const { options } = descriptors[route.key];
          const focused = state.routes[state.index]?.key === route.key;
          const color = focused ? t.colors.onPrimary : t.colors.muted;
          const label = (options.title ?? route.name) as string;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <Pressable key={route.key} onPress={onPress} style={s.item} hitSlop={6}>
              <View style={[s.pill, focused && s.pillOn]}>
                {options.tabBarIcon?.({ focused, color, size: 22 })}
                {focused ? <Text style={s.pillLabel} numberOfLines={1}>{label}</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    wrap: {
      backgroundColor: t.colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.colors.hairline,
      paddingTop: 10,
      paddingHorizontal: t.spacing.md,
      ...t.shadow.md,
    },
    bar: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-around' },
    item: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    pill: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      height: 44,
      minWidth: 44,
      paddingHorizontal: 12,
      borderRadius: t.radius.full,
      gap: 8,
    },
    pillOn: { backgroundColor: t.colors.primary, ...t.shadow.sm },
    pillLabel: { fontFamily: t.fontFamily.bold, fontSize: 13, color: t.colors.onPrimary },
  });
