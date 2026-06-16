import type { AxiosInstance } from 'axios';
import { ENDPOINTS, type ApiSuccess, type University } from '@rafeeq/shared';
import { unwrap } from './client';

/** Public catalog data available to authenticated users (e.g. universities). */
export class CatalogApi {
  constructor(private http: AxiosInstance) {}

  async listUniversities(): Promise<University[]> {
    const { data } = await this.http.get<ApiSuccess<University[]>>(ENDPOINTS.universities.list);
    return unwrap(data);
  }
}
