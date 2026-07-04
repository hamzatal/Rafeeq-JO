import { Platform } from 'react-native';

/**
 * Safe location + notification permission helpers.
 *
 * Every function lazy-loads the native module and is wrapped so a missing
 * module / simulator NEVER throws — matching Rafeeq's resilience policy.
 * On WEB we use the browser Geolocation API so the map can still show the
 * user's REAL position during development / web preview.
 */

export type PermState = 'granted' | 'denied' | 'unavailable';
export type Coords = { lat: number; lng: number };

/** ── Web Geolocation bridge (used on Platform.OS === 'web') ──────────── */
function webGetPosition(): Promise<Coords | null> {
  return new Promise((resolve) => {
    try {
      if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
      );
    } catch {
      resolve(null);
    }
  });
}

/** Current foreground location permission, without prompting. */
export async function getLocationState(): Promise<PermState> {
  try {
    if (Platform.OS === 'web') {
      const anyNav = navigator as any;
      if (anyNav?.permissions?.query) {
        const st = await anyNav.permissions.query({ name: 'geolocation' });
        return st.state === 'granted' ? 'granted' : st.state === 'denied' ? 'denied' : 'unavailable';
      }
      return 'unavailable';
    }
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
    if (Platform.OS === 'web') {
      const pos = await webGetPosition();
      return pos !== null;
    }
    const Location = await import('expo-location');
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Best-effort current coordinates, or null. Never throws.
 * PROACTIVELY requests permission if not yet granted, and supports web — so
 * the captain's live position shows on the map immediately.
 */
export async function getCurrentLocation(): Promise<Coords | null> {
  try {
    if (Platform.OS === 'web') return await webGetPosition();
    const Location = await import('expo-location');
    let perm = await Location.getForegroundPermissionsAsync();
    if (perm.status !== 'granted' && perm.canAskAgain !== false) {
      perm = await Location.requestForegroundPermissionsAsync();
    }
    if (perm.status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}

/**
 * Subscribe to live location updates. Returns an unsubscribe function.
 * Fires immediately with the current position, then on movement.
 */
export function watchLocation(onUpdate: (c: Coords) => void): () => void {
  let cancelled = false;
  let cleanup: (() => void) | null = null;

  (async () => {
    try {
      if (Platform.OS === 'web') {
        if (typeof navigator === 'undefined' || !navigator.geolocation) return;
        const id = navigator.geolocation.watchPosition(
          (pos) => !cancelled && onUpdate({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => undefined,
          { enableHighAccuracy: true, maximumAge: 5000 },
        );
        cleanup = () => navigator.geolocation.clearWatch(id);
        return;
      }
      const Location = await import('expo-location');
      let perm = await Location.getForegroundPermissionsAsync();
      if (perm.status !== 'granted' && perm.canAskAgain !== false) {
        perm = await Location.requestForegroundPermissionsAsync();
      }
      if (perm.status !== 'granted') return;
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 15, timeInterval: 4000 },
        (pos) => !cancelled && onUpdate({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      );
      cleanup = () => sub.remove();
    } catch {
      /* ignore */
    }
  })();

  return () => {
    cancelled = true;
    cleanup?.();
  };
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
