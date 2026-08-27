'use client';

import { useT } from '../lib/i18n';
import { Icon } from './Icon';

/**
 * "We could not load this" — distinct from "there is nothing here".
 *
 * ── Why this component exists ─────────────────────────────────────────────────
 *
 * Six pages fetched with `.then(setItems).finally(() => setLoading(false))` and no
 * `.catch()`. On a failed request the promise rejected unhandled, `loading` flipped to
 * false, `items` stayed `[]`, and the page rendered its EMPTY state. A broken API and
 * a genuinely empty table were pixel-identical.
 *
 * On most pages that is misleading. On `/withdrawals` it is dangerous: the page
 * reported "no pending withdrawals" while the payout queue was unreachable, so an
 * operator would reasonably conclude there was nothing to pay out today. An empty
 * state is a factual claim about the data, and it must not be made on the strength of
 * a failed request.
 *
 * Deliberately includes a retry: an operator who cannot retry reloads the whole
 * dashboard and loses their filters.
 */
export function LoadError({ onRetry }: { onRetry: () => void }) {
  const { t } = useT();

  return (
    <div
      className="card flex flex-col items-center gap-3 py-10 text-center"
      role="alert"
      aria-live="polite"
    >
      <Icon name="cloud-off" size={32} className="text-danger" />
      <p className="font-semibold surface-text">{t('common.loadFailed')}</p>
      <p className="text-sm text-muted max-w-sm">{t('common.loadFailedHint')}</p>
      <button type="button" onClick={onRetry} className="btn-outline mt-1">
        {t('common.retry')}
      </button>
    </div>
  );
}
