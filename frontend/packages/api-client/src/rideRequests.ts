import type { AxiosInstance } from 'axios';
import {
  ENDPOINTS,
  type ApiSuccess,
  type FareQuote,
  type RideRequest,
  type RideType,
  type RideDirection,
  type PaymentMethod,
} from '@rafeeq/shared';
import { unwrap } from './client';

export interface CreateRideRequestInput {
  university_id: string;
  pickup_lat: number;
  pickup_lng: number;
  pickup_address?: string;
  desired_time: string;
  type?: RideType;
  direction?: RideDirection;
  /**
   * The whole car instead of a seat in it.
   *
   * The API has accepted a whole-car TARIFF since phase 5 and `/estimate` returns
   * `solo_fare_fils`, so the app could show the price — and had no way to order it.
   * A price quoted for something unbuyable is worse than no price: it sits in the
   * same list, with the same confidence, as the product that works.
   */
  is_solo?: boolean;
  /**
   * Cash or wallet, chosen BEFORE a captain is matched.
   *
   * The backend has validated this field all along; this client never sent it, so
   * every request silently defaulted to `wallet` and the captain saw the default
   * rather than the rider's choice. A captain who cannot take cash today should be
   * able to decline the offer knowingly instead of discovering it at the pickup.
   */
  payment_method?: PaymentMethod;
  notes?: string;
  coupon_code?: string;
}

/**
 * `pickup_lat`, `pickup_lng` and `university_id` are what make a quote possible.
 *
 * They read as optional and are typed that way because the endpoint accepts partial
 * input, but omitting them now guarantees an `unpriced_corridor` answer with no fare:
 * a seat price is a property of the (zone × university) pair, and there is no longer
 * any distance fallback to synthesise one from.
 */
export interface EstimateInput {
  type?: RideType;
  riders?: number;
  capacity?: number;
  pickup_lat?: number;
  pickup_lng?: number;
  university_id?: string;
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
