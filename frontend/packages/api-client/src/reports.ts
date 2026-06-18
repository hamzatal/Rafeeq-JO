import type { AxiosInstance } from 'axios';
import { ENDPOINTS, type ApiSuccess, type FinancialReport } from '@rafeeq/shared';
import { unwrap } from './client';

/** Admin financial reports (read-only aggregation). */
export class FinancialReportApi {
  constructor(private http: AxiosInstance) {}

  async financial(params?: { from?: string; to?: string; zone_id?: string }): Promise<FinancialReport> {
    const { data } = await this.http.get<ApiSuccess<FinancialReport>>(ENDPOINTS.admin.reportsFinancial, { params });
    return unwrap(data);
  }
}
