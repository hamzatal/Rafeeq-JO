'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { DriverProfile } from '@rafeeq/shared';
import { api } from '../../../src/lib/api';
import { LoadError } from '../../../src/components/LoadError';
import { DriverStatusBadge } from '../../../src/components/DriverStatusBadge';

const FILTERS = [
  { value: '', label: 'الكل' },
  { value: 'under_review', label: 'قيد المراجعة' },
  { value: 'approved', label: 'معتمد' },
  { value: 'pending', label: 'بانتظار' },
  { value: 'rejected', label: 'مرفوض' },
  { value: 'suspended', label: 'موقوف' },
];

export default function DriversPage() {
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  /*
   * ── ?q= from the global header search ─────────────────────────────────────
   *
   * This read `window.location.search` in a `[]`-dep effect. The header search is a
   * CLIENT-side Next navigation, so an operator already on /drivers who searches
   * again does not re-run the effect: `window.location.search` is stale relative to
   * the render and the box keeps the previous term. `useSearchParams` is the reactive
   * source, and it re-runs.
   */
  const params = useSearchParams();
  useEffect(() => {
    const q = params.get('q');
    if (q) setSearch(q);
  }, [params]);

  /*
   * ── The search goes to the SERVER ─────────────────────────────────────────
   *
   * It used to filter `drivers` in memory after fetching `per_page: 50`. So searching
   * for a captain who is 51st by `created_at` rendered «لا يوجد كباتن» — a factual
   * claim, on a page whose whole job is finding one captain among many. `listDrivers`
   * has accepted a `search` param the whole time.
   *
   * Debounced, because this now fires per keystroke.
   */
  const load = useCallback(() => {
    setLoading(true);
    setLoadError(false);

    return api.admin
      .listDrivers({ status: status || undefined, search: search.trim() || undefined, per_page: 50 })
      .then((r) => setDrivers(r.items))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [status, search]);

  useEffect(() => {
    const handle = setTimeout(load, 250);

    return () => clearTimeout(handle);
  }, [load]);

  return (
    <div>
      <h1 className="text-2xl font-bold surface-text mb-4">الكباتن</h1>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatus(f.value)}
            className={`badge border ${status === f.value ? 'bg-primary text-white border-primary' : 'bg-white muted-text border-line'}`}
          >
            {f.label}
          </button>
        ))}
        <input
          className="input max-w-xs ms-auto"
          placeholder="بحث بالاسم أو الهاتف..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-muted">جارٍ التحميل...</div>
        ) : loadError ? (
          <LoadError onRetry={load} />
        ) : drivers.length === 0 ? (
          <div className="p-6 text-center text-muted">لا يوجد كباتن</div>
        ) : (
          <table className="w-full text-sm">
            <caption className="sr-only">الكباتن</caption>
            <thead className="table-head">
              <tr>
                <th scope="col" className="text-right p-3 font-medium">الاسم</th>
                <th scope="col" className="text-right p-3 font-medium">الهاتف</th>
                <th scope="col" className="text-right p-3 font-medium">الحالة</th>
                <th scope="col" className="text-right p-3 font-medium">التقييم</th>
                <th scope="col" className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => (
                <tr key={d.id} className="row-line">
                  <td className="p-3 font-medium surface-text">{d.user?.full_name ?? '—'}</td>
                  <td className="p-3 text-muted">{d.user?.phone ?? '—'}</td>
                  <td className="p-3"><DriverStatusBadge status={d.status} /></td>
                  {/* `{d.rating_avg?.toFixed(1)} ★` rendered a bare star with no
                      number for every captain who has not been rated yet: the optional
                      chain yields undefined, React prints nothing, and the ` ★` stays.
                      The two cells above already used `?? '—'`. */}
                  <td className="p-3 text-muted tabular-nums">
                    {d.rating_avg != null ? `${Number(d.rating_avg).toFixed(1)} ★` : '—'}
                  </td>
                  <td className="p-3 text-left">
                    <Link href={`/drivers/${d.id}`} className="text-primary font-medium hover:underline">
                      مراجعة
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
