import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, type AppTheme } from '../theme';

/**
 * Structural tab-bar props — decoupled from the navigation library, whose
 * internals changed across Expo Router versions. Matches the runtime shape
 * Expo Router's <Tabs tabBar={...}> passes.
 */
type TabIcon = (p: { focused: boolean; color: string; size: number }) => ReactNode;
interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: Record<
    string,
    { options: { title?: string; tabBarIcon?: TabIcon; tabBarBadge?: number | string } }
  >;
  navigation: {
    emit: (event: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
}

/**
 * Onyx bottom bar (DS v7).
 * A quiet, elevated surface. The active tab lifts into a soft accent pill with
 * an ink/accent icon + bold label; inactive tabs stay muted. Optional numeric
 * badges (red circle + count) surface actionable items — set via the route's
 * `tabBarBadge` option.
 */
export function TabBar({ state, descriptors, navigation }: TabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const s = makeStyles(t);

  const routes = state.routes.filter((r) => descriptors[r.key].options.tabBarIcon);

  return (
    <View style={[s.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {routes.map((route) => {
        const { options } = descriptors[route.key];
        const focused = state.routes[state.index]?.key === route.key;
        const color = focused ? t.colors.accent : t.colors.muted;
        const label = (options.title ?? route.name) as string;
        const badge = options.tabBarBadge;
        const badgeText =
          typeof badge === 'number' ? (badge > 99 ? '99+' : String(badge)) : badge ? String(badge) : null;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <Pressable key={route.key} onPress={onPress} style={s.item} hitSlop={6}>
            <View style={[s.iconWrap, focused && s.iconWrapOn]}>
              {options.tabBarIcon?.({ focused, color, size: 22 })}
              {badgeText ? (
                <View style={s.badge}>
                  <Text style={s.badgeText} numberOfLines={1}>
                    {badgeText}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={[s.label, { color }, focused && s.labelOn]} numberOfLines={1}>
              {label}
            </Text>
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
      paddingTop: 8,
      ...t.shadow.lg,
    },
    item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
    iconWrap: {
      width: 52,
      height: 34,
      borderRadius: t.radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconWrapOn: { backgroundColor: t.colors.accentSoft },
    label: { fontFamily: t.fontFamily.medium, fontSize: 11 },
    labelOn: { fontFamily: t.fontFamily.bold },
    badge: {
      position: 'absolute',
      top: -2,
      right: 6,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 4,
      backgroundColor: t.colors.danger,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: t.colors.surface,
    },
    badgeText: { fontFamily: t.fontFamily.extrabold, fontSize: 10, color: '#FFFFFF' },
  });
