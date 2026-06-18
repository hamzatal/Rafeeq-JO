import Constants from 'expo-constants';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

/**
 * Live tracking over Laravel Reverb (Pusher protocol).
 *
 * Configuration is read from app config `extra.reverb*`. When no Reverb key
 * is provided the client stays disabled and screens fall back to polling —
 * so the app works with or without a running Reverb server.
 *
 * Required app config (app.json -> expo.extra):
 *   reverbKey, reverbHost, reverbPort, reverbScheme ('ws' | 'wss')
 */
interface ReverbExtra {
  reverbKey?: string;
  reverbHost?: string;
  reverbPort?: number;
  reverbScheme?: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as ReverbExtra;

let echo: Echo<any> | null = null;

export function realtimeEnabled(): boolean {
  return !!extra.reverbKey;
}

function getEcho(): Echo<any> | null {
  if (!realtimeEnabled()) return null;
  if (!echo) {
    // laravel-echo needs Pusher on the global scope.
    (globalThis as unknown as { Pusher: typeof Pusher }).Pusher = Pusher;
    echo = new Echo({
      broadcaster: 'reverb',
      key: extra.reverbKey,
      wsHost: extra.reverbHost ?? 'localhost',
      wsPort: extra.reverbPort ?? 8080,
      wssPort: extra.reverbPort ?? 8080,
      forceTLS: (extra.reverbScheme ?? 'ws') === 'wss',
      enabledTransports: ['ws', 'wss'],
      disableStats: true,
    });
  }
  return echo;
}

export interface TripLocationEvent {
  tripId: string;
  lat: number;
  lng: number;
  speed: number | null;
  recordedAt: string;
}

/**
 * Subscribe to a trip's public channel. Returns an unsubscribe function.
 * No-ops (returns a noop unsubscribe) when realtime is not configured.
 */
export function subscribeToTrip(
  tripId: string,
  handlers: { onLocation?: (e: TripLocationEvent) => void; onStatus?: (status: string) => void },
): () => void {
  const client = getEcho();
  if (!client) return () => undefined;

  const channelName = `trip.${tripId}`;
  const channel = client.channel(channelName);

  if (handlers.onLocation) {
    channel.listen('.location.updated', (e: { tripId: string; lat: number; lng: number; speed: number | null; recordedAt: string }) =>
      handlers.onLocation?.({ tripId: e.tripId, lat: e.lat, lng: e.lng, speed: e.speed, recordedAt: e.recordedAt }),
    );
  }
  if (handlers.onStatus) {
    channel.listen('.status.changed', (e: { status: string }) => handlers.onStatus?.(e.status));
  }

  return () => {
    client.leaveChannel(`public-${channelName}`);
    client.leave(channelName);
  };
}
