import type { AxiosInstance } from 'axios';
import {
  ENDPOINTS,
  type ApiSuccess,
  type DriverDocument,
  type DriverProfile,
  type Vehicle,
  type VehiclePayload,
} from '@rafeeq/shared';
import { unwrap } from './client';

export class DriverApi {
  constructor(private http: AxiosInstance) {}

  async getProfile(): Promise<DriverProfile> {
    const { data } = await this.http.get<ApiSuccess<DriverProfile>>(ENDPOINTS.driver.profile);
    return unwrap(data);
  }

  async updateProfile(payload: { national_id?: string }): Promise<DriverProfile> {
    const { data } = await this.http.patch<ApiSuccess<DriverProfile>>(
      ENDPOINTS.driver.profile,
      payload,
    );
    return unwrap(data);
  }

  /**
   * Upload a document. `file` shape differs per platform:
   *  - web: a File/Blob
   *  - native: { uri, name, type }
   */
  async uploadDocument(type: string, file: unknown, expiresAt?: string): Promise<DriverDocument> {
    const form = new FormData();
    form.append('type', type);
    form.append('file', file as Blob);
    if (expiresAt) form.append('expires_at', expiresAt);

    const { data } = await this.http.post<ApiSuccess<DriverDocument>>(
      ENDPOINTS.driver.documents,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return unwrap(data);
  }

  async submitForReview(): Promise<DriverProfile> {
    const { data } = await this.http.post<ApiSuccess<DriverProfile>>(ENDPOINTS.driver.submit);
    return unwrap(data);
  }

  async listVehicles(): Promise<Vehicle[]> {
    const { data } = await this.http.get<ApiSuccess<Vehicle[]>>(ENDPOINTS.driver.vehicles);
    return unwrap(data);
  }

  async addVehicle(payload: VehiclePayload): Promise<Vehicle> {
    const { data } = await this.http.post<ApiSuccess<Vehicle>>(
      ENDPOINTS.driver.vehicles,
      payload,
    );
    return unwrap(data);
  }
}
