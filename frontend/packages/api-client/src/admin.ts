import type { AxiosInstance } from 'axios';
import {
  ENDPOINTS,
  type ApiSuccess,
  type DriverDocument,
  type DriverProfile,
  type User,
} from '@rafeeq/shared';
import { unwrap } from './client';

export interface ListParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  type?: string;
}

/** Admin/staff API surface (requires staff token + permissions). */
export class AdminApi {
  constructor(private http: AxiosInstance) {}

  async listUsers(params: ListParams = {}): Promise<{ items: User[]; meta: ApiSuccess<User[]>['meta'] }> {
    const { data } = await this.http.get<ApiSuccess<User[]>>(ENDPOINTS.admin.users, { params });
    return { items: data.data, meta: data.meta };
  }

  async listDrivers(params: ListParams = {}): Promise<{ items: DriverProfile[]; meta: ApiSuccess<DriverProfile[]>['meta'] }> {
    const { data } = await this.http.get<ApiSuccess<DriverProfile[]>>(ENDPOINTS.admin.drivers, { params });
    return { items: data.data, meta: data.meta };
  }

  async getDriver(id: string): Promise<DriverProfile> {
    const { data } = await this.http.get<ApiSuccess<DriverProfile>>(ENDPOINTS.admin.driver(id));
    return unwrap(data);
  }

  async reviewDriver(id: string, action: 'approve' | 'reject' | 'suspend', note?: string): Promise<DriverProfile> {
    const { data } = await this.http.post<ApiSuccess<DriverProfile>>(ENDPOINTS.admin.reviewDriver(id), {
      action,
      note,
    });
    return unwrap(data);
  }

  async reviewDocument(docId: string, approve: boolean, note?: string): Promise<DriverDocument> {
    const { data } = await this.http.post<ApiSuccess<DriverDocument>>(ENDPOINTS.admin.reviewDocument(docId), {
      approve,
      note,
    });
    return unwrap(data);
  }

  /** Fetch a private document (with auth) and return an object URL for preview. */
  async documentObjectUrl(docId: string): Promise<string> {
    const res = await this.http.get(ENDPOINTS.admin.documentFile(docId), { responseType: 'blob' });
    return URL.createObjectURL(res.data as Blob);
  }
}
