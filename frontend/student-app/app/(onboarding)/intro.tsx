import { useRouter } from 'expo-router';
import { IntroCarousel, type IntroSlide } from '@rafeeq/ui';
import { usePrefs } from '../../src/store/prefs';

/** What a STUDENT is promised: pooling, a known pickup, and who is driving. */
const SLIDES: IntroSlide[] = [
  { icon: 'navigation', titleKey: 'onboarding.s1Title', bodyKey: 'onboarding.s1Body' },
  { icon: 'map-pin', titleKey: 'onboarding.s2Title', bodyKey: 'onboarding.s2Body' },
  { icon: 'shield', titleKey: 'onboarding.s3Title', bodyKey: 'onboarding.s3Body' },
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
