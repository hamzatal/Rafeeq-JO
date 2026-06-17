import type { AxiosInstance } from 'axios';
import { ENDPOINTS, type ApiSuccess, type ExchangeItem, type ExchangeType } from '@rafeeq/shared';
import { unwrap } from './client';

export interface CreateExchangeInput {
  type: ExchangeType;
  title: string;
  condition?: 'new' | 'good' | 'fair';
  description?: string;
  price_fils?: number;
}

/** Campus Exchange (books, notes, tools). */
export class ExchangeApi {
  constructor(private http: AxiosInstance) {}

  async list(type?: ExchangeType): Promise<ExchangeItem[]> {
    const { data } = await this.http.get<ApiSuccess<ExchangeItem[]>>(ENDPOINTS.exchange.list, { params: { type } });
    return unwrap(data);
  }

  async mine(): Promise<ExchangeItem[]> {
    const { data } = await this.http.get<ApiSuccess<ExchangeItem[]>>(ENDPOINTS.exchange.mine);
    return unwrap(data);
  }

  async create(input: CreateExchangeInput): Promise<ExchangeItem> {
    const { data } = await this.http.post<ApiSuccess<ExchangeItem>>(ENDPOINTS.exchange.create, input);
    return unwrap(data);
  }

  async reserve(id: string): Promise<ExchangeItem> {
    const { data } = await this.http.post<ApiSuccess<ExchangeItem>>(ENDPOINTS.exchange.reserve(id));
    return unwrap(data);
  }

  async close(id: string): Promise<ExchangeItem> {
    const { data } = await this.http.post<ApiSuccess<ExchangeItem>>(ENDPOINTS.exchange.close(id));
    return unwrap(data);
  }
}
