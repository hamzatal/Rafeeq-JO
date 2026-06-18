'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../src/lib/auth';
import { Sidebar } from '../../src/components/Sidebar';
import { Topbar } from '../../src/components/Topbar';
import { BrandSplash } from '../../src/components/BrandSplash';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  if (status !== 'authenticated') {
    return <BrandSplash />;
  }

  return (
    <div className="min-h-screen bg-background dark:bg-dbg">
      <Sidebar />
      {/* sidebar is fixed (w-64) on the right in RTL → offset main with mr-64 */}
      <div className="mr-64 min-h-screen flex flex-col">
        <Topbar />
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
