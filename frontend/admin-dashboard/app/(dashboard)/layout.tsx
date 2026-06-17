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
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 max-w-6xl">
        <Topbar />
        {children}
      </main>
    </div>
  );
}
