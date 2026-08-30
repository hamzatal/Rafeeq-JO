import { useRouter } from 'expo-router';
import { WelcomeScreen } from '@rafeeq/ui';

export default function Welcome() {
  const router = useRouter();

  return (
    <WelcomeScreen
      logo={require('../../assets/r-logo.png')}
      taglineKey="auth.welcomeSubtitle"
      onRegister={() => router.push('/(auth)/register')}
      onLogin={() => router.push('/(auth)/login')}
    />
  );
}
