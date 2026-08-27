import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme, type AppTheme } from '../theme';
import { Text } from './Text';
import { TOUCH_TARGET } from './IconButton';

/* ═══════════════════════════════════════════════════════════════════════════
   TAB BAR — one implementation, and it follows the approved decision.

   ── Both apps violated decision 16 ────────────────────────────────────────

   The decision reads: «بار التنقّل: مرفوع بظلّ لا حدّ · كبسولة brand-600 مصمتة
   وأيقونة مصمتة للنشط» — raised with a SHADOW and NOT a border, and the active tab
   marked by a SOLID brand-600 capsule with a solid icon.

   What was actually shipped, in two files that were 49% identical:

     student  · shadow.lg  ✓   AND a hairline border  ✗   capsule = `primarySoft`,
                a translucent 8% tint, not solid brand-600  ✗
     captain  · no shadow  ✗   a border  ✗   no capsule at all — a 3px top
                indicator instead  ✗

   Neither matched, they did not match each other, and the decision had been
   approved two phases earlier. This is the shape of defect that a shared
   component prevents: there is now one place to be wrong, and it is right.

   ── What stays configurable ───────────────────────────────────────────────

   The student app has a raised centre button for the AI assistant and numeric
   badges; the captain app has neither. Those are genuine product differences, so
   `centerRoute` and badge rendering are options — not two files.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface TabBarProps extends BottomTabBarProps {
  /**
   * Route name that renders as the raised focal circle.
   *
   * The student app passes `'assistant'`. Omit for a flat bar.
   */
  centerRoute?: string;
}

export function TabBar({ state, descriptors, navigation, centerRoute }: TabBarProps) {
  const t = useTheme();
  const s = makeStyles(t);
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((route) => {
        const { options } = descriptors[route.key];
        const focused = state.routes[state.index]?.key === route.key;
        const label = (options.title ?? route.name) as string;
        const isCenter = centerRoute !== undefined && route.name === centerRoute;

        const badge = options.tabBarBadge;
        const badgeText =
          typeof badge === 'number' ? (badge > 99 ? '99+' : String(badge)) : badge ? String(badge) : null;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        /*
         * `accessibilityRole="tab"` + `selected`, so a screen reader announces
         * "المحفظة، تبويب، محدّد، 3 من 5". Before this the bar was five unlabelled
         * pressables containing an icon and an 11px label, and the SELECTED state —
         * the only thing that tells you where you are — was conveyed by colour
         * alone, which is also a WCAG 1.4.1 failure for a sighted user with low
         * colour discrimination.
         */
        const a11y = {
          accessibilityRole: 'tab' as const,
          accessibilityLabel: badgeText ? `${label} (${badgeText})` : label,
          accessibilityState: { selected: focused },
          accessibilityHint: options.tabBarAccessibilityLabel,
        };

        if (isCenter) {
          return (
            <Pressable key={route.key} onPress={onPress} style={s.centerItem} hitSlop={8} {...a11y}>
              <View style={s.centerBtn}>
                {options.tabBarIcon?.({ focused, color: t.colors.onPrimary, size: 26 })}
              </View>
              <Text role="caption" align="center" style={s.centerLabel} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        }

        const color = focused ? t.colors.onPrimary : t.colors.muted;

        return (
          <Pressable key={route.key} onPress={onPress} style={s.item} hitSlop={6} {...a11y}>
            <View style={[s.iconWrap, focused && s.iconWrapOn]}>
              {options.tabBarIcon?.({ focused, color, size: 22 })}
              {badgeText ? (
                <View style={s.badge}>
                  <Text role="caption" tone="inverse" align="center" style={s.badgeText} numberOfLines={1}>
                    {badgeText}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              role="caption"
              align="center"
              tone={focused ? 'primary' : 'muted'}
              style={focused && s.labelOn}
              numberOfLines={1}
            >
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
    /*
     * A shadow and NO border — decision 16, literally.
     *
     * A hairline plus a shadow reads as two separate edges at the top of the bar,
     * which is why the mockup has only the shadow.
     */
    wrap: {
      flexDirection: 'row-reverse',
      backgroundColor: t.colors.surface,
      paddingTop: 10,
      ...t.shadow.lg,
    },
    item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: TOUCH_TARGET },

    /** The SOLID brand capsule. Not a tint — decision 16. */
    iconWrap: { width: 52, height: 32, borderRadius: t.radius.pill, alignItems: 'center', justifyContent: 'center' },
    iconWrapOn: { backgroundColor: t.colors.primary },
    labelOn: { fontFamily: t.fontFamily.bold },

    centerItem: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', gap: 4, minHeight: TOUCH_TARGET },
    centerBtn: {
      width: 56,
      height: 56,
      borderRadius: t.radius.pill,
      marginTop: -24,
      backgroundColor: t.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 4,
      borderColor: t.colors.surface,
      ...t.shadow.md,
    },
    centerLabel: { fontFamily: t.fontFamily.bold, color: t.colors.accent },

    badge: {
      position: 'absolute',
      top: -2,
      right: 6,
      minWidth: 18,
      height: 18,
      borderRadius: t.radius.pill,
      paddingHorizontal: 4,
      backgroundColor: t.colors.danger,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: t.colors.surface,
    },
    badgeText: { fontFamily: t.fontFamily.bold, fontSize: 10, lineHeight: 14 },
  });
