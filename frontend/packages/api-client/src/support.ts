import type { AxiosInstance } from 'axios';
import {
  ENDPOINTS,
  type ApiSuccess,
  type SupportTicket,
  type TicketCategory,
} from '@rafeeq/shared';
import { unwrap } from './client';

export interface OpenTicketInput {
  category: TicketCategory;
  subject: string;
  body: string;
}

/** Support tickets (L1–L4 escalation). */
export class SupportApi {
  constructor(private http: AxiosInstance) {}

  async mine(): Promise<SupportTicket[]> {
    const { data } = await this.http.get<ApiSuccess<SupportTicket[]>>(ENDPOINTS.support.list);
    return unwrap(data);
  }

  async open(input: OpenTicketInput): Promise<SupportTicket> {
    const { data } = await this.http.post<ApiSuccess<SupportTicket>>(ENDPOINTS.support.create, input);
    return unwrap(data);
  }

  async show(id: string): Promise<SupportTicket> {
    const { data } = await this.http.get<ApiSuccess<SupportTicket>>(ENDPOINTS.support.one(id));
    return unwrap(data);
  }

  async reply(id: string, body: string): Promise<SupportTicket> {
    const { data } = await this.http.post<ApiSuccess<SupportTicket>>(ENDPOINTS.support.reply(id), { body });
    return unwrap(data);
  }

  // Admin / staff
  async adminList(params: { status?: string; level?: number } = {}): Promise<SupportTicket[]> {
    const { data } = await this.http.get<ApiSuccess<SupportTicket[]>>(ENDPOINTS.support.adminList, { params });
    return unwrap(data);
  }

  async escalate(id: string, assignTo?: string): Promise<SupportTicket> {
    const { data } = await this.http.post<ApiSuccess<SupportTicket>>(ENDPOINTS.support.adminEscalate(id), { assign_to: assignTo });
    return unwrap(data);
  }

  async setStatus(id: string, status: string): Promise<SupportTicket> {
    const { data } = await this.http.post<ApiSuccess<SupportTicket>>(ENDPOINTS.support.adminStatus(id), { status });
    return unwrap(data);
  }
}
