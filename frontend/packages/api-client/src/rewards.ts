import type { AxiosInstance } from 'axios';
import { ENDPOINTS, type ApiSuccess, type RewardRedemptionOption, type RewardSummary } from '@rafeeq/shared';
import { unwrap } from './client';

/** Rafeeq Rewards (points + tiers). */
export class RewardsApi {
  constructor(private http: AxiosInstance) {}

  async summary(): Promise<RewardSummary> {
    const { data } = await this.http.get<ApiSuccess<RewardSummary>>(ENDPOINTS.rewards.show);
    return unwrap(data);
  }

  async redeem(points: number, reason: string): Promise<void> {
    await this.http.post(ENDPOINTS.rewards.redeem, { points, reason });
  }

  /** Wallet-redemption catalog (points → JOD credit). */
  async options(): Promise<RewardRedemptionOption[]> {
    const { data } = await this.http.get<ApiSuccess<RewardRedemptionOption[]>>(ENDPOINTS.rewards.options);
    return unwrap(data);
  }

  /** Redeem points for wallet credit. */
  async redeemToWallet(points: number): Promise<{ points_used: number; credited_fils: number }> {
    const { data } = await this.http.post<ApiSuccess<{ points_used: number; credited_fils: number }>>(
      ENDPOINTS.rewards.redeemWallet,
      { points },
    );
    return unwrap(data);
  }
}
