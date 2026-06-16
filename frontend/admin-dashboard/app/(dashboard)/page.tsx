'use client';

import Link from 'next/link';
import { useAuth } from '../../src/lib/auth';

export default function Overview() {
  const { user } = useAuth();

  const cards = [
    { href: '/drivers', title: 'الكباتن', desc: 'مراجعة الوثائق واعتماد الكباتن' },
    { href: '/users', title: 'المستخدمون', desc: 'إدارة الطلاب والكباتن والموظفين' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-navy mb-1">أهلاً، {user?.full_name}</h1>
      <p className="text-muted mb-6">نظرة عامة على المنصة</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="card hover:border-primary transition">
            <div className="text-lg font-bold text-navy">{c.title}</div>
            <div className="text-sm text-muted mt-1">{c.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
