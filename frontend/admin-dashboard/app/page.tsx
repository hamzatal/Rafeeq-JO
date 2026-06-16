'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../src/lib/auth';
import { BrandSplash } from '../src/components/BrandSplash';

export default function Home() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') router.replace('/dashboard');
    else if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  return <BrandSplash />;
}
