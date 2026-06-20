import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/store/auth';
import { usePrefs } from '../src/store/prefs';
import { BrandSplash } from '../src/components/BrandSplash';

/** Entry gate: splash → onboarding (first run) → auth-based routing. */
export default function Index() {
  const status = useAuth((s) => s.status);
  const introSeen = usePrefs((s) => s.introSeen);
  const [minTimePassed, setMinTimePassed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimePassed(true), 1600);
    return () => clearTimeout(timer);
  }, []);

  const booting = status === 'idle' || status === 'loading';

  if (booting || !minTimePassed) {
    return <BrandSplash />;
  }

  // First run: show the intro + permission priming before auth.
  if (!introSeen && status !== 'authenticated') {
    return <Redirect href="/(onboarding)/intro" />;
  }

  return <Redirect href={status === 'authenticated' ? '/(app)/home' : '/(auth)/welcome'} />;
}
