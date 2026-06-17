import type { AxiosInstance } from 'axios';
import {
  ENDPOINTS,
  type ApiSuccess,
  type CliqInstructions,
  type PaymentPurpose,
  type PaymentRequest,
} from '@rafeeq/shared';
import { unwrap } from './client';

export interface CreatePaymentInput {
  purpose: PaymentPurpose;
  amount_fils?: number;
  subscription_id?: string;
}

/** Payments (CliQ + GPT-Vision verification) API. */
export class PaymentsApi {
  constructor(private http: AxiosInstance) {}

  // ── Payer ──────────────────────────────────────────────────────────
  async mine(): Promise<PaymentRequest[]> {
    const { data } = await this.http.get<ApiSuccess<PaymentRequest[]>>(ENDPOINTS.payments.list);
    return unwrap(data);
  }

  async create(input: CreatePaymentInput): Promise<{ request: PaymentRequest; instructions: CliqInstructions }> {
    const { data } = await this.http.post<ApiSuccess<{ request: PaymentRequest; instructions: CliqInstructions }>>(
      ENDPOINTS.payments.create,
      input,
    );
    return unwrap(data);
  }

  async show(id: string): Promise<PaymentRequest> {
    const { data } = await this.http.get<ApiSuccess<PaymentRequest>>(ENDPOINTS.payments.one(id));
    return unwrap(data);
  }

  async instructions(id: string): Promise<CliqInstructions> {
    const { data } = await this.http.get<ApiSuccess<CliqInstructions>>(ENDPOINTS.payments.instructions(id));
    return unwrap(data);
  }

  /** Upload a CliQ transfer proof image (FormData) for verification. */
  async submitProof(id: string, proof: FormData): Promise<{ request: PaymentRequest }> {
    const { data } = await this.http.post<ApiSuccess<{ request: PaymentRequest }>>(ENDPOINTS.payments.proof(id), proof, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return unwrap(data);
  }

  // ── Admin / finance ─────────────────────────────────────────────────
  async adminQueue(status?: string): Promise<PaymentRequest[]> {
    const { data } = await this.http.get<ApiSuccess<PaymentRequest[]>>(ENDPOINTS.payments.adminQueue, {
      params: { status },
    });
    return unwrap(data);
  }

  async adminShow(id: string): Promise<PaymentRequest> {
    const { data } = await this.http.get<ApiSuccess<PaymentRequest>>(ENDPOINTS.payments.adminOne(id));
    return unwrap(data);
  }

  async approve(id: string): Promise<PaymentRequest> {
    const { data } = await this.http.post<ApiSuccess<PaymentRequest>>(ENDPOINTS.payments.adminApprove(id));
    return unwrap(data);
  }

  async reject(id: string, reason: string): Promise<PaymentRequest> {
    const { data } = await this.http.post<ApiSuccess<PaymentRequest>>(ENDPOINTS.payments.adminReject(id), { reason });
    return unwrap(data);
  }
}
