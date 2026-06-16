import type { AxiosInstance } from 'axios';
import { ENDPOINTS, type ApiSuccess, type Trip, type TripPassenger } from '@rafeeq/shared';
import { unwrap } from './client';

/** Driver-facing trips API. */
export class DriverTripsApi {
  constructor(private http: AxiosInstance) {}

  async list(): Promise<Trip[]> {
    const { data } = await this.http.get<ApiSuccess<Trip[]>>(ENDPOINTS.driverTrips.list);
    return unwrap(data);
  }

  async schedule(payload: { route_id: string; scheduled_at: string; vehicle_id?: string }): Promise<Trip> {
    const { data } = await this.http.post<ApiSuccess<Trip>>(ENDPOINTS.driverTrips.list, payload);
    return unwrap(data);
  }

  async show(id: string): Promise<Trip> {
    const { data } = await this.http.get<ApiSuccess<Trip>>(ENDPOINTS.driverTrips.show(id));
    return unwrap(data);
  }

  async passengers(id: string): Promise<TripPassenger[]> {
    const { data } = await this.http.get<ApiSuccess<TripPassenger[]>>(ENDPOINTS.driverTrips.passengers(id));
    return unwrap(data);
  }

  async start(id: string): Promise<Trip> {
    const { data } = await this.http.post<ApiSuccess<Trip>>(ENDPOINTS.driverTrips.start(id));
    return unwrap(data);
  }

  async end(id: string): Promise<Trip> {
    const { data } = await this.http.post<ApiSuccess<Trip>>(ENDPOINTS.driverTrips.end(id));
    return unwrap(data);
  }

  async cancel(id: string): Promise<Trip> {
    const { data } = await this.http.post<ApiSuccess<Trip>>(ENDPOINTS.driverTrips.cancel(id));
    return unwrap(data);
  }

  async confirmBoarding(id: string, code: string): Promise<TripPassenger> {
    const { data } = await this.http.post<ApiSuccess<TripPassenger>>(ENDPOINTS.driverTrips.board(id), { code });
    return unwrap(data);
  }

  async pushLocation(id: string, lat: number, lng: number, speed?: number): Promise<void> {
    await this.http.post(ENDPOINTS.driverTrips.location(id), { lat, lng, speed });
  }
}
