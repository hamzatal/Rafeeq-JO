import { useRouter } from 'expo-router';
import { ForgotPasswordScreen } from '@rafeeq/ui';
import { api } from '../../src/lib/api';

export default function ForgotPassword() {
  const router = useRouter();
  const toLogin = () => router.replace('/(auth)/login');

  return <ForgotPasswordScreen api={api} onReset={toLogin} onHaveAccount={toLogin} />;
}
