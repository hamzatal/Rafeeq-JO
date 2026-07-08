import type { AxiosInstance } from 'axios';
import { ENDPOINTS, type AdBanner, type AdPlacement, type ApiSuccess } from '@rafeeq/shared';
import { unwrap } from './client';

export interface AdBannerPayload {
  title: string;
  image_url: string;
  link_url?: string | null;
  placement: AdPlacement;
  is_active?: boolean;
  sort_order?: number;
  starts_at?: string | null;
  ends_at?: string | null;
}

/** In-app advertising banners: public placement feed + admin management. */
export class AdsApi {
  constructor(private http: AxiosInstance) {}

  /** Live banners for a placement slot (mobile apps render these). */
  async active(placement: AdPlacement): Promise<AdBanner[]> {
    const { data } = await this.http.get<ApiSuccess<AdBanner[]>>(ENDPOINTS.ads, { params: { placement } });
    return unwrap(data);
  }

  // ── Admin ──────────────────────────────────────────────────────
  async adminList(placement?: AdPlacement): Promise<AdBanner[]> {
    const { data } = await this.http.get<ApiSuccess<AdBanner[]>>(ENDPOINTS.admin.ads, {
      params: placement ? { placement } : undefined,
    });
    return unwrap(data);
  }

  async create(payload: AdBannerPayload): Promise<AdBanner> {
    const { data } = await this.http.post<ApiSuccess<AdBanner>>(ENDPOINTS.admin.ads, payload);
    return unwrap(data);
  }

  async update(id: string, payload: Partial<AdBannerPayload>): Promise<AdBanner> {
    const { data } = await this.http.patch<ApiSuccess<AdBanner>>(ENDPOINTS.admin.ad(id), payload);
    return unwrap(data);
  }

  async remove(id: string): Promise<void> {
    await this.http.delete(ENDPOINTS.admin.ad(id));
  }
}
