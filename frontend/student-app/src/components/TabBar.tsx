import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme, type AppTheme } from '../theme';

/**
 * Stitch bottom tab bar (student app).
 *
 * A clean white bar on a soft navy-tinted shadow. The active tab reads in the
 * primary Deep Royal Blue; inactive tabs stay muted. The middle route
 * (`assistant`) renders as the signature elevated **Rafeeq AI** navy circle
 * that floats above the bar — the brand's focal call-to-action. Optional
 * numeric badges surface actionable items via the route's `tabBarBadge`.
 */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const s = makeStyles(t);

  const routes = state.routes.filter((r) => descriptors[r.key].options.tabBarIcon);

  return (
    <View style={[s.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {routes.map((route) => {
        const { options } = descriptors[route.key];
        const focused = state.routes[state.index]?.key === route.key;
        const label = (options.title ?? route.name) as string;
        const isCenter = route.name === 'assistant';
        const badge = options.tabBarBadge;
        const badgeText =
          typeof badge === 'number' ? (badge > 99 ? '99+' : String(badge)) : badge ? String(badge) : null;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        // ── Center focal button — Rafeeq AI (elevated navy circle) ──
        if (isCenter) {
          return (
            <Pressable key={route.key} onPress={onPress} style={s.centerItem} hitSlop={8}>
              <View style={s.centerBtn}>{options.tabBarIcon?.({ focused, color: '#FFFFFF', size: 26 })}</View>
              <Text style={s.centerLabel} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        }

        const color = focused ? t.colors.primary : t.colors.muted;
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
      borderTopColor: t.colors.hairline,
      paddingTop: 10,
      ...t.shadow.lg,
    },
    item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
    iconWrap: {
      width: 52,
      height: 32,
      borderRadius: t.radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconWrapOn: { backgroundColor: t.colors.primarySoft },
    label: { fontFamily: t.fontFamily.medium, fontSize: 11 },
    labelOn: { fontFamily: t.fontFamily.bold },

    // Center Rafeeq AI focal button
    centerItem: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', gap: 4 },
    centerBtn: {
      width: 56,
      height: 56,
      borderRadius: 28,
      marginTop: -24,
      backgroundColor: t.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 4,
      borderColor: t.colors.surface,
      ...t.shadow.md,
    },
    centerLabel: { fontFamily: t.fontFamily.bold, fontSize: 11, color: t.colors.accent },

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
