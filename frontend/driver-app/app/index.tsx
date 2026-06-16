import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../src/store/auth';
import { theme } from '../src/theme';

export default function Index() {
  const status = useAuth((s) => s.status);

  if (status === 'idle') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return <Redirect href={status === 'authenticated' ? '/(app)/dashboard' : '/(auth)/welcome'} />;
}
