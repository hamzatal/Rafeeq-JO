import type { AxiosInstance } from 'axios';
import {
  ENDPOINTS,
  type ApiSuccess,
  type Coupon,
  type DriverDocument,
  type DriverProfile,
  type Route,
  type Subscription,
  type SubscriptionPlan,
  type Trip,
  type University,
  type User,
  type Wallet,
  type WalletTransaction,
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

  // ── Coupons / discounts management ───────────────────────────────
  async listCoupons(params: ListParams & { active?: boolean } = {}): Promise<{ items: Coupon[]; meta: ApiSuccess<Coupon[]>['meta'] }> {
    const { data } = await this.http.get<ApiSuccess<Coupon[]>>(ENDPOINTS.admin.coupons, { params });
    return { items: data.data, meta: data.meta };
  }

  async createCoupon(payload: Partial<Coupon>): Promise<Coupon> {
    const { data } = await this.http.post<ApiSuccess<Coupon>>(ENDPOINTS.admin.coupons, payload);
    return unwrap(data);
  }

  async updateCoupon(id: string, payload: Partial<Coupon>): Promise<Coupon> {
    const { data } = await this.http.patch<ApiSuccess<Coupon>>(ENDPOINTS.admin.coupon(id), payload);
    return unwrap(data);
  }

  async deleteCoupon(id: string): Promise<void> {
    await this.http.delete(ENDPOINTS.admin.coupon(id));
  }

  // ── Wallet: manual top-up (admin confirms a CliQ transfer) ───────
  /**
   * Credit a user's (student or captain) wallet manually.
   * Backed by POST /admin/wallets/credit (permission: payments.approve).
   */
  async creditWallet(payload: { user_id: string; amount_fils: number; reference?: string }): Promise<void> {
    await this.http.post(ENDPOINTS.admin.walletCredit, payload);
  }

  /**
   * List a user's recent wallet transactions (to review / reverse a top-up).
   * Backed by GET /admin/wallets/transactions.
   */
  async listUserWalletTransactions(userId: string): Promise<{ wallet: Wallet; transactions: WalletTransaction[] }> {
    const { data } = await this.http.get<ApiSuccess<{ wallet: Wallet; transactions: WalletTransaction[] }>>(
      ENDPOINTS.admin.walletTransactions,
      { params: { user_id: userId } },
    );
    return unwrap(data);
  }

  /**
   * Reverse a manual top-up / adjustment entered by mistake.
   * Backed by POST /admin/wallets/reverse (permission: payments.approve).
   */
  async reverseWalletTransaction(payload: { transaction_id: string; reason?: string }): Promise<void> {
    await this.http.post(ENDPOINTS.admin.walletReverse, payload);
  }

  // ── Admin team management (permission: users.manage / admin-only) ─
  async listStaff(params: ListParams = {}): Promise<{ items: User[]; meta: ApiSuccess<User[]>['meta'] }> {
    const { data } = await this.http.get<ApiSuccess<User[]>>(ENDPOINTS.admin.staff, { params });
    return { items: data.data, meta: data.meta };
  }

  async staffRoles(): Promise<{ name: string; label_ar: string; label_en: string }[]> {
    const { data } = await this.http.get<ApiSuccess<{ name: string; label_ar: string; label_en: string }[]>>(
      ENDPOINTS.admin.staffRoles,
    );
    return unwrap(data);
  }

  async createStaff(payload: {
    full_name: string;
    phone: string;
    email?: string | null;
    password: string;
    role: string;
  }): Promise<User> {
    const { data } = await this.http.post<ApiSuccess<User>>(ENDPOINTS.admin.staff, payload);
    return unwrap(data);
  }

  async updateStaff(
    id: string,
    payload: { full_name?: string; email?: string | null; status?: string; role?: string; password?: string },
  ): Promise<User> {
    const { data } = await this.http.patch<ApiSuccess<User>>(ENDPOINTS.admin.staffOne(id), payload);
    return unwrap(data);
  }

  // ── CliQ settings (permission: settings.manage / admin-only) ─────
  async getCliqSettings(): Promise<CliqSettings> {
    const { data } = await this.http.get<ApiSuccess<CliqSettings>>(ENDPOINTS.admin.settingsCliq);
    return unwrap(data);
  }

  async updateCliqSettings(payload: Partial<CliqSettings>): Promise<CliqSettings> {
    const { data } = await this.http.patch<ApiSuccess<CliqSettings>>(ENDPOINTS.admin.settingsCliq, payload);
    return unwrap(data);
  }

  // ── Broadcast notifications (permission: users.manage) ───────────
  async notificationAudience(): Promise<{ all: number; students: number; drivers: number }> {
    const { data } = await this.http.get<ApiSuccess<{ all: number; students: number; drivers: number }>>(
      ENDPOINTS.admin.notifyAudience,
    );
    return unwrap(data);
  }

  async sendNotification(payload: {
    audience: 'all' | 'students' | 'drivers' | 'users';
    user_ids?: string[];
    title: string;
    body: string;
    coupon_code?: string;
  }): Promise<{ queued: boolean; estimated: number }> {
    const { data } = await this.http.post<ApiSuccess<{ queued: boolean; estimated: number }>>(ENDPOINTS.admin.notify, payload);
    return unwrap(data);
  }

  // ── Audit trail (permission: audit.view) ─────────────────────────
  async listAuditLogs(
    params: { action?: string; user_id?: string; auditable_type?: string; from?: string; to?: string; page?: number; per_page?: number } = {},
  ): Promise<{ items: AuditLogEntry[]; meta: ApiSuccess<AuditLogEntry[]>['meta'] }> {
    const { data } = await this.http.get<ApiSuccess<AuditLogEntry[]>>(ENDPOINTS.admin.auditLogs, { params });
    return { items: data.data, meta: data.meta };
  }

  async auditActions(): Promise<string[]> {
    const { data } = await this.http.get<ApiSuccess<string[]>>(ENDPOINTS.admin.auditLogActions);
    return unwrap(data);
  }

  /** Download the audit trail as a CSV blob (respects the same filters). */
  async exportAuditCsv(params: { action?: string; user_id?: string; from?: string; to?: string } = {}): Promise<Blob> {
    const res = await this.http.get(ENDPOINTS.admin.auditLogsExport, { params, responseType: 'blob' });
    return res.data as Blob;
  }

  /** Download the financial report as a CSV blob. */
  async exportFinancialCsv(params: { from?: string; to?: string; zone_id?: string } = {}): Promise<Blob> {
    const res = await this.http.get(ENDPOINTS.admin.reportsFinancialExport, { params, responseType: 'blob' });
    return res.data as Blob;
  }

  // ── Command center: pending-action counts (sidebar red badges) ───
  async pendingCounts(): Promise<PendingCounts> {
    const { data } = await this.http.get<ApiSuccess<PendingCounts>>(ENDPOINTS.admin.overviewPendingCounts);
    return unwrap(data);
  }

  // ── Command center: newest-first "what's new" activity feed ──────
  async activity(limit = 12): Promise<ActivityItem[]> {
    const { data } = await this.http.get<ApiSuccess<ActivityItem[]>>(ENDPOINTS.admin.overviewActivity, {
      params: { limit },
    });
    return unwrap(data);
  }
}

/** Counts of items awaiting an admin action (keys map to sidebar routes). */
export interface PendingCounts {
  drivers_pending: number;
  payments_pending: number;
  withdrawals_pending: number;
  complaints_open: number;
  disputes_open: number;
  support_open: number;
  sos_active: number;
}

export type ActivityType =
  | 'driver_pending'
  | 'payment_pending'
  | 'withdrawal_pending'
  | 'complaint_open'
  | 'sos_active';

export interface ActivityItem {
  type: ActivityType;
  id: string;
  at: string | null;
  href: string;
}

export interface CliqSettings {
  alias: string | null;
  beneficiary_name: string | null;
  bank_name: string | null;
}


export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  action: string;
  auditable_type: string | null;
  auditable_id: string | null;
  changes: Record<string, unknown> | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}
