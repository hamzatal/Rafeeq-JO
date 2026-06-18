import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/store/auth';
import { BrandSplash } from '../src/components/BrandSplash';

/** Entry gate: branded splash, then route based on auth status. */
export default function Index() {
  const status = useAuth((s) => s.status);
  const [minTimePassed, setMinTimePassed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimePassed(true), 1600);
    return () => clearTimeout(timer);
  }, []);

  const booting = status === 'idle' || status === 'loading';

  if (booting || !minTimePassed) {
    return <BrandSplash />;
  }

  return <Redirect href={status === 'authenticated' ? '/(app)/portal' : '/(auth)/welcome'} />;
}
