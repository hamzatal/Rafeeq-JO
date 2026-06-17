import type { AxiosInstance } from 'axios';
import {
  ENDPOINTS,
  type ApiSuccess,
  type CliqInstructions,
  type Wallet,
  type WalletTransaction,
} from '@rafeeq/shared';
import { unwrap } from './client';

/** Prepaid Rafeeq Wallet API. */
export class WalletApi {
  constructor(private http: AxiosInstance) {}

  async show(): Promise<Wallet> {
    const { data } = await this.http.get<ApiSuccess<Wallet>>(ENDPOINTS.wallet.show);
    return unwrap(data);
  }

  async transactions(page = 1): Promise<WalletTransaction[]> {
    const { data } = await this.http.get<ApiSuccess<WalletTransaction[]>>(ENDPOINTS.wallet.transactions, {
      params: { page },
    });
    return unwrap(data);
  }

  /** Returns CliQ transfer instructions for topping up (no credit until verified). */
  async topupInstructions(amountFils: number): Promise<CliqInstructions> {
    const { data } = await this.http.post<ApiSuccess<CliqInstructions>>(ENDPOINTS.wallet.topupInstructions, {
      amount_fils: amountFils,
    });
    return unwrap(data);
  }
}
