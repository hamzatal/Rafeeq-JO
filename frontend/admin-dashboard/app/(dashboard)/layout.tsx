'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../src/lib/auth';
import { PendingProvider } from '../../src/lib/pending';
import { Sidebar } from '../../src/components/Sidebar';
import { Topbar } from '../../src/components/Topbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  if (status !== 'authenticated') {
    // No splash screen — a minimal, neutral loading indicator while the
    // session is validated (or until the redirect to /login kicks in).
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark:bg-dbg">
        <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <PendingProvider>
      <div className="min-h-screen bg-background dark:bg-dbg">
        <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
        {/* Sidebar is a fixed drawer: off-canvas on mobile, pinned (w-64) on lg+.
            Offset the main column only from lg up so it flips with dir. */}
        <div className="lg:ms-64 min-h-screen flex flex-col">
          <Topbar onMenu={() => setNavOpen((o) => !o)} />
          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </PendingProvider>
  );
}
