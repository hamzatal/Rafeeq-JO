import type { AxiosInstance } from 'axios';
import {
  ENDPOINTS,
  type ApiSuccess,
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
}
