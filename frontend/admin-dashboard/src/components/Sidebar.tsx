'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/auth';

const LINKS = [
  { href: '/', label: 'الرئيسية' },
  { href: '/drivers', label: 'الكباتن' },
  { href: '/universities', label: 'الجامعات' },
  { href: '/users', label: 'المستخدمون' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="w-60 shrink-0 bg-navy text-white min-h-screen flex flex-col">
      <div className="p-5 border-b border-white/10">
        <div className="text-2xl font-extrabold text-gold">رفيق</div>
        <div className="text-xs text-white/60 mt-1">لوحة الإدارة</div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {LINKS.map((l) => {
          const active = pathname === l.href || pathname.startsWith(l.href + '/');
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                active ? 'bg-white/10 text-gold' : 'text-white/80 hover:bg-white/5'
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10">
        <div className="px-3 py-2 text-sm text-white/70 truncate">{user?.full_name}</div>
        <button onClick={logout} className="w-full text-right rounded-lg px-3 py-2 text-sm text-red-300 hover:bg-white/5">
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}
