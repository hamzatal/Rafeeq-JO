import { useEffect } from 'react';
import type { RafeeqApiError } from '@rafeeq/api-client';
import { useToast } from '../components/Feedback';

/* ═══════════════════════════════════════════════════════════════════════════
   API PROBLEMS — 403 and 5xx get an answer, once, for the whole app.

   ── What used to happen ────────────────────────────────────────────────────

   The client handled 401 and nothing else. Every other failure was an anonymous
   throw arriving at whichever screen made the call, and screens handled it
   inconsistently: some caught it and showed a banner, some caught it and showed
   their EMPTY state, and some did not catch it at all.

   Those are three different bugs from one missing decision:

     • 403 — «ما عندك صلاحية». Signing out does not help, so it must NOT reuse the
       401 path, which signs out. Before, a 403 on a screen that forgot to catch
       simply did nothing: the button stayed enabled and the user tapped it again.
     • 5xx — our fault. The user can only retry, and they deserve to be told that
       rather than shown an empty list that implies their data is gone.

   ── Why a module slot and not context ─────────────────────────────────────

   The client is constructed at module load, before React exists. It cannot read a
   hook. So the client reports into this slot, and `useApiProblemToasts` fills the
   slot with something that can draw — which is also what makes the two apps share
   one behaviour instead of each screen inventing its own.
   ═══════════════════════════════════════════════════════════════════════════ */

type Reporter = (error: RafeeqApiError) => void;

let reporter: Reporter | null = null;

/** Called by the API client. A no-op until the app mounts. */
export function reportApiProblem(error: RafeeqApiError): void {
  reporter?.(error);
}

export interface ApiProblemLabels {
  /** 403 — «ما عندك صلاحية لهذا الإجراء.» */
  forbidden: string;
  /** 5xx — «صار خطأ عندنا. جرّب بعد لحظات.» */
  server: string;
}

/**
 * Route 403 and 5xx into the toast surface. Call once, under `FeedbackProvider`.
 *
 * The server's own `message` wins when it sent one — a 403 from a policy usually
 * explains itself better than a generic string, and a 5xx usually does not.
 */
export function useApiProblemToasts(labels: ApiProblemLabels): void {
  const toast = useToast();

  useEffect(() => {
    reporter = (error) => {
      if (error.status === 403) {
        toast.error(error.message || labels.forbidden);

        return;
      }
      if (error.isServer) toast.error(labels.server);
    };

    return () => {
      reporter = null;
    };
  }, [toast, labels.forbidden, labels.server]);
}
