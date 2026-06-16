import type { AxiosInstance } from 'axios';
import {
  ENDPOINTS,
  type ApiSuccess,
  type Subscription,
  type SubscriptionPlan,
  type Trip,
  type TripLocation,
  type TripPassenger,
} from '@rafeeq/shared';
import { unwrap } from './client';

/** Student-facing transport API: plans, subscriptions, trips. */
export class TransportApi {
  constructor(private http: AxiosInstance) {}

  async listPlans(params: { university_id?: string; route_id?: string } = {}): Promise<SubscriptionPlan[]> {
    const { data } = await this.http.get<ApiSuccess<SubscriptionPlan[]>>(ENDPOINTS.transport.plans, { params });
    return unwrap(data);
  }

  async mySubscriptions(): Promise<Subscription[]> {
    const { data } = await this.http.get<ApiSuccess<Subscription[]>>(ENDPOINTS.transport.subscriptions);
    return unwrap(data);
  }

  async subscribe(planId: string, routeId?: string): Promise<Subscription> {
    const { data } = await this.http.post<ApiSuccess<Subscription>>(ENDPOINTS.transport.subscriptions, {
      plan_id: planId,
      route_id: routeId,
    });
    return unwrap(data);
  }

  async cancelSubscription(id: string): Promise<void> {
    await this.http.post(ENDPOINTS.transport.cancelSubscription(id));
  }

  async availableTrips(routeId?: string): Promise<Trip[]> {
    const { data } = await this.http.get<ApiSuccess<Trip[]>>(ENDPOINTS.transport.availableTrips, {
      params: { route_id: routeId },
    });
    return unwrap(data);
  }

  async myTrips(): Promise<TripPassenger[]> {
    const { data } = await this.http.get<ApiSuccess<TripPassenger[]>>(ENDPOINTS.transport.myTrips);
    return unwrap(data);
  }

  async bookTrip(tripId: string, pickupPointId?: string): Promise<TripPassenger> {
    const { data } = await this.http.post<ApiSuccess<TripPassenger>>(ENDPOINTS.transport.bookTrip(tripId), {
      pickup_point_id: pickupPointId,
    });
    return unwrap(data);
  }

  async tripLocation(tripId: string): Promise<TripLocation | null> {
    const { data } = await this.http.get<ApiSuccess<TripLocation | null>>(ENDPOINTS.transport.tripLocation(tripId));
    return unwrap(data);
  }
}
