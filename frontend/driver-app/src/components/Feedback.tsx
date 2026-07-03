import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, type AppTheme } from '../theme';
import { Icon, type IconName } from './Icon';
import { Button } from './Button';

/**
 * Unified feedback system (Design System v6).
 *
 * Replaces the scattered per-screen inline <Banner> + local error state with a
 * single global surface:
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

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
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
  success: 'check-circle',
  error: 'alert-circle',
  info: 'info',
  warning: 'alert-triangle',
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

  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 80 }).start();
  }, [anim]);

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
    >
      <Pressable style={s.toastInner} onPress={() => onDismiss(item.id)}>
        <View style={[s.toastIcon, { backgroundColor: `${color}22` }]}>
          <Icon name={VARIANT_ICON[item.variant]} size={18} color={color} />
        </View>
        <Text style={s.toastText} numberOfLines={3}>
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => onClose(false)}>
      <Pressable style={s.backdrop} onPress={() => onClose(false)}>
        <Pressable style={s.dialog} onPress={(e) => e.stopPropagation()}>
          <Text style={s.dialogTitle}>{state?.title}</Text>
          {state?.message ? <Text style={s.dialogMessage}>{state.message}</Text> : null}
          <View style={s.dialogActions}>
            <Button
              title={state?.confirmLabel ?? 'تأكيد'}
              variant={state?.tone === 'danger' ? 'danger' : 'primary'}
              onPress={() => onClose(true)}
            />
            <Button title={state?.cancelLabel ?? 'إلغاء'} variant="ghost" onPress={() => onClose(false)} />
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
      backgroundColor: t.colors.elevated,
      borderRadius: t.radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.border,
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
    toastInner: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14 },
    toastIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    toastText: { flex: 1, fontFamily: t.fontFamily.semibold, fontSize: 14, color: t.colors.text, textAlign: 'right', lineHeight: 20 },

    backdrop: { flex: 1, backgroundColor: t.colors.scrim, alignItems: 'center', justifyContent: 'center', padding: 28 },
    dialog: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: t.colors.elevated,
      borderRadius: t.radius.xl,
      padding: t.spacing.lg,
    },
    dialogTitle: { fontFamily: t.fontFamily.extrabold, fontSize: 19, color: t.colors.text, textAlign: 'right' },
    dialogMessage: { fontFamily: t.fontFamily.regular, fontSize: 15, lineHeight: 24, color: t.colors.textSecondary, textAlign: 'right', marginTop: 8 },
    dialogActions: { marginTop: t.spacing.lg, gap: t.spacing.sm },
  });
