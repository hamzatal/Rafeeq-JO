import { describe, expect, it, vi } from 'vitest';
import type { ReactTestInstance } from 'react-test-renderer';
import { Text as RNText } from 'react-native';
import { RafeeqApiError } from '@rafeeq/api-client';
import { ListState, listLabels, statusFromError, type ListStatus } from './states';
import { render } from '../test/render';

const LABELS = {
  retry: 'إعادة المحاولة',
  errorTitle: 'حدث خطأ',
  errorHint: 'تعذّر تحميل البيانات',
  offlineTitle: 'تعذّر الاتصال',
  offlineHint: 'تأكّد من اتصالك',
};

const EMPTY = { title: 'لا عناصر', hint: 'أضف واحداً' } as const;

function show(status: ListStatus, isEmpty = false, onRetry?: () => void) {
  return render(
    <ListState status={status} isEmpty={isEmpty} empty={EMPTY} labels={LABELS} onRetry={onRetry}>
      <RNText>المحتوى</RNText>
    </ListState>,
  );
}

describe('statusFromError', () => {
  /*
   * Offline and broken are different states because the RECOVERY is different.
   * «تعذّر الاتصال — تأكّد من الإنترنت» is actionable; «حدث خطأ» tells someone on a
   * bus in Irbid with two bars nothing at all.
   */
  it('reads a network failure as offline', () => {
    expect(statusFromError(new RafeeqApiError(0, { message: 'x', code: 'NETWORK_ERROR' }))).toEqual({
      kind: 'offline',
    });
  });

  it('reads a 500 as broken, and keeps the server message', () => {
    const s = statusFromError(new RafeeqApiError(500, { message: 'خطأ في الخادم' }));

    expect(s).toEqual({ kind: 'error', message: 'خطأ في الخادم' });
  });

  /*
   * An unknown throw is OUR bug, not the user's connection. Calling it offline sends
   * them to fix something that is not broken.
   */
  it('reads a non-API throw as broken, not offline', () => {
    expect(statusFromError(new TypeError('undefined is not a function'))).toEqual({ kind: 'error' });
  });
});

describe('ListState', () => {
  it('shows children only when the load succeeded', () => {
    expect(show({ kind: 'ready' }).text()).toContain('المحتوى');
    expect(show({ kind: 'loading' }).text()).not.toContain('المحتوى');
    expect(show({ kind: 'error' }).text()).not.toContain('المحتوى');
    expect(show({ kind: 'offline' }).text()).not.toContain('المحتوى');
  });

  /* ═══════════════════════════════════════════════════════════════════════════
     The bug this component exists to make unrepresentable.

     Seven screens rendered their EMPTY state when the request FAILED, because the
     branches were independent booleans and none of them was `error`. «لا معاملات» on
     a wallet whose history simply did not load tells someone their money moved
     nowhere. Here `isEmpty` is true AND the status is not ready — the status has to
     win, or the whole design is decoration.
     ═══════════════════════════════════════════════════════════════════════════ */
  it('never shows the empty state while the status is not ready', () => {
    for (const status of [{ kind: 'loading' }, { kind: 'error' }, { kind: 'offline' }] as ListStatus[]) {
      const out = show(status, true).text();

      expect(out, `${status.kind} must not claim emptiness`).not.toContain(EMPTY.title);
    }
  });

  it('shows the empty state only once the load succeeded', () => {
    expect(show({ kind: 'ready' }, true).text()).toContain(EMPTY.title);
  });

  it('words offline and broken differently', () => {
    expect(show({ kind: 'offline' }).text()).toContain(LABELS.offlineTitle);
    expect(show({ kind: 'error' }).text()).toContain(LABELS.errorTitle);
    expect(show({ kind: 'offline' }).text()).not.toContain(LABELS.errorTitle);
  });

  it('prefers the server message over the generic hint', () => {
    expect(show({ kind: 'error', message: 'الحساب موقوف' }).text()).toContain('الحساب موقوف');
  });

  it('offers retry only when the caller can retry', () => {
    expect(show({ kind: 'error' }, false, () => {}).text()).toContain(LABELS.retry);
    expect(show({ kind: 'error' }).text()).not.toContain(LABELS.retry);
  });

  it('retries through the given callback', () => {
    const onRetry = vi.fn();
    const r = show({ kind: 'offline' }, false, onRetry);
    r.byRole('button')[0].props.onPress();

    expect(onRetry).toHaveBeenCalledOnce();
  });

  /*
   * Swapping a list for an error panel is SILENT to a screen reader: focus does not
   * move, so nothing is read and the user waits for content that never arrives.
   */
  it('announces the change', () => {
    const r = show({ kind: 'error' });
    const live = r.root.findAll((n: ReactTestInstance) => n.props?.accessibilityLiveRegion === 'polite', {
      deep: true,
    });

    expect(live.length).toBeGreaterThan(0);
  });
});

describe('listLabels', () => {
  /* One place decides which `common.*` keys a list state uses, so five call sites
     cannot each pick `common.error` where the others use `common.loadFailed`. */
  it('reads the standard common.* keys', () => {
    const seen: string[] = [];
    listLabels((key) => {
      seen.push(key);

      return key;
    });

    expect(seen).toEqual([
      'common.retry',
      'common.error',
      'common.loadFailed',
      'common.offline',
      'common.offlineBody',
    ]);
  });
});
