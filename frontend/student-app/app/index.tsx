import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/store/auth';
import { usePrefs } from '../src/store/prefs';
import { BrandSplash } from '@rafeeq/ui';
import { useI18n } from '../src/i18n';

/** Entry gate: splash → onboarding (first run) → auth-based routing. */
export default function Index() {
  const { t } = useI18n();
  const status = useAuth((s) => s.status);
  const introSeen = usePrefs((s) => s.introSeen);
  const [minTimePassed, setMinTimePassed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimePassed(true), 1600);
    return () => clearTimeout(timer);
  }, []);

  const booting = status === 'idle';

  if (booting || !minTimePassed) {
    /* Decision 15: light for the student, dark for the captain. */
    return <BrandSplash tone="light" wordmark={t('common.appName')} slogan={t('brand.splashSlogan')} />;
  }

  // First run: show the intro + permission priming before auth.
  if (!introSeen && status !== 'authenticated') {
    return <Redirect href="/(onboarding)/intro" />;
  }

  return <Redirect href={status === 'authenticated' ? '/(app)/home' : '/(auth)/welcome'} />;
}
