import { useRouter } from 'expo-router';
import { WelcomeScreen } from '@rafeeq/ui';

export default function Welcome() {
  const router = useRouter();

  return (
    <WelcomeScreen
      logo={require('../../assets/r-logo.png')}
      /* The two apps ship under one brand, so a captain who downloaded the rider
         app should find out here rather than after creating an account. */
      badge="كابتن"
      taglineKey="auth.captainSignupSub"
      onRegister={() => router.push('/(auth)/register')}
      onLogin={() => router.push('/(auth)/login')}
    />
  );
}
