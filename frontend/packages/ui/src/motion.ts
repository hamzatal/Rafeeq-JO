/* ═══════════════════════════════════════════════════════════════════════════
   MOTION — animation that a user can turn off.

   ── The state before this ──────────────────────────────────────────────────

   Thirteen files ran `Animated` loops. `AccessibilityInfo` appeared in ZERO
   TypeScript files across all three clients, so "Reduce Motion" — a switch that
   both iOS and Android expose, and that people with vestibular disorders,
   migraine triggers or motion sickness actually use — did nothing at all.

   Three of those animations run FOREVER: the three-dot `Loader`, the `Skeleton`
   shimmer, and the pulsing live-trip marker. An infinite animation is the case
   the setting exists for; a one-off 260ms sheet slide is not really the problem.

   ── Why a hook and not a global flag ───────────────────────────────────────

   The setting changes while the app is open — someone turns it on *because*
   something is making them ill. A module-scope boolean read at import time would
   need an app restart to take effect, which is the same as not supporting it.
   ═══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Whether the OS asks us to reduce motion. Live — updates on change.
 *
 * Defaults to `false` so a platform that cannot answer (web, an old Android)
 * still animates. The alternative default would silently strip motion from every
 * app on those platforms.
 */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    let alive = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => {
        if (alive) setReduce(on);
      })
      .catch(() => {
        /* platform cannot answer — keep animating */
      });

    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (on) => {
      if (alive) setReduce(on);
    });

    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  return reduce;
}

/**
 * How long an animation should run.
 *
 * Zero when motion is reduced, which lands the animated value on its final state
 * in one frame. Deliberately NOT "skip the animation": the end state is what the
 * layout expects, and a loop that never starts leaves a skeleton at whatever
 * opacity it was constructed with.
 */
export function motionDuration(ms: number, reduce: boolean): number {
  return reduce ? 0 : ms;
}
