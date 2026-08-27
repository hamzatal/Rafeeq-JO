/* ═══════════════════════════════════════════════════════════════════════════
   SURFACES — the card, the row, the header, the badge.

   Was `ui.tsx` in both apps. Renamed because a file called `ui` inside a package
   called `ui` tells a reader nothing, and because the two copies had drifted in a
   way the name helped hide: the student's `Card` was 28px round and the captain's
   24, the student's `ListRow` 24 and the captain's 16 — four radii for two
   components. Phase 6 collapsed them to `radius.card`; this file is why they can
   no longer diverge.

   The list-state components (`EmptyState`, `ErrorState`, `SkeletonList`) live in
   `states.tsx` now, next to `ListState`, which is the composition that makes
   "empty because the request failed" impossible to write.
   ═══════════════════════════════════════════════════════════════════════════ */

import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { alpha } from '@rafeeq/tokens';
import { useTheme, type AppTheme } from '../theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

/** ── Card ───────────────────────────────────────────────────────────────── */
export function Card({
  children,
  style,
  onPress,
  accessibilityLabel,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  /** Required in spirit when `onPress` is set — see the note below. */
  accessibilityLabel?: string;
}) {
  const t = useTheme();
  const s = makeStyles(t);

  if (onPress) {
    return (
      /*
       * A tappable card announces as a button. Without the role a screen reader
       * reads the contents and gives no indication they can be activated, so the
       * whole card is invisible as a control.
       */
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [s.card, pressed && s.pressed, style]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[s.card, style]}>{children}</View>;
}

/** ── Screen header ──────────────────────────────────────────────────────── */
export function ScreenHeader({
  title,
  subtitle,
  trailing,
}: {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
}) {
  const t = useTheme();
  const s = makeStyles(t);

  return (
    <View style={s.header}>
      <View style={s.headerText}>
        <Text role="display" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text role="body" tone="secondary" style={s.headerSub}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}

/** ── Section title ──────────────────────────────────────────────────────── */
export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  const t = useTheme();
  const s = makeStyles(t);

  return (
    <View style={s.sectionRow}>
      <Text role="titleMd" accessibilityRole="header">
        {title}
      </Text>
      {action}
    </View>
  );
}

/** ── Badge / status pill ────────────────────────────────────────────────── */
export function Badge({
  label,
  tone = 'primary',
}: {
  label: string;
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'muted';
}) {
  const t = useTheme();
  const color = {
    primary: t.colors.primary,
    success: t.colors.success,
    warning: t.colors.warning,
    danger: t.colors.danger,
    muted: t.colors.muted,
  }[tone];

  return (
    <View style={[styles.badge, { backgroundColor: alpha(color, 0.1), borderRadius: t.radius.pill }]}>
      <Text role="caption" align="center" style={{ color, fontFamily: t.fontFamily.bold }}>
        {label}
      </Text>
    </View>
  );
}

/** ── Stat / balance card ────────────────────────────────────────────────── */
export function StatCard({
  label,
  value,
  icon,
  onPress,
}: {
  label: string;
  value: string;
  icon?: IconName;
  onPress?: () => void;
}) {
  const t = useTheme();
  const s = makeStyles(t);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      /* Label and value read as one phrase: «الرصيد المتاح ٤٫٥٠٠ د.أ». */
      accessibilityLabel={`${label} ${value}`}
      style={({ pressed }) => [s.stat, pressed && onPress && s.pressed]}
    >
      <View>
        <Text role="label" tone="inverse" style={s.statLabel}>
          {label}
        </Text>
        <Text role="display" tone="inverse">
          {value}
        </Text>
      </View>
      {icon ? (
        <View style={s.statIcon}>
          <Icon name={icon} size={22} color={t.colors.onPrimary} />
        </View>
      ) : null}
    </Pressable>
  );
}

/** ── List row ───────────────────────────────────────────────────────────── */
export function ListRow({
  icon,
  title,
  subtitle,
  trailing,
  onPress,
}: {
  icon?: IconName;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  onPress?: () => void;
}) {
  const t = useTheme();
  const s = makeStyles(t);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      style={({ pressed }) => [s.row, pressed && onPress && s.pressed]}
    >
      {icon ? (
        <View style={s.rowIcon}>
          <Icon name={icon} size={18} color={t.colors.primary} />
        </View>
      ) : null}
      <View style={s.rowText}>
        <Text role="titleSm" style={s.rowTitle}>
          {title}
        </Text>
        {subtitle ? (
          <Text role="caption" tone="secondary" style={s.rowSub}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4 },
});

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    card: {
      backgroundColor: t.colors.surface,
      borderRadius: t.radius.card,
      padding: t.space.lg,
      marginBottom: t.space.base,
      ...t.shadow.md,
    },
    pressed: { opacity: 0.92, transform: [{ scale: 0.985 }] },

    header: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: t.space.lg,
    },
    headerText: { flex: 1 },
    headerSub: { marginTop: 2 },

    sectionRow: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: t.space.lg,
      marginBottom: t.space.sm,
    },

    stat: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: t.colors.primary,
      borderRadius: t.radius.card,
      padding: t.space.lg,
      ...t.shadow.md,
    },
    statLabel: { opacity: 0.85 },
    statIcon: {
      width: 44,
      height: 44,
      borderRadius: t.radius.pill,
      /* Was `rgba(255,255,255,0.18)`. A white the gate could not see. */
      backgroundColor: alpha(t.colors.onPrimary, 0.18),
      alignItems: 'center',
      justifyContent: 'center',
    },

    row: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      backgroundColor: t.colors.surface,
      borderRadius: t.radius.card,
      padding: t.space.base,
      marginBottom: t.space.sm,
      ...t.shadow.sm,
    },
    rowIcon: {
      width: 40,
      height: 40,
      borderRadius: t.radius.control,
      backgroundColor: t.colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: t.space.md,
    },
    rowText: { flex: 1 },
    rowTitle: { fontFamily: t.fontFamily.bold },
    rowSub: { marginTop: 2 },
  });
