import type { AxiosInstance } from 'axios';
import {
  ENDPOINTS,
  type ApiSuccess,
  type FareQuote,
  type RideRequest,
  type RideType,
} from '@rafeeq/shared';
import { unwrap } from './client';

export interface CreateRideRequestInput {
  university_id: string;
  pickup_lat: number;
  pickup_lng: number;
  pickup_address?: string;
  desired_time: string;
  type?: RideType;
  notes?: string;
  coupon_code?: string;
}

export interface EstimateInput {
  type?: RideType;
  riders?: number;
  capacity?: number;
  base_fare_fils?: number;
}

/** Door-to-door pooling ride requests + fare estimate. */
export class RideRequestsApi {
  constructor(private http: AxiosInstance) {}

  async estimate(input: EstimateInput): Promise<FareQuote> {
    const { data } = await this.http.post<ApiSuccess<FareQuote>>(ENDPOINTS.rideRequests.estimate, input);
    return unwrap(data);
  }

  async create(input: CreateRideRequestInput): Promise<RideRequest> {
    const { data } = await this.http.post<ApiSuccess<RideRequest>>(ENDPOINTS.rideRequests.create, input);
    return unwrap(data);
  }

  async mine(): Promise<RideRequest[]> {
    const { data } = await this.http.get<ApiSuccess<RideRequest[]>>(ENDPOINTS.rideRequests.mine);
    return unwrap(data);
  }

  async cancel(id: string): Promise<RideRequest> {
    const { data } = await this.http.post<ApiSuccess<RideRequest>>(ENDPOINTS.rideRequests.cancel(id));
    return unwrap(data);
  }
}
