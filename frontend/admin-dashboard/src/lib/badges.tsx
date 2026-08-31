'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';

/* ═══════════════════════════════════════════════════════════════════════════
   SIDEBAR BADGES — the counts beside a destination.

   `docs/design/v2/06-admin-1/2/3` puts a small count on six sidebar entries. It is the
   most useful thing in the shell: an operator opening the dashboard sees WHERE the work
   is before choosing a page.

   ── Only counts that exist ────────────────────────────────────────────────

   The sheet shows badges on الطلبات الحيّة (14), الكباتن (6), المدفوعات (23),
   السحوبات (4), السلامة و SOS (2) and الدعم والشكاوى (9). This API can answer FOUR of
   those from `AdminInsights.metrics`:

     الكباتن          drivers.pending_review
     المدفوعات        safety.pending_payments
     السلامة و SOS    safety.unresolved_risk_flags
     التنازعات        safety.open_disputes

   There is no pending-request count and no pending-withdrawal count anywhere in the
   API, so those two destinations get NO badge rather than a plausible number. A badge
   is a claim about how much work is waiting; inventing one to match a mockup is exactly
   the kind of decoration that makes an operator stop believing the other four.

   ── One request for the whole shell, and NOT a billed one ─────────────────

   `counts()` returns all four in a single response, so the sidebar costs one call rather
   than one per badge. It lives in a provider because both the sidebar and any page that
   wants the same figure should read the same fetch.

   This used to call `insights()`, and that was a real outage. `GET /admin/ai/insights`
   runs a GPT completion for its `analysis` and `recommendations` — its own route comment
   says «an admin holding down refresh is also spending money» — and it sits under
   `throttle:sensitive`, 20 requests a minute. So four integers in the sidebar invoked a
   language model on every full page load, and after twenty loads the limiter returned
   429 to everything, including `auth.me()`. `AuthProvider` treated that as a dead
   session and signed the operator out: clicking through the dashboard logged you out of
   it. Found when a screenshot run bounced to /login on its twenty-fifth page.

   `counts()` is the same three aggregate queries with no completion and no spend guard.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Keyed by nav `href`, so `nav.ts` stays the only place that knows the routes. */
export type Badges = Partial<Record<string, number>>;

const BadgeContext = createContext<Badges>({});

/** Five minutes. These are review queues, not a live feed. */
const POLL_MS = 5 * 60_000;

export function BadgeProvider({ children }: { children: React.ReactNode }) {
  const [badges, setBadges] = useState<Badges>({});

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const { metrics } = await api.assistant.counts();
        if (!alive) return;

        setBadges({
          '/drivers': metrics.drivers?.pending_review,
          '/payments': metrics.safety?.pending_payments,
          '/safety': metrics.safety?.unresolved_risk_flags,
          '/disputes': metrics.safety?.open_disputes,
        });
      } catch {
        // A failed count must not become a zero: leave the badges absent, which reads
        // as "unknown" rather than "nothing to do".
        if (alive) setBadges({});
      }
    };

    load();
    const id = setInterval(load, POLL_MS);

    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return <BadgeContext.Provider value={badges}>{children}</BadgeContext.Provider>;
}

export const useBadges = (): Badges => useContext(BadgeContext);
