'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../src/lib/auth';
import { Sidebar } from '../../src/components/Sidebar';
import { Topbar } from '../../src/components/Topbar';

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
      <div className="min-h-screen flex items-center justify-center bg-background dark:bg-dbg">
        <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark:bg-dbg">
      <Sidebar />
      {/* sidebar is fixed (w-64) on the leading side; offset main with logical margin so it flips with dir */}
      <div className="ms-64 min-h-screen flex flex-col">
        <Topbar />
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
