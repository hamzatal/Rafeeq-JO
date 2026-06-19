import type { AxiosInstance } from 'axios';
import {
  ENDPOINTS,
  type ApiSuccess,
  type DriverDocument,
  type DriverProfile,
  type Route,
  type Subscription,
  type SubscriptionPlan,
  type Trip,
  type University,
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

  // ── Universities management ──────────────────────────────────────
  async listUniversities(params: ListParams = {}): Promise<{ items: University[]; meta: ApiSuccess<University[]>['meta'] }> {
    const { data } = await this.http.get<ApiSuccess<University[]>>(ENDPOINTS.admin.universities, { params });
    return { items: data.data, meta: data.meta };
  }

  async createUniversity(payload: Partial<University>): Promise<University> {
    const { data } = await this.http.post<ApiSuccess<University>>(ENDPOINTS.admin.universities, payload);
    return unwrap(data);
  }

  async updateUniversity(id: string, payload: Partial<University>): Promise<University> {
    const { data } = await this.http.patch<ApiSuccess<University>>(ENDPOINTS.admin.university(id), payload);
    return unwrap(data);
  }

  async deleteUniversity(id: string): Promise<void> {
    await this.http.delete(ENDPOINTS.admin.university(id));
  }

  // ── Transport: Routes management ─────────────────────────────────
  async listRoutes(universityId?: string): Promise<Route[]> {
    const { data } = await this.http.get<ApiSuccess<Route[]>>(ENDPOINTS.routes.list, {
      params: universityId ? { university_id: universityId } : {},
    });
    return unwrap(data);
  }

  async createRoute(payload: Partial<Route> & { stops?: unknown[] }): Promise<Route> {
    const { data } = await this.http.post<ApiSuccess<Route>>(ENDPOINTS.admin.routes, payload);
    return unwrap(data);
  }

  async updateRoute(id: string, payload: Partial<Route>): Promise<Route> {
    const { data } = await this.http.patch<ApiSuccess<Route>>(ENDPOINTS.admin.route(id), payload);
    return unwrap(data);
  }

  async deleteRoute(id: string): Promise<void> {
    await this.http.delete(ENDPOINTS.admin.route(id));
  }

  // ── Transport: Subscription plans management ─────────────────────
  async listPlans(): Promise<SubscriptionPlan[]> {
    const { data } = await this.http.get<ApiSuccess<SubscriptionPlan[]>>(ENDPOINTS.transport.plans);
    return unwrap(data);
  }

  async createPlan(payload: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    const { data } = await this.http.post<ApiSuccess<SubscriptionPlan>>(ENDPOINTS.admin.plans, payload);
    return unwrap(data);
  }

  async updatePlan(id: string, payload: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    const { data } = await this.http.patch<ApiSuccess<SubscriptionPlan>>(ENDPOINTS.admin.plan(id), payload);
    return unwrap(data);
  }

  async deletePlan(id: string): Promise<void> {
    await this.http.delete(ENDPOINTS.admin.plan(id));
  }

  // ── Transport: Subscriptions (monitor + activate) ────────────────
  async listSubscriptions(params: ListParams = {}): Promise<{ items: Subscription[]; meta: ApiSuccess<Subscription[]>['meta'] }> {
    const { data } = await this.http.get<ApiSuccess<Subscription[]>>(ENDPOINTS.admin.subscriptions, { params });
    return { items: data.data, meta: data.meta };
  }

  async activateSubscription(id: string): Promise<Subscription> {
    const { data } = await this.http.post<ApiSuccess<Subscription>>(ENDPOINTS.admin.subscriptionActivate(id));
    return unwrap(data);
  }

  // ── Transport: Trips monitor (read-only) ─────────────────────────
  async listTrips(params: ListParams = {}): Promise<{ items: Trip[]; meta: ApiSuccess<Trip[]>['meta'] }> {
    const { data } = await this.http.get<ApiSuccess<Trip[]>>(ENDPOINTS.admin.trips, { params });
    return { items: data.data, meta: data.meta };
  }
}
