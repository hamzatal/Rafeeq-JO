import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTheme, type AppTheme } from '../theme';
import { Icon, type IconName } from './Icon';

/** ── Card ─────────────────────────────────────────────────────────── */
export function Card({ children, style, onPress }: { children: React.ReactNode; style?: ViewStyle; onPress?: () => void }) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [s.card, pressed && s.pressed, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[s.card, style]}>{children}</View>;
}

/** ── Screen header (title + optional subtitle + trailing slot) ──────── */
export function ScreenHeader({ title, subtitle, trailing }: { title: string; subtitle?: string; trailing?: React.ReactNode }) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={s.header}>
      <View style={s.headerText}>
        <Text style={s.headerTitle}>{title}</Text>
        {subtitle ? <Text style={s.headerSub}>{subtitle}</Text> : null}
      </View>
      {trailing}
    </View>
  );
}

/** ── Section title ─────────────────────────────────────────────────── */
export function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={s.sectionRow}>
      <Text style={s.section}>{title}</Text>
      {action}
    </View>
  );
}

/** ── Badge / status pill ───────────────────────────────────────────── */
export function Badge({ label, tone = 'primary' }: { label: string; tone?: 'primary' | 'success' | 'warning' | 'danger' | 'muted' }) {
  const t = useTheme();
  const color = {
    primary: t.colors.primary,
    success: t.colors.success,
    warning: t.colors.warning,
    danger: t.colors.danger,
    muted: t.colors.muted,
  }[tone];
  return (
    <View style={{ backgroundColor: `${color}1A`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
      <Text style={{ color, fontFamily: t.fontFamily.bold, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

/** ── Empty state ───────────────────────────────────────────────────── */
export function EmptyState({ icon = 'inbox', title, hint }: { icon?: IconName; title: string; hint?: string }) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <Icon name={icon} size={28} color={t.colors.muted} />
      </View>
      <Text style={s.emptyTitle}>{title}</Text>
      {hint ? <Text style={s.emptyHint}>{hint}</Text> : null}
    </View>
  );
}

/** ── Skeleton loading list (card placeholders) ─────────────────────── */
export function SkeletonList({ rows = 3 }: { rows?: number }) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  return (
    <View>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={s.skelCard}>
          <View style={s.skelIcon} />
          <View style={{ flex: 1 }}>
            <View style={[s.skelLine, { width: '60%' }]} />
            <View style={[s.skelLine, { width: '40%', marginTop: 8 }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** ── Error state (icon + message + retry) ──────────────────────────── */
export function ErrorState({ title, message, retryLabel, onRetry }: { title: string; message?: string; retryLabel: string; onRetry: () => void }) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={s.errorWrap}>
      <View style={s.errorIcon}>
        <Icon name="alert-circle" size={28} color={t.colors.danger} />
      </View>
      <Text style={s.errorTitle}>{title}</Text>
      {message ? <Text style={s.errorMsg}>{message}</Text> : null}
      <Pressable onPress={onRetry} style={({ pressed }) => [s.retryBtn, pressed && s.pressed]}>
        <Icon name="refresh-cw" size={16} color={t.colors.primary} />
        <Text style={s.retryText}>{retryLabel}</Text>
      </Pressable>
    </View>
  );
}

/** ── Service tile (home grid) ──────────────────────────────────────── */
export function ServiceTile({ icon, label, soon, onPress }: { icon: IconName; label: string; soon?: boolean; onPress?: () => void }) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  return (
    <Pressable onPress={onPress} disabled={soon} style={({ pressed }) => [s.tile, pressed && !soon && s.pressed]}>
      <View style={s.tileIcon}>
        <Icon name={icon} size={24} color={t.colors.primary} />
      </View>
      <Text style={s.tileLabel} numberOfLines={1}>{label}</Text>
      {soon ? <Text style={s.tileSoon}>قريباً</Text> : null}
    </Pressable>
  );
}

/** ── Stat / balance card ───────────────────────────────────────────── */
export function StatCard({ label, value, icon, onPress }: { label: string; value: string; icon?: IconName; onPress?: () => void }) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [s.stat, pressed && onPress && s.pressed]}>
      <View>
        <Text style={s.statLabel}>{label}</Text>
        <Text style={s.statValue}>{value}</Text>
      </View>
      {icon ? (
        <View style={s.statIcon}>
          <Icon name={icon} size={22} color={t.colors.onPrimary} />
        </View>
      ) : null}
    </Pressable>
  );
}

/** ── List row ──────────────────────────────────────────────────────── */
export function ListRow({ icon, title, subtitle, trailing, onPress }: { icon?: IconName; title: string; subtitle?: string; trailing?: React.ReactNode; onPress?: () => void }) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [s.row, pressed && onPress && s.pressed]}>
      {icon ? (
        <View style={s.rowIcon}>
          <Icon name={icon} size={18} color={t.colors.primary} />
        </View>
      ) : null}
      <View style={s.rowText}>
        <Text style={s.rowTitle}>{title}</Text>
        {subtitle ? <Text style={s.rowSub}>{subtitle}</Text> : null}
      </View>
      {trailing}
    </Pressable>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    card: { backgroundColor: t.colors.card, borderRadius: t.radius['2xl'], padding: t.spacing.lg, marginBottom: t.spacing.base, ...t.shadow.md },
    pressed: { opacity: 0.92, transform: [{ scale: 0.985 }] },

    header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: t.spacing.lg },
    headerText: { flex: 1 },
    headerTitle: { fontFamily: t.fontFamily.extrabold, fontSize: 26, color: t.colors.text, textAlign: 'right' },
    headerSub: { fontFamily: t.fontFamily.regular, fontSize: 14, color: t.colors.textSecondary, textAlign: 'right', marginTop: 2 },

    sectionRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginTop: t.spacing.lg, marginBottom: t.spacing.sm },
    section: { fontFamily: t.fontFamily.bold, fontSize: 17, color: t.colors.text, textAlign: 'right' },

    skelCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: t.spacing.md, backgroundColor: t.colors.surface, borderRadius: t.radius.lg, borderWidth: 1, borderColor: t.colors.hairline, padding: t.spacing.base, marginBottom: t.spacing.sm },
    skelIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: t.colors.surfaceAlt },
    skelLine: { height: 12, borderRadius: 6, backgroundColor: t.colors.surfaceAlt },

    errorWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: t.spacing['3xl'] },
    errorIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: t.colors.dangerSoft, alignItems: 'center', justifyContent: 'center', marginBottom: t.spacing.base },
    errorTitle: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.text, textAlign: 'center' },
    errorMsg: { fontFamily: t.fontFamily.regular, fontSize: 13, color: t.colors.textSecondary, textAlign: 'center', marginTop: 4, maxWidth: 280 },
    retryBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: t.spacing.base, borderWidth: 1, borderColor: t.colors.primary, borderRadius: t.radius.md, paddingVertical: 9, paddingHorizontal: 18 },
    retryText: { fontFamily: t.fontFamily.bold, fontSize: 14, color: t.colors.primary },

    empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: t.spacing['3xl'] },
    emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: t.colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: t.spacing.base },
    emptyTitle: { fontFamily: t.fontFamily.bold, fontSize: 16, color: t.colors.text, textAlign: 'center' },
    emptyHint: { fontFamily: t.fontFamily.regular, fontSize: 13, color: t.colors.textSecondary, textAlign: 'center', marginTop: 4, maxWidth: 260 },

    tile: { width: '23%', alignItems: 'center', marginBottom: t.spacing.base },
    tileIcon: { width: 60, height: 60, borderRadius: t.radius.xl, backgroundColor: t.colors.card, alignItems: 'center', justifyContent: 'center', marginBottom: 7, ...t.shadow.sm },
    tileLabel: { fontFamily: t.fontFamily.medium, fontSize: 12, color: t.colors.text, textAlign: 'center' },
    tileSoon: { fontFamily: t.fontFamily.regular, fontSize: 9, color: t.colors.muted },

    stat: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', backgroundColor: t.colors.primary, borderRadius: t.radius['2xl'], padding: t.spacing.lg, ...t.shadow.md },
    statLabel: { fontFamily: t.fontFamily.medium, fontSize: 13, color: t.colors.onPrimary, opacity: 0.85, textAlign: 'right' },
    statValue: { fontFamily: t.fontFamily.extrabold, fontSize: 26, color: t.colors.onPrimary, textAlign: 'right', marginTop: 2 },
    statIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },

    row: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: t.colors.card, borderRadius: t.radius.xl, padding: t.spacing.base, marginBottom: t.spacing.sm, ...t.shadow.sm },
    rowIcon: { width: 40, height: 40, borderRadius: t.radius.md, backgroundColor: t.colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginLeft: t.spacing.md },
    rowText: { flex: 1 },
    rowTitle: { fontFamily: t.fontFamily.bold, fontSize: 15, color: t.colors.text, textAlign: 'right' },
    rowSub: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.textSecondary, textAlign: 'right', marginTop: 2 },
  });
