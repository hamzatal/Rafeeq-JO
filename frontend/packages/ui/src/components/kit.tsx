/**
 * Small RTL-first primitives: chips, segments, steppers, sheets, skeletons.
 *
 * Everything reads from `useTheme()`, and nothing here hard-codes a string — every
 * label is passed in already translated.
 *
 * The two apps' copies were 83% identical: the captain's was the student's with
 * `SegmentedControl`, `TripTimeline` and `ListSkeleton` deleted, and the student's
 * `Sheet` radius hand-written as 24 where the captain's used the token. Both are
 * now this file.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  View,
  type AccessibilityProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme, type AppTheme } from '../theme';
import { useReduceMotion } from '../motion';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

/** ── PressableScale — tactile press feedback (scale + opacity) ──────── */
export interface PressableScaleProps extends AccessibilityProps {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  hitSlop?: number;
}

export function PressableScale({
  children,
  onPress,
  disabled,
  style,
  scaleTo = 0.97,
  hitSlop,
  ...a11y
}: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const reduceMotion = useReduceMotion();

  /*
   * `...a11y` is the point of this signature.
   *
   * The old props list had no accessibility escape hatch, so every one of the 12
   * call sites produced a pressable with NO role and NO name — the wrapper silently
   * swallowed anything a caller tried to pass. Spreading `AccessibilityProps`
   * means a call site can label itself, and `Chip` now does.
   */
  const to = (v: number) => {
    if (reduceMotion) return;
    Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      hitSlop={hitSlop}
      onPressIn={() => to(scaleTo)}
      onPressOut={() => to(1)}
      style={style}
      {...a11y}
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
    <PressableScale
      onPress={onPress}
      style={[s.chip, selected && s.chipOn]}
      accessibilityRole="button"
      accessibilityLabel={label}
      /* Selection is otherwise conveyed by fill colour alone — WCAG 1.4.1. */
      accessibilityState={{ selected: Boolean(selected) }}
    >
      <View style={s.chipInner}>
        {icon ? <Icon name={icon} size={15} color={selected ? t.colors.onPrimary : t.colors.textSecondary} /> : null}
        <Text role="label" tone={selected ? 'inverse' : 'secondary'} align="center" style={selected && s.chipTextOn}>
          {label}
        </Text>
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
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityLabel={o.label}
            accessibilityState={{ selected: on, checked: on }}
            style={[s.segmentItem, on && s.segmentItemOn]}
          >
            <Text
              role="label"
              tone={on ? 'default' : 'secondary'}
              align="center"
              numberOfLines={1}
            >
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
  valueLabel,
  incrementLabel,
  decrementLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  /* Three required labels: two icon-only buttons and a bare numeral, none of
     which has an accessible name of its own. Translated by the caller. */
  valueLabel: string;
  incrementLabel: string;
  decrementLabel: string;
}) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={s.stepper}>
      <Pressable
        disabled={value <= min}
        onPress={() => onChange(Math.max(min, value - 1))}
        accessibilityRole="button"
        accessibilityLabel={decrementLabel}
        accessibilityState={{ disabled: value <= min }}
        style={s.stepBtn}
      >
        <Icon name="minus" size={18} color={value <= min ? t.colors.muted : t.colors.primary} />
      </Pressable>
      <Text role="titleLg" align="center" style={s.stepValue} accessibilityLabel={`${valueLabel} ${value}`}>
        {value}
      </Text>
      <Pressable
        disabled={value >= max}
        onPress={() => onChange(Math.min(max, value + 1))}
        accessibilityRole="button"
        accessibilityLabel={incrementLabel}
        accessibilityState={{ disabled: value >= max }}
        style={s.stepBtn}
      >
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
    /* One node, so a screen reader reads «الإجمالي ١٫٥٠٠ د.أ» rather than two
       disconnected fragments a swipe apart. */
    <View style={s.kv} accessible accessibilityLabel={`${label} ${value}`}>
      <Text role="body" tone="secondary">
        {label}
      </Text>
      <Text role={strong ? 'titleMd' : 'body'} tone={strong ? 'primary' : 'default'} align="left" style={s.kvValue}>
        {value}
      </Text>
    </View>
  );
}

