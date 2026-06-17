'use client';

import { useEffect, useState } from 'react';
import type { User } from '@rafeeq/shared';
import { api } from '../../../src/lib/api';

const TYPES = [
  { value: '', label: 'الكل' },
  { value: 'student', label: 'طلاب' },
  { value: 'driver', label: 'كباتن' },
  { value: 'support', label: 'دعم' },
  { value: 'admin', label: 'إدارة' },
];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const handle = setTimeout(() => {
      api.admin
        .listUsers({ type: type || undefined, search: search || undefined, per_page: 50 })
        .then((r) => setUsers(r.items))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [type, search]);

  return (
    <div>
      <h1 className="text-2xl font-extrabold surface-text mb-4">المستخدمون</h1>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {TYPES.map((tp) => (
          <button
            key={tp.value}
            onClick={() => setType(tp.value)}
            className={`badge border ${type === tp.value ? 'bg-primary text-white border-primary' : 'bg-white text-muted border-line'}`}
          >
            {tp.label}
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
        ) : users.length === 0 ? (
          <div className="p-6 text-center text-muted">لا يوجد مستخدمون</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="table-head">
              <tr>
                <th className="text-right p-3 font-medium">الاسم</th>
                <th className="text-right p-3 font-medium">الهاتف</th>
                <th className="text-right p-3 font-medium">النوع</th>
                <th className="text-right p-3 font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="row-line">
                  <td className="p-3 font-medium surface-text">{u.full_name}</td>
                  <td className="p-3 text-muted">{u.phone}</td>
                  <td className="p-3 text-muted">{u.type_label}</td>
                  <td className="p-3 text-muted">{u.status_label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
