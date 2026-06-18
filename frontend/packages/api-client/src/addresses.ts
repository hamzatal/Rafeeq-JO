import type { AxiosInstance } from 'axios';
import { ENDPOINTS, type ApiSuccess, type SavedAddress } from '@rafeeq/shared';
import { unwrap } from './client';

/** Student saved addresses (Home / University / custom). */
export class AddressApi {
  constructor(private http: AxiosInstance) {}

  async list(): Promise<SavedAddress[]> {
    const { data } = await this.http.get<ApiSuccess<SavedAddress[]>>(ENDPOINTS.student.addresses);
    return unwrap(data);
  }

  async create(payload: Partial<SavedAddress> & { address_text: string }): Promise<SavedAddress> {
    const { data } = await this.http.post<ApiSuccess<SavedAddress>>(ENDPOINTS.student.addresses, payload);
    return unwrap(data);
  }

  async update(id: string, payload: Partial<SavedAddress>): Promise<SavedAddress> {
    const { data } = await this.http.patch<ApiSuccess<SavedAddress>>(ENDPOINTS.student.address(id), payload);
    return unwrap(data);
  }

  async remove(id: string): Promise<void> {
    await this.http.delete(ENDPOINTS.student.address(id));
  }

  async setDefault(id: string): Promise<SavedAddress> {
    const { data } = await this.http.post<ApiSuccess<SavedAddress>>(ENDPOINTS.student.addressDefault(id));
    return unwrap(data);
  }
}
