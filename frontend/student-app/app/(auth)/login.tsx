import { useRouter } from 'expo-router';
import { LoginScreen } from '@rafeeq/ui';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/store/auth';

export default function Login() {
  const router = useRouter();
  const login = useAuth((a) => a.login);

  return (
    <LoginScreen
      api={api}
      subtitleKey="auth.studentSigninSub"
      login={login}
      onAuthenticated={() => router.replace('/(app)/home')}
      onOtpRequested={(phone, debug) =>
        router.push({ pathname: '/(auth)/otp', params: { phone, purpose: 'login', debug } })
      }
      onForgotPassword={() => router.push('/(auth)/forgot-password')}
      onRegister={() => router.push('/(auth)/register')}
    />
  );
}
