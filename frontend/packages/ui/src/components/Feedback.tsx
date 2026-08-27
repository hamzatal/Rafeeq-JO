import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { alpha } from '@rafeeq/tokens';
import { useTheme, type AppTheme } from '../theme';
import { useReduceMotion } from '../motion';
import { Icon, type IconName } from './Icon';
import { Button } from './Button';
import { Text } from './Text';

/**
 * The one global feedback surface: toasts and the confirm dialog.
 *
 * Replaces per-screen inline banners plus local error state with:
 *   - toast.success/error/info/warning(message) → animated top snackbar
 *   - confirm({ title, message, tone }) → themed promise-based dialog
 *
 * Mount <FeedbackProvider> once at the app root; use `useToast()` / `useConfirm()`
 * anywhere below it. All strings are passed in already-translated.
 */

type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

export interface ConfirmOptions {
  title: string;
  message?: string;
  /*
   * Required, both of them.
   *
   * They defaulted to the literals «تأكيد» and «إلغاء» — the only UI copy left in
   * this package, and invisible to the i18n work in phase 10 because a default is
   * not a call site. A required prop moves the string to the app, where the
   * translation lives.
   */
  confirmLabel: string;
  cancelLabel: string;
  tone?: 'default' | 'danger';
}

interface FeedbackApi {
  toast: {
    show: (message: string, variant?: ToastVariant) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
    warning: (message: string) => void;
  };
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackApi | null>(null);

const VARIANT_ICON: Record<ToastVariant, IconName> = {
  success: 'circle-check',
  error: 'circle-alert',
  info: 'info',
  warning: 'triangle-alert',
};

let counter = 0;

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((tItem) => tItem.id !== id));
  }, []);

  const show = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = ++counter;
      setToasts((list) => [...list.slice(-2), { id, message, variant }]);
      setTimeout(() => dismiss(id), variant === 'error' ? 4500 : 3000);
    },
    [dismiss],
  );

  const confirm = useCallback((opts: ConfirmOptions) => {
    setConfirmState(opts);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const closeConfirm = useCallback((result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setConfirmState(null);
  }, []);

  const api = useMemo<FeedbackApi>(
    () => ({
      toast: {
        show,
        success: (m: string) => show(m, 'success'),
        error: (m: string) => show(m, 'error'),
        info: (m: string) => show(m, 'info'),
        warning: (m: string) => show(m, 'warning'),
      },
      confirm,
    }),
    [show, confirm],
  );

  return (
    <FeedbackContext.Provider value={api}>
      {children}
      <ToastHost toasts={toasts} onDismiss={dismiss} />
      <ConfirmDialog state={confirmState} onClose={closeConfirm} />
    </FeedbackContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useToast must be used within <FeedbackProvider>');
  return ctx.toast;
}

export function useConfirm() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useConfirm must be used within <FeedbackProvider>');
  return ctx.confirm;
}

/* ── Toast host (top, stacked, animated) ─────────────────────────────── */
function ToastHost({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  const insets = useSafeAreaInsets();
  if (toasts.length === 0) return null;
  return (
    <View style={[hostStyles.host, { top: insets.top + 8 }]} pointerEvents="box-none">
      {toasts.map((tItem) => (
        <ToastRow key={tItem.id} item={tItem} onDismiss={onDismiss} />
      ))}
    </View>
  );
}

function ToastRow({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const anim = useRef(new Animated.Value(0)).current;
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    /* Land on the end state rather than skipping: `anim` drives opacity too. */
    if (reduceMotion) {
      anim.setValue(1);

      return;
    }
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 80 }).start();
  }, [anim, reduceMotion]);

  const color = {
    success: theme.colors.success,
    error: theme.colors.danger,
    info: theme.colors.info,
    warning: theme.colors.warning,
  }[item.variant];

  return (
    <Animated.View
      style={[
        s.toast,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }],
        },
      ]}
      /*
       * `assertive` because a toast is the RESULT of an action and it disappears.
       * `polite` waits for a pause that may never come before the toast is gone,
       * so the user never learns whether their payment went through.
       */
      accessibilityLiveRegion="assertive"
      accessibilityRole={item.variant === 'error' ? 'alert' : undefined}
    >
      <Pressable style={s.toastInner} onPress={() => onDismiss(item.id)} accessibilityLabel={item.message}>
        <View style={[s.toastIcon, { backgroundColor: alpha(color, 0.13) }]}>
          <Icon name={VARIANT_ICON[item.variant]} size={18} color={color} />
        </View>
        <Text role="titleSm" style={s.toastText} numberOfLines={3}>
          {item.message}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

/* ── Confirm dialog ──────────────────────────────────────────────────── */
function ConfirmDialog({ state, onClose }: { state: ConfirmOptions | null; onClose: (v: boolean) => void }) {
  const theme = useTheme();
  const s = useMemo(() => makeStyles(theme), [theme]);
  const visible = state !== null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => onClose(false)}
      /* Traps the screen reader inside the dialog instead of letting it wander the
         screen behind the scrim, which is what makes a modal a modal. */
      accessibilityViewIsModal
    >
      <Pressable style={s.backdrop} onPress={() => onClose(false)} accessibilityElementsHidden>
        <Pressable style={s.dialog} onPress={(e) => e.stopPropagation()}>
          <Text role="titleLg" accessibilityRole="header">
            {state?.title}
          </Text>
          {state?.message ? (
            <Text role="titleSm" tone="secondary" style={s.dialogMessage}>
              {state.message}
            </Text>
          ) : null}
          <View style={s.dialogActions}>
            <Button
              title={state?.confirmLabel ?? ''}
              variant={state?.tone === 'danger' ? 'danger' : 'primary'}
              onPress={() => onClose(true)}
            />
            <Button title={state?.cancelLabel ?? ''} variant="ghost" onPress={() => onClose(false)} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const hostStyles = StyleSheet.create({
  host: { position: 'absolute', left: 12, right: 12, zIndex: 9999, gap: 8 },
});

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    toast: {
      backgroundColor: t.colors.surface,
      borderRadius: t.radius.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.border,
      /* Brand-tinted, like every other shadow in the system. `#000` reads grey. */
      shadowColor: t.colors.primaryContainer,
      shadowOpacity: 0.18,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
    toastInner: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14 },
    toastIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    toastText: { flex: 1 },

    backdrop: { flex: 1, backgroundColor: t.colors.scrim, alignItems: 'center', justifyContent: 'center', padding: 28 },
    dialog: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: t.colors.surface,
      borderRadius: t.radius.sheet,
      padding: t.space.lg,
    },
    dialogMessage: { marginTop: 8 },
    dialogActions: { marginTop: t.space.lg, gap: t.space.sm },
  });
