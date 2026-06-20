import type { AxiosInstance } from 'axios';
import { ENDPOINTS, type ApiSuccess } from '@rafeeq/shared';
import { unwrap } from './client';

export interface CouponValidation {
  code: string;
  discount_fils: number;
  final_fils: number;
}

export type CouponScopeInput = 'any' | 'subscription' | 'wallet_topup' | 'ride';

/** Validate a discount coupon for the current user (throws on invalid/expired). */
export class CouponsApi {
  constructor(private http: AxiosInstance) {}

  async validate(input: {
    code: string;
    scope: CouponScopeInput;
    amount_fils: number;
    plan_id?: string;
  }): Promise<CouponValidation> {
    const { data } = await this.http.post<ApiSuccess<CouponValidation>>(ENDPOINTS.coupons.validate, input);
    return unwrap(data);
  }
}