/** ── Skeleton — shimmering placeholder for loading states ──────────── */
export function Skeleton({ width = '100%', height = 16, radius = 8, style }: { width?: number | string; height?: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const reduceMotion = useReduceMotion();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    /*
     * The shimmer is an INFINITE loop, which is the case Reduce Motion exists for.
     * Settling at 0.7 keeps the placeholder visible — stopping the loop at 0 would
     * leave a nearly-transparent block that reads as a rendering bug.
     */
    if (reduceMotion) {
      shimmer.setValue(0.5);

      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();

    return () => loop.stop();
  }, [shimmer, reduceMotion]);
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

  const reduceMotion = useReduceMotion();

  useEffect(() => {
    Animated.timing(slide, {
      toValue: visible ? 1 : 0,
      /* 0ms lands on the end state in one frame — the sheet still opens, it just
         does not travel 400px to get there. */
      duration: reduceMotion ? 0 : 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, slide, reduceMotion]);

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [400, 0] });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      accessibilityViewIsModal
    >
      <Pressable
        style={[s.sheetBackdrop, { backgroundColor: t.colors.scrim }]}
        onPress={onClose}
        accessibilityElementsHidden
      />
      <Animated.View style={[s.sheet, { transform: [{ translateY }] }]}>
        <View style={s.grabber} />
        {title ? (
          <Text role="titleLg" accessibilityRole="header" style={s.sheetTitle}>
            {title}
          </Text>
        ) : null}
        {children}
      </Animated.View>
    </Modal>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    chip: { borderRadius: t.radius.pill, borderWidth: 1, borderColor: t.colors.border, backgroundColor: t.colors.surface, paddingHorizontal: 14, paddingVertical: 9 },
    chipOn: { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
    chipInner: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
    chipTextOn: { fontFamily: t.fontFamily.bold },

    segment: { flexDirection: 'row-reverse', backgroundColor: t.colors.hairline, borderRadius: t.radius.card, padding: 4, gap: 4 },
    segmentItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: t.radius.control },
    segmentItemOn: { backgroundColor: t.colors.surface, ...t.shadow.sm },

    stepper: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: t.colors.hairline, borderRadius: t.radius.card, padding: 4, gap: 4 },
    stepBtn: { width: 40, height: 40, borderRadius: t.radius.control, backgroundColor: t.colors.surface, alignItems: 'center', justifyContent: 'center', ...t.shadow.sm },
    stepValue: { minWidth: 36 },

    kv: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
    kvValue: { flexShrink: 1 },

    sheetBackdrop: { ...StyleSheet.absoluteFillObject },
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: t.colors.surface,
      borderTopLeftRadius: t.radius.sheet,
      borderTopRightRadius: t.radius.sheet,
      paddingHorizontal: t.space.lg,
      paddingTop: t.space.md,
      paddingBottom: t.spacing['2xl'],
      ...t.shadow.md,
    },
    grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: t.colors.border, marginBottom: t.space.md },
    sheetTitle: { marginBottom: t.space.md },
  });


/** ── TripTimeline — reassuring horizontal status stepper ───────────── */
export function TripTimeline({
  steps,
  current,
  cancelled,
  title,
}: {
  steps: string[];
  current: number;
  cancelled?: boolean;
  title?: string;
}) {
  const t = useTheme();
  return (
    <View style={{ marginTop: t.space.sm }}>
      {title ? (
        <Text style={{ fontFamily: t.fontFamily.semibold, fontSize: 13, color: t.colors.textSecondary, textAlign: 'right', marginBottom: 10 }}>{title}</Text>
      ) : null}
      <View style={{ flexDirection: 'row-reverse', alignItems: 'flex-start' }}>
        {steps.map((label, i) => {
          const done = !cancelled && i < current;
          const active = !cancelled && i === current;
          const dotColor = cancelled ? t.colors.danger : done || active ? t.colors.primary : t.colors.border;
          const lineColor = !cancelled && i < current ? t.colors.primary : t.colors.border;
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center' }}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', width: '100%' }}>
                {/* line to the next step (skip on last) */}
                {i < steps.length - 1 ? <View style={{ flex: 1, height: 2, backgroundColor: lineColor }} /> : <View style={{ flex: 1 }} />}
                <View
                  style={{
                    width: active ? 16 : 12,
                    height: active ? 16 : 12,
                    borderRadius: 8,
                    backgroundColor: done || active ? dotColor : t.colors.surface,
                    borderWidth: 2,
                    borderColor: dotColor,
                  }}
                />
                {i > 0 ? <View style={{ flex: 1, height: 2, backgroundColor: i <= current && !cancelled ? t.colors.primary : t.colors.border }} /> : <View style={{ flex: 1 }} />}
              </View>
              <Text
                style={{
                  fontFamily: active ? t.fontFamily.bold : t.fontFamily.regular,
                  fontSize: 11,
                  color: cancelled ? t.colors.danger : done || active ? t.colors.text : t.colors.muted,
                  textAlign: 'center',
                  marginTop: 6,
                }}
                numberOfLines={1}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}


/** ── ListSkeleton — placeholder rows while a list loads ────────────── */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  const t = useTheme();
  return (
    <View style={{ gap: t.space.sm }}>
      {Array.from({ length: rows }).map((_, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row-reverse',
            alignItems: 'center',
            gap: t.space.md,
            backgroundColor: t.colors.card,
            borderRadius: t.radius.card,
            borderWidth: 1,
            borderColor: t.colors.border,
            padding: t.space.base,
          }}
        >
          <Skeleton width={44} height={44} radius={22} />
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton width="70%" height={14} />
            <Skeleton width="45%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}
