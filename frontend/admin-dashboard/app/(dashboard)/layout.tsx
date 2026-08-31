'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../src/lib/auth';
import { Sidebar } from '../../src/components/Sidebar';
import { Topbar } from '../../src/components/Topbar';
import { BadgeProvider } from '../../src/lib/badges';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  if (status !== 'authenticated') {
    // No splash screen — a minimal, neutral loading indicator while the
    // session is validated (or until the redirect to /login kicks in).
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <BadgeProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        {/* The sidebar is fixed at 216px (`.admin aside{width:216px}`); the offset is a
            LOGICAL margin so it flips with `dir` rather than pinning to the left. */}
        <div className="ms-[216px] min-h-screen flex flex-col">
          <Topbar />
          {/* `.acont{padding:18px 20px}` — the reference is tighter than `p-6 lg:p-8`, and
              on a 1280 canvas those extra 12–24px are a table column. */}
          <main className="flex-1 px-5 py-[18px]">{children}</main>
        </div>
      </div>
    </BadgeProvider>
  );
}
