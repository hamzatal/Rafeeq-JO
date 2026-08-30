import { useRouter } from 'expo-router';
import { IntroCarousel, type IntroSlide } from '@rafeeq/ui';
import { usePrefs } from '../../src/store/prefs';

/** What a CAPTAIN is promised: nearby requests, real earnings, their own car. */
const SLIDES: IntroSlide[] = [
  { icon: 'map-pin', titleKey: 'onboarding.d1Title', bodyKey: 'onboarding.d1Body' },
  { icon: 'credit-card', titleKey: 'onboarding.d2Title', bodyKey: 'onboarding.d2Body' },
  { icon: 'truck', titleKey: 'onboarding.d3Title', bodyKey: 'onboarding.d3Body' },
];

export default function Intro() {
  const router = useRouter();
  const setIntroSeen = usePrefs((st) => st.setIntroSeen);

  const skip = async () => {
    await setIntroSeen();
    router.replace('/(auth)/welcome');
  };

  return <IntroCarousel slides={SLIDES} onSkip={() => void skip()} onDone={() => router.replace('/(onboarding)/permissions')} />;
}
