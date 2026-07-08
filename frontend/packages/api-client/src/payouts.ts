import type { AxiosInstance } from 'axios';
import {
  ENDPOINTS,
  type ApiSuccess,
  type DriverPerformance,
  type EarningsSummary,
  type PayoutRequest,
} from '@rafeeq/shared';
import { unwrap } from './client';

/** Captain payouts (withdraw earnings) + performance, and the admin queue. */
export class PayoutApi {
  constructor(private http: AxiosInstance) {}

  async performance(): Promise<DriverPerformance> {
    const { data } = await this.http.get<ApiSuccess<DriverPerformance>>(ENDPOINTS.driver.performance);
    return unwrap(data);
  }

  async earningsSummary(): Promise<EarningsSummary> {
    const { data } = await this.http.get<ApiSuccess<EarningsSummary>>(ENDPOINTS.driver.earningsSummary);
    return unwrap(data);
  }

  async withdrawals(): Promise<PayoutRequest[]> {
    const { data } = await this.http.get<ApiSuccess<PayoutRequest[]>>(ENDPOINTS.driver.withdrawals);
    return unwrap(data);
  }

  async requestWithdrawal(payload: { amount_fils: number; destination?: string; note?: string }): Promise<PayoutRequest> {
    const { data } = await this.http.post<ApiSuccess<PayoutRequest>>(ENDPOINTS.driver.withdrawals, payload);
    return unwrap(data);
  }

  /* ── Admin ─────────────────────────────────────────────────────── */

  async adminQueue(): Promise<PayoutRequest[]> {
    const { data } = await this.http.get<ApiSuccess<PayoutRequest[]>>(ENDPOINTS.adminWithdrawals.list);
    return unwrap(data);
  }

  async adminApprove(id: string): Promise<PayoutRequest> {
    const { data } = await this.http.post<ApiSuccess<PayoutRequest>>(ENDPOINTS.adminWithdrawals.approve(id));
    return unwrap(data);
  }

  async adminReject(id: string, reason?: string): Promise<PayoutRequest> {
    const { data } = await this.http.post<ApiSuccess<PayoutRequest>>(ENDPOINTS.adminWithdrawals.reject(id), { reason });
    return unwrap(data);
  }
}
