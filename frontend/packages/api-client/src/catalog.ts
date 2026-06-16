import type { AxiosInstance } from 'axios';
import { ENDPOINTS, type ApiSuccess, type Route, type University } from '@rafeeq/shared';
import { unwrap } from './client';

/** Public catalog data available to authenticated users (e.g. universities). */
export class CatalogApi {
  constructor(private http: AxiosInstance) {}

  async listUniversities(): Promise<University[]> {
    const { data } = await this.http.get<ApiSuccess<University[]>>(ENDPOINTS.universities.list);
    return unwrap(data);
  }

  async listRoutes(universityId?: string): Promise<Route[]> {
    const { data } = await this.http.get<ApiSuccess<Route[]>>(ENDPOINTS.routes.list, {
      params: { university_id: universityId },
    });
    return unwrap(data);
  }
}
