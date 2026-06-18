import type { AxiosInstance } from 'axios';
import { ENDPOINTS, type ApiSuccess, type Zone } from '@rafeeq/shared';
import { unwrap } from './client';

export interface ZonePayload {
  name_ar: string;
  name_en: string;
  city?: string | null;
  center_lat: number;
  center_lng: number;
  radius_km?: number;
  /** Optional polygon geofence: array of [lat, lng] vertices (min 3). */
  boundary?: Array<[number, number]> | null;
  is_active?: boolean;
}

/** Admin zones management — radius circles and polygon geofences. */
export class ZonesApi {
  constructor(private http: AxiosInstance) {}

  async list(): Promise<Zone[]> {
    const { data } = await this.http.get<ApiSuccess<Zone[]>>(ENDPOINTS.zones);
    return unwrap(data);
  }

  async create(payload: ZonePayload): Promise<Zone> {
    const { data } = await this.http.post<ApiSuccess<Zone>>(ENDPOINTS.admin.zones, payload);
    return unwrap(data);
  }

  async update(id: string, payload: Partial<ZonePayload>): Promise<Zone> {
    const { data } = await this.http.patch<ApiSuccess<Zone>>(ENDPOINTS.admin.zone(id), payload);
    return unwrap(data);
  }

  async remove(id: string): Promise<void> {
    await this.http.delete(ENDPOINTS.admin.zone(id));
  }
}
