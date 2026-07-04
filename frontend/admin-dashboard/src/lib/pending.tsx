'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PendingCounts } from '@rafeeq/api-client';
import { api } from './api';
import { useAuth } from './auth';

const ZERO: PendingCounts = {
  drivers_pending: 0,
  payments_pending: 0,
  withdrawals_pending: 0,
  complaints_open: 0,
  disputes_open: 0,
  support_open: 0,
  sos_active: 0,
};

/** Maps a sidebar route → the pending-count key that badges it. */
export const ROUTE_BADGE: Record<string, keyof PendingCounts> = {
  '/drivers': 'drivers_pending',
  '/payments': 'payments_pending',
  '/withdrawals': 'withdrawals_pending',
  '/complaints': 'complaints_open',
  '/disputes': 'disputes_open',
  '/support': 'support_open',
  '/safety': 'sos_active',
};

interface PendingCtx {
  counts: PendingCounts;
  total: number;
  refresh: () => void;
}

const Ctx = createContext<PendingCtx>({ counts: ZERO, total: 0, refresh: () => undefined });

export function PendingProvider({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const [counts, setCounts] = useState<PendingCounts>(ZERO);

  const refresh = useCallback(() => {
    if (status !== 'authenticated') return;
    api.admin.pendingCounts().then(setCounts).catch(() => undefined);
  }, [status]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [status, refresh]);

  const total = useMemo(
    () => Object.values(counts).reduce((a, b) => a + (b || 0), 0),
    [counts],
  );

  return <Ctx.Provider value={{ counts, total, refresh }}>{children}</Ctx.Provider>;
}

export const usePending = () => useContext(Ctx);
