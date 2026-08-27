/* ═══════════════════════════════════════════════════════════════════════════
   LIST STATE — one component, four outcomes, no fifth.

   ── The bug this makes unrepresentable ─────────────────────────────────────

   A list has four outcomes and the apps rendered them as independent booleans:

     if (loading) return <Skeleton/>
     if (!items.length) return <Empty/>
     return <List/>

   which has no branch for `error`. So a failed request fell through to the EMPTY
   state, and «لا سحوبات معلّقة» appeared on the withdrawals queue when the queue
   was simply unreachable. That shipped in six admin pages and two captain screens
   and was only found in the phase-6 closeout audit — because an empty state is
   indistinguishable from a working one at a glance.

   An empty state is a CLAIM ABOUT THE DATA. It is only true if the request
   succeeded. Making the state a single discriminated union means "empty" cannot
   be reached without a successful load, and the compiler asks for the error
   branch.

   ── Why `offline` is separate from `error` ────────────────────────────────

   Because the recovery is different and so is the wording. «تعذّر الاتصال —
   تأكّد من الإنترنت» is actionable; «حدث خطأ» tells someone on a bus in Irbid
   with two bars nothing. `RafeeqApiError` already distinguishes them with
   `code: 'NETWORK_ERROR'`, and until this component nothing read it.
   ═══════════════════════════════════════════════════════════════════════════ */

import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { RafeeqApiError } from '@rafeeq/api-client';
import { useTheme, type AppTheme } from '../theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { Button } from './Button';
import { ListSkeleton } from './kit';

/** The four outcomes of loading a list. There is no fifth. */
export type ListStatus =
  | { kind: 'loading' }
  | { kind: 'error'; message?: string }
  | { kind: 'offline' }
  | { kind: 'ready' };

/**
 * Turn a thrown value into a status.
 *
 * The one place that decides "is this offline or broken", so the two never drift
 * apart across screens. A non-`RafeeqApiError` is treated as broken rather than
 * offline: an unknown throw is a bug in our code, and telling the user to check
 * their internet sends them to fix something that is not wrong.
 */
export function statusFromError(err: unknown): ListStatus {
  if (err instanceof RafeeqApiError) {
    if (err.code === 'NETWORK_ERROR' || err.status === 0) return { kind: 'offline' };
    return { kind: 'error', message: err.message };
  }

  return { kind: 'error' };
}

export interface ListStateLabels {
  retry: string;
  errorTitle: string;
  errorHint?: string;
  offlineTitle: string;
  offlineHint?: string;
}

/**
 * The five labels, resolved from the standard `common.*` keys.
 *
 * This package holds no UI copy, and it does not here either — it holds the KEY
 * NAMES, which are a convention of `@rafeeq/shared` and identical in both apps.
 * Without this every `<ListState>` call site would spell out five `t(...)` calls,
 * and the fourth one would get `common.error` where the others use
 * `common.loadFailed`. Pass the app's `t`.
 */
export function listLabels(t: (key: string) => string): ListStateLabels {
  return {
    retry: t('common.retry'),
    errorTitle: t('common.error'),
    errorHint: t('common.loadFailed'),
    offlineTitle: t('common.offline'),
    offlineHint: t('common.offlineBody'),
  };
}

export interface ListStateProps {
  status: ListStatus;
  /**
   * Rendered only when `status.kind === 'ready'`. Optional.
   *
   * Omitted by the screens that keep their existing ternary and use this component
   * for the non-ready branches ONLY:
   *
   *   status.kind !== 'ready' ? <ListState … />
   *     : items.length === 0  ? <EmptyState … />
   *     :                       items.map(…)
   *
   * That shape is what those seven screens were missing: the empty branch is now
   * unreachable unless the load SUCCEEDED, which is the whole invariant. Wrapping
   * their bodies instead would have been a larger, riskier edit in the same commit.
   */
  children?: ReactNode;
  /**
   * True when the load succeeded and there is genuinely nothing.
   *
   * Separate from `status` on purpose: emptiness is a property of the DATA, and
   * it can only be evaluated once loading succeeded. Passing it in alongside a
   * non-ready status is harmless — the status wins — which is what stops the
   * "empty because it failed" bug from coming back.
   */
  isEmpty?: boolean;
  empty?: { icon?: IconName; title: string; hint?: string };
  onRetry?: () => void;
  /** Localised labels — build them with `listLabels(t)`. */
  labels: ListStateLabels;
  /** Placeholder rows while loading. Match the real row count where known. */
  skeletonRows?: number;
}

