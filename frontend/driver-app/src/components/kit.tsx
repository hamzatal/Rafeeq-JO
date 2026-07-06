/**
 * Rafeeq Design System v7 "Onyx" — shared UI primitives (captain app).
 *
 * Premium, theme-aware, RTL-first building blocks. Everything reads from
 * `useTheme()` so light/dark + the unified onyx + signature-blue brand stay consistent.
 * No hard-coded Arabic strings (callers pass already-translated labels).
 */
import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme, type AppTheme } from '../theme';
import { Icon, type IconName } from './Icon';

/** ── PressableScale — tactile press feedback (scale + opacity) ──────── */
export function PressableScale({
  children,
  onPress,
  disabled,
  style,
  scaleTo = 0.97,
  hitSlop,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  hitSlop?: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) =>
    Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      hitSlop={hitSlop}
      onPressIn={() => to(scaleTo)}
      onPressOut={() => to(1)}
      style={style}
    >
      <Animated.View style={{ transform: [{ scale }], opacity: disabled ? 0.5 : 1 }}>{children}</Animated.View>
    </Pressable>
  );
}

/** ── Divider — a hairline separator ────────────────────────────────── */
export function Divider({ spacing = 0 }: { spacing?: number }) {
  const t = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.colors.border, marginVertical: spacing }} />;
}

/** ── Chip — selectable pill (filters, choices) ─────────────────────── */
export function Chip({
  label,
  selected,
  icon,
  onPress,
}: {
  label: string;
  selected?: boolean;
  icon?: IconName;
  onPress?: () => void;
}) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  return (
    <PressableScale onPress={onPress} style={[s.chip, selected && s.chipOn]}>
      <View style={s.chipInner}>
        {icon ? <Icon name={icon} size={15} color={selected ? t.colors.onPrimary : t.colors.textSecondary} /> : null}
        <Text style={[s.chipText, selected && s.chipTextOn]}>{label}</Text>
      </View>
    </PressableScale>
  );
}

/** ── SegmentedControl — 2-4 mutually exclusive options ─────────────── */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={s.segment}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[s.segmentItem, on && s.segmentItemOn]}>
            <Text style={[s.segmentText, on && s.segmentTextOn]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** ── Stepper — increment/decrement a bounded number ────────────────── */
export function Stepper({
  value,
  onChange,
  min = 1,
  max = 9,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={s.stepper}>
      <Pressable disabled={value <= min} onPress={() => onChange(Math.max(min, value - 1))} style={s.stepBtn}>
        <Icon name="minus" size={18} color={value <= min ? t.colors.muted : t.colors.primary} />
      </Pressable>
      <Text style={s.stepValue}>{value}</Text>
      <Pressable disabled={value >= max} onPress={() => onChange(Math.min(max, value + 1))} style={s.stepBtn}>
        <Icon name="plus" size={18} color={value >= max ? t.colors.muted : t.colors.primary} />
      </Pressable>
    </View>
  );
}

/** ── KeyValue — a label/value row (summaries, receipts) ────────────── */
export function KeyValue({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={s.kv}>
      <Text style={s.kvLabel}>{label}</Text>
      <Text style={[s.kvValue, strong && s.kvValueStrong]}>{value}</Text>
    </View>
  );
}

/** ── Skeleton — shimmering placeholder for loading states ──────────── */
export function Skeleton({ width = '100%', height = 16, radius = 8, style }: { width?: number | string; height?: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.9] });
  return (
    <Animated.View
      style={[{ width: width as ViewStyle['width'], height, borderRadius: radius, backgroundColor: t.colors.hairline, opacity }, style]}
    />
  );
}

/** ── Sheet — a bottom sheet modal with scrim + grabber ─────────────── */
export function Sheet({
  visible,
  onClose,
  children,
  title,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: visible ? 1 : 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, slide]);

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [400, 0] });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={[s.sheetBackdrop, { backgroundColor: t.colors.scrim }]} onPress={onClose} />
      <Animated.View style={[s.sheet, { transform: [{ translateY }] }]}>
        <View style={s.grabber} />
        {title ? <Text style={s.sheetTitle}>{title}</Text> : null}
        {children}
      </Animated.View>
    </Modal>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    chip: { borderRadius: 999, borderWidth: 1, borderColor: t.colors.border, backgroundColor: t.colors.surface, paddingHorizontal: 14, paddingVertical: 9 },
    chipOn: { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
    chipInner: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
    chipText: { fontFamily: t.fontFamily.semibold, fontSize: 13, color: t.colors.textSecondary },
    chipTextOn: { color: t.colors.onPrimary },

    segment: { flexDirection: 'row-reverse', backgroundColor: t.colors.hairline, borderRadius: t.radius.lg, padding: 4, gap: 4 },
    segmentItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: t.radius.md },
    segmentItemOn: { backgroundColor: t.colors.surface, ...t.shadow.sm },
    segmentText: { fontFamily: t.fontFamily.semibold, fontSize: 13, color: t.colors.textSecondary },
    segmentTextOn: { color: t.colors.text },

    stepper: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: t.colors.hairline, borderRadius: t.radius.lg, padding: 4, gap: 4 },
    stepBtn: { width: 40, height: 40, borderRadius: t.radius.md, backgroundColor: t.colors.surface, alignItems: 'center', justifyContent: 'center', ...t.shadow.sm },
    stepValue: { minWidth: 36, textAlign: 'center', fontFamily: t.fontFamily.extrabold, fontSize: 18, color: t.colors.text },

    kv: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
    kvLabel: { fontFamily: t.fontFamily.regular, fontSize: 14, color: t.colors.textSecondary, textAlign: 'right' },
    kvValue: { fontFamily: t.fontFamily.semibold, fontSize: 14, color: t.colors.text, textAlign: 'left' },
    kvValueStrong: { fontFamily: t.fontFamily.extrabold, fontSize: 16, color: t.colors.primary },

    sheetBackdrop: { ...StyleSheet.absoluteFillObject },
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: t.colors.elevated,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: t.spacing.lg,
      paddingTop: t.spacing.md,
      paddingBottom: t.spacing['2xl'],
      ...t.shadow.md,
    },
    grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: t.colors.border, marginBottom: t.spacing.md },
    sheetTitle: { fontFamily: t.fontFamily.extrabold, fontSize: 18, color: t.colors.text, textAlign: 'right', marginBottom: t.spacing.md },
  });
