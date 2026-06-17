'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { DriverProfile } from '@rafeeq/shared';
import { api } from '../../../src/lib/api';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.admin
      .listDrivers({ status: status || undefined, per_page: 50 })
      .then((r) => setDrivers(r.items))
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <div>
      <h1 className="text-2xl font-extrabold surface-text mb-4">الكباتن</h1>

      <div className="flex flex-wrap gap-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatus(f.value)}
            className={`badge border ${status === f.value ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-dcard muted-text border-line dark:border-dline'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-muted">جارٍ التحميل...</div>
        ) : drivers.length === 0 ? (
          <div className="p-6 text-center text-muted">لا يوجد كباتن</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="table-head">
              <tr>
                <th className="text-right p-3 font-medium">الاسم</th>
                <th className="text-right p-3 font-medium">الهاتف</th>
                <th className="text-right p-3 font-medium">الحالة</th>
                <th className="text-right p-3 font-medium">التقييم</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => (
                <tr key={d.id} className="row-line">
                  <td className="p-3 font-medium surface-text">{d.user?.full_name ?? '—'}</td>
                  <td className="p-3 text-muted">{d.user?.phone ?? '—'}</td>
                  <td className="p-3"><DriverStatusBadge status={d.status} /></td>
                  <td className="p-3 text-muted">{d.rating_avg?.toFixed(1)} ★</td>
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
