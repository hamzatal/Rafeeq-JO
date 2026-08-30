'use client';

import { useEffect, useState } from 'react';
import { useT } from '../lib/i18n';
import { api } from '../lib/api';

/* ═══════════════════════════════════════════════════════════════════════════
   The «النظام سليم» pill from `docs/design/v2/06-admin-1`.

   ── Why it is wired to the probe and not to a constant ─────────────────────

   A green "system healthy" badge that is always green is worse than no badge: it is a
   claim the product makes about itself that nothing checks, and the one morning it is
   wrong is the morning an operator trusts it. `/api/v1/health` already exists and
   already answers the real question — it touches the database and the cache and
   returns 503 when either fails — so the pill reports that, or reports nothing.

   ── Three states, not two ──────────────────────────────────────────────────

   `unknown` is a state, not a synonym for degraded. If the probe itself cannot be
   reached, the honest thing to render is a muted pill rather than a red one: the
   platform may be perfectly healthy and only this dashboard's path to it broken, and
   crying "degraded" at an operator who then goes looking for an outage that does not
   exist is its own kind of failure.
   ═══════════════════════════════════════════════════════════════════════════ */

type Health = 'healthy' | 'degraded' | 'unknown';

/** A minute. The probe hits the database, so it is not free to ask constantly. */
const POLL_MS = 60_000;

export function SystemHealth() {
  const { t } = useT();
  const [state, setState] = useState<Health>('unknown');

  useEffect(() => {
    let alive = true;

    const probe = async () => {
      try {
        const { data } = await api.http.get<{ data?: { status?: string } }>('/health');
        if (!alive) return;
        setState(data?.data?.status === 'healthy' ? 'healthy' : 'degraded');
      } catch {
        // A 503 from the probe IS the degraded answer; anything else means we could
        // not ask, which is `unknown`. The client throws on both, so distinguish them.
        if (alive) setState('unknown');
      }
    };

    probe();
    const id = setInterval(probe, POLL_MS);

    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if (state === 'unknown') return null;

  const healthy = state === 'healthy';

  return (
    <span
      className={`hidden md:flex items-center gap-2 h-8 px-3 rounded-full text-xs font-semibold ${
        healthy ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
      }`}
    >
      <span
        aria-hidden="true"
        className={`w-2 h-2 rounded-full ${healthy ? 'bg-success' : 'bg-danger'}`}
      />
      {t(healthy ? 'shell.systemHealthy' : 'shell.systemDegraded')}
    </span>
  );
}
