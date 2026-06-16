import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../src/store/auth';

export default function AppLayout() {
  const status = useAuth((s) => s.status);

  if (status === 'unauthenticated') {
    return <Redirect href="/(auth)/welcome" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
