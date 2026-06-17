import type { AxiosInstance } from 'axios';
import { ENDPOINTS, type ApiSuccess, type RewardSummary } from '@rafeeq/shared';
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
}
