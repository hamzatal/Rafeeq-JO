import type { AxiosInstance } from 'axios';
import { ENDPOINTS, type ApiSuccess, type AppConfig } from '@rafeeq/shared';
import { unwrap } from './client';

/** Public bootstrap config (maps key, feature flags) — no auth required. */
export class ConfigApi {
  constructor(private http: AxiosInstance) {}

  async get(): Promise<AppConfig> {
    const { data } = await this.http.get<ApiSuccess<AppConfig>>(ENDPOINTS.config);
    return unwrap(data);
  }
}
