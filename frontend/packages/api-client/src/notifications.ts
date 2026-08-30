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

  /**
   * One page of the inbox, plus the total unread count and the pagination meta.
   *
   * ── What this used to throw away ───────────────────────────────────────────
   *
   * `unwrap(data)` returned only `data`, discarding a `meta` that the endpoint has
   * always sent: `unread_count` for the whole inbox, and Laravel's paginator meta.
   *
   * Both losses were visible. The inbox inferred "is anything unread" from the twenty
   * rows it happened to have loaded, so a student with thirty unread notifications and
   * twenty read ones on page one saw no «تحديد الكل كمقروء» button; and nothing
   * anywhere could render a badge, because no screen held a number. The paginator meta
   * meant the app showed the first page and had no way to ask for the second — the
   * `page` parameter existed on this method and no caller could tell there was one.
   */
  async list(
    params: { unread?: boolean; category?: string; page?: number; per_page?: number } = {},
  ): Promise<{ items: AppNotification[]; unreadCount: number; hasMore: boolean }> {
    const { data } = await this.http.get<
      ApiSuccess<AppNotification[]> & { meta?: { unread_count?: number; current_page?: number; last_page?: number } }
    >(ENDPOINTS.notifications.list, { params });

    const meta = data.meta ?? {};

    return {
      items: unwrap(data),
      unreadCount: meta.unread_count ?? 0,
      hasMore: (meta.current_page ?? 1) < (meta.last_page ?? 1),
    };
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
