import { useRouter } from 'expo-router';
import { PermissionsGate } from '@rafeeq/ui';
import { usePrefs } from '../../src/store/prefs';

export default function Permissions() {
  const router = useRouter();
  const setIntroSeen = usePrefs((st) => st.setIntroSeen);

  const finish = async () => {
    await setIntroSeen();
    router.replace('/(auth)/welcome');
  };

  return <PermissionsGate audience="driver" onDone={() => void finish()} />;
}
