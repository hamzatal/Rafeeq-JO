import { Platform } from 'react-native';

/**
 * Safe permission helpers for onboarding "priming" screens.
 *
 * Every function lazy-loads the native module and is wrapped so a missing
 * module / web / simulator NEVER throws — matching Rafeeq's resilience policy.
 * Returns a boolean "granted" so the UI can reflect state without crashing.
 */

export type PermState = 'granted' | 'denied' | 'unavailable';

/** Current foreground location permission, without prompting. */
export async function getLocationState(): Promise<PermState> {
  try {
    if (Platform.OS === 'web') return 'unavailable';
    const Location = await import('expo-location');
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'unavailable';
  }
}

/** Prompt for foreground location. Returns true when granted. */
export async function requestLocation(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') return false;
    const Location = await import('expo-location');
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/** Best-effort current coordinates, or null. Never throws. */
export async function getCurrentLocation(): Promise<{ lat: number; lng: number } | null> {
  try {
    if (Platform.OS === 'web') return null;
    const Location = await import('expo-location');
    const perm = await Location.getForegroundPermissionsAsync();
    if (perm.status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({});
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}

/** Current notification permission, without prompting. */
export async function getNotificationState(): Promise<PermState> {
  try {
    if (Platform.OS === 'web') return 'unavailable';
    const Notifications = await import('expo-notifications');
    const current = await Notifications.getPermissionsAsync();
    return current.granted ? 'granted' : 'denied';
  } catch {
    return 'unavailable';
  }
}

/** Prompt for notifications. Returns true when granted. */
export async function requestNotifications(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') return false;
    const Notifications = await import('expo-notifications');
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch {
    return false;
  }
}
