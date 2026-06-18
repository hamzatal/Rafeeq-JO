import type { AxiosInstance } from 'axios';
import {
  ENDPOINTS,
  type ApiSuccess,
  type Dispute,
  type DisputeDetail,
  type InvestigateResult,
} from '@rafeeq/shared';
import { unwrap } from './client';

export type DisputeAction = 'frozen' | 'warning' | 'cleared' | 'banned' | 'none';

/** Admin dispute / investigation center API. */
export class DisputesApi {
  constructor(private http: AxiosInstance) {}

  async list(params?: { status?: string; type?: string; per_page?: number }): Promise<Dispute[]> {
    const { data } = await this.http.get<ApiSuccess<Dispute[]>>(ENDPOINTS.admin.disputes, { params });
    return unwrap(data);
  }

  async show(id: string): Promise<DisputeDetail> {
    const { data } = await this.http.get<ApiSuccess<DisputeDetail>>(ENDPOINTS.admin.dispute(id));
    return unwrap(data);
  }

  async open(payload: {
    subject_user_id: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    summary?: string;
    trip_id?: string;
  }): Promise<Dispute> {
    const { data } = await this.http.post<ApiSuccess<Dispute>>(ENDPOINTS.admin.disputes, payload);
    return unwrap(data);
  }

  async investigate(userId: string): Promise<InvestigateResult> {
    const { data } = await this.http.post<ApiSuccess<InvestigateResult>>(ENDPOINTS.admin.disputeInvestigate, {
      user_id: userId,
    });
    return unwrap(data);
  }

  async assign(id: string): Promise<Dispute> {
    const { data } = await this.http.post<ApiSuccess<Dispute>>(ENDPOINTS.admin.disputeAssign(id));
    return unwrap(data);
  }

  async resolve(id: string, resolution: string, action_taken: DisputeAction): Promise<Dispute> {
    const { data } = await this.http.post<ApiSuccess<Dispute>>(ENDPOINTS.admin.disputeResolve(id), {
      resolution,
      action_taken,
    });
    return unwrap(data);
  }

  async dismiss(id: string, reason?: string): Promise<Dispute> {
    const { data } = await this.http.post<ApiSuccess<Dispute>>(ENDPOINTS.admin.disputeDismiss(id), { reason });
    return unwrap(data);
  }

  async freeze(id: string): Promise<{ frozen: boolean }> {
    const { data } = await this.http.post<ApiSuccess<{ frozen: boolean }>>(ENDPOINTS.admin.disputeFreeze(id));
    return unwrap(data);
  }

  async unfreeze(id: string): Promise<{ unfrozen: boolean }> {
    const { data } = await this.http.post<ApiSuccess<{ unfrozen: boolean }>>(ENDPOINTS.admin.disputeUnfreeze(id));
    return unwrap(data);
  }
}
