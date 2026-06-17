import type { AxiosInstance } from 'axios';
import {
  ENDPOINTS,
  type ApiSuccess,
  type AppNotification,
  type NotificationPreference,
} from '@rafeeq/shared';
import { unwrap } from './client';

/** In-app notifications + push device registration + preferences. */
export class NotificationsApi {
  constructor(private http: AxiosInstance) {}

  async list(params: { unread?: boolean; category?: string; page?: number } = {}): Promise<AppNotification[]> {
    const { data } = await this.http.get<ApiSuccess<AppNotification[]>>(ENDPOINTS.notifications.list, { params });
    return unwrap(data);
  }

  async unreadCount(): Promise<number> {
    const { data } = await this.http.get<ApiSuccess<{ unread_count: number }>>(ENDPOINTS.notifications.unreadCount);
    return unwrap(data).unread_count;
  }

  async markRead(id: string): Promise<AppNotification> {
    const { data } = await this.http.post<ApiSuccess<AppNotification>>(ENDPOINTS.notifications.read(id));
    return unwrap(data);
  }

  async markAllRead(): Promise<number> {
    const { data } = await this.http.post<ApiSuccess<{ marked: number }>>(ENDPOINTS.notifications.readAll);
    return unwrap(data).marked;
  }

  async preferences(): Promise<NotificationPreference> {
    const { data } = await this.http.get<ApiSuccess<NotificationPreference>>(ENDPOINTS.notifications.preferences);
    return unwrap(data);
  }

  async updatePreferences(prefs: Partial<NotificationPreference>): Promise<NotificationPreference> {
    const { data } = await this.http.patch<ApiSuccess<NotificationPreference>>(ENDPOINTS.notifications.preferences, prefs);
    return unwrap(data);
  }

  async registerDevice(token: string, platform: 'android' | 'ios' | 'web' = 'android'): Promise<void> {
    await this.http.post(ENDPOINTS.notifications.devices, { token, platform });
  }

  async unregisterDevice(token: string): Promise<void> {
    await this.http.delete(ENDPOINTS.notifications.devices, { data: { token } });
  }
}