export function ListState({
  status,
  children,
  isEmpty = false,
  empty,
  onRetry,
  labels,
  skeletonRows = 4,
}: ListStateProps) {
  if (status.kind === 'loading') return <ListSkeleton rows={skeletonRows} />;

  if (status.kind === 'offline') {
    return (
      <Feedback
        icon="wifi-off"
        tone="warning"
        title={labels.offlineTitle}
        hint={labels.offlineHint}
        action={onRetry ? { label: labels.retry, onPress: onRetry } : undefined}
      />
    );
  }

  if (status.kind === 'error') {
    return (
      <Feedback
        icon="triangle-alert"
        tone="danger"
        title={labels.errorTitle}
        hint={status.message ?? labels.errorHint}
        action={onRetry ? { label: labels.retry, onPress: onRetry } : undefined}
      />
    );
  }

  if (isEmpty && empty) {
    return <Feedback icon={empty.icon ?? 'inbox'} tone="muted" title={empty.title} hint={empty.hint} />;
  }

  return <>{children ?? null}</>;
}

/* ───────────────────────────────────────────────────────────────────────────
   The shared body of all four states.

   One layout, one icon size, one spacing rhythm. Before this the empty state and
   the error state were separate components with separate paddings, so a list that
   flipped between them jumped.
   ─────────────────────────────────────────────────────────────────────────── */

type Tone = 'muted' | 'danger' | 'warning';

function Feedback({
  icon,
  tone,
  title,
  hint,
  action,
}: {
  icon: IconName;
  tone: Tone;
  title: string;
  hint?: string;
  action?: { label: string; onPress: () => void };
}) {
  const t = useTheme();
  const s = makeStyles(t);

  const ring: Record<Tone, { bg: string; fg: string }> = {
    muted: { bg: t.colors.primarySoft, fg: t.colors.muted },
    danger: { bg: t.colors.dangerSoft, fg: t.colors.danger },
    warning: { bg: t.colors.warningSoft, fg: t.colors.warning },
  };

  return (
    /*
     * `accessibilityLiveRegion` so a screen reader ANNOUNCES the change.
     *
     * Swapping a list for an error panel is a silent DOM change to a screen
     * reader — the focus does not move, so nothing is read and the user waits
     * for content that will never arrive.
     */
    <View style={s.wrap} accessibilityLiveRegion="polite">
      <View style={[s.ring, { backgroundColor: ring[tone].bg }]}>
        <Icon name={icon} size={28} color={ring[tone].fg} />
      </View>
      <Text role="titleMd" align="center">
        {title}
      </Text>
      {hint ? (
        <Text role="body" tone="secondary" align="center" style={s.hint}>
          {hint}
        </Text>
      ) : null}
      {action ? (
        <View style={s.action}>
          <Button title={action.label} onPress={action.onPress} variant="outline" size="md" icon="refresh-cw" />
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (t: AppTheme) =>
  StyleSheet.create({
    wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: t.space['3xl'] },
    ring: {
      width: 64,
      height: 64,
      borderRadius: t.radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: t.space.base,
    },
    hint: { marginTop: 4, maxWidth: 280 },
    action: { marginTop: t.space.base },
  });

/* ───────────────────────────────────────────────────────────────────────────
   The three primitives, still exported.

   `ListState` is the preferred API because it makes the empty-on-error bug
   unrepresentable. These three have 52 existing call sites across screens that
   phases 8-10 rewrite, so they stay — and `check:states` fails on any screen that
   renders `EmptyState` with no error branch anywhere in the file, which is the
   shape the bug actually takes.
   ─────────────────────────────────────────────────────────────────────────── */

export function EmptyState({ icon = 'inbox', title, hint }: { icon?: IconName; title: string; hint?: string }) {
  return <Feedback icon={icon} tone="muted" title={title} hint={hint} />;
}

export function ErrorState({
  title,
  message,
  retryLabel,
  onRetry,
}: {
  title: string;
  message?: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <Feedback
      icon="triangle-alert"
      tone="danger"
      title={title}
      hint={message}
      action={{ label: retryLabel, onPress: onRetry }}
    />
  );
}

/** Card-shaped placeholders. Kept as a name because 10 screens use it. */
export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return <ListSkeleton rows={rows} />;
}
