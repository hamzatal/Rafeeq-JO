import type { AxiosInstance } from 'axios';
import { ENDPOINTS, type ApiSuccess, type Parcel, type ParcelSize } from '@rafeeq/shared';
import { unwrap } from './client';

export interface CreateParcelInput {
  receiver_name: string;
  receiver_phone: string;
  from_address?: string;
  to_address?: string;
  category?: string;
  size: ParcelSize;
  description?: string;
}

/** Parcel delivery (two-OTP chain of custody). */
export class ParcelsApi {
  constructor(private http: AxiosInstance) {}

  async mine(): Promise<Parcel[]> {
    const { data } = await this.http.get<ApiSuccess<Parcel[]>>(ENDPOINTS.parcels.mine);
    return unwrap(data);
  }

  async create(input: CreateParcelInput): Promise<Parcel> {
    const { data } = await this.http.post<ApiSuccess<Parcel>>(ENDPOINTS.parcels.create, input);
    return unwrap(data);
  }

  async show(id: string): Promise<Parcel> {
    const { data } = await this.http.get<ApiSuccess<Parcel>>(ENDPOINTS.parcels.one(id));
    return unwrap(data);
  }

  async cancel(id: string): Promise<Parcel> {
    const { data } = await this.http.post<ApiSuccess<Parcel>>(ENDPOINTS.parcels.cancel(id));
    return unwrap(data);
  }

  // Courier
  async available(): Promise<Parcel[]> {
    const { data } = await this.http.get<ApiSuccess<Parcel[]>>(ENDPOINTS.parcels.courierAvailable);
    return unwrap(data);
  }

  async accept(id: string): Promise<Parcel> {
    const { data } = await this.http.post<ApiSuccess<Parcel>>(ENDPOINTS.parcels.courierAccept(id));
    return unwrap(data);
  }

  async pickup(id: string, code: string, lat?: number, lng?: number): Promise<Parcel> {
    const { data } = await this.http.post<ApiSuccess<Parcel>>(ENDPOINTS.parcels.courierPickup(id), { code, lat, lng });
    return unwrap(data);
  }

  async deliver(id: string, code: string, lat?: number, lng?: number): Promise<Parcel> {
    const { data } = await this.http.post<ApiSuccess<Parcel>>(ENDPOINTS.parcels.courierDeliver(id), { code, lat, lng });
    return unwrap(data);
  }
}
