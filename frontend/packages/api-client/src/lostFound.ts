import type { AxiosInstance } from 'axios';
import { ENDPOINTS, type ApiSuccess, type LostFoundItem, type LostFoundType } from '@rafeeq/shared';
import { unwrap } from './client';

export interface ReportLostFoundInput {
  type: LostFoundType;
  category?: string;
  title: string;
  description?: string;
  location?: string;
  trip_id?: string;
}

/** Lost & Found board. */
export class LostFoundApi {
  constructor(private http: AxiosInstance) {}

  async list(params: { type?: LostFoundType; category?: string } = {}): Promise<LostFoundItem[]> {
    const { data } = await this.http.get<ApiSuccess<LostFoundItem[]>>(ENDPOINTS.lostFound.list, { params });
    return unwrap(data);
  }

  async mine(): Promise<LostFoundItem[]> {
    const { data } = await this.http.get<ApiSuccess<LostFoundItem[]>>(ENDPOINTS.lostFound.mine);
    return unwrap(data);
  }

  async report(input: ReportLostFoundInput): Promise<LostFoundItem> {
    const { data } = await this.http.post<ApiSuccess<LostFoundItem>>(ENDPOINTS.lostFound.report, input);
    return unwrap(data);
  }

  async candidates(id: string): Promise<LostFoundItem[]> {
    const { data } = await this.http.get<ApiSuccess<LostFoundItem[]>>(ENDPOINTS.lostFound.candidates(id));
    return unwrap(data);
  }

  async resolve(id: string, matchedWith?: string): Promise<LostFoundItem> {
    const { data } = await this.http.post<ApiSuccess<LostFoundItem>>(ENDPOINTS.lostFound.resolve(id), { matched_with: matchedWith });
    return unwrap(data);
  }
}
