import { Platform } from 'react-native';

/**
 * Safe permission helpers for the captain onboarding "priming" screens.
 * Lazy-load native modules and never throw (web / simulator / missing module
 * → graceful 'unavailable'). Matches Rafeeq's resilience policy.
 */

export type PermState = 'granted' | 'denied' | 'unavailable';

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
