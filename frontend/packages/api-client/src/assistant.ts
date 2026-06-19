import type { AxiosInstance } from 'axios';
import {
  ENDPOINTS,
  type AdminInsights,
  type AiConversation,
  type AiMessage,
  type ApiSuccess,
  type AssistantReply,
  type RiskScore,
} from '@rafeeq/shared';
import { unwrap } from './client';

/** Rafeeq Assistant (chat) + admin fraud-risk insights. */
export class AssistantApi {
  constructor(private http: AxiosInstance) {}

  async conversations(): Promise<AiConversation[]> {
    const { data } = await this.http.get<ApiSuccess<AiConversation[]>>(ENDPOINTS.assistant.conversations);
    return unwrap(data);
  }

  async messages(conversationId: string): Promise<AiMessage[]> {
    const { data } = await this.http.get<ApiSuccess<AiMessage[]>>(ENDPOINTS.assistant.messages(conversationId));
    return unwrap(data);
  }

  async send(message: string, conversationId?: string): Promise<AssistantReply> {
    const { data } = await this.http.post<ApiSuccess<AssistantReply>>(ENDPOINTS.assistant.send, {
      message,
      conversation_id: conversationId,
    });
    return unwrap(data);
  }

  // Admin
  async insights(): Promise<AdminInsights> {
    const { data } = await this.http.get<ApiSuccess<AdminInsights>>(ENDPOINTS.assistant.adminInsights);
    return unwrap(data);
  }

  async risks(limit = 20): Promise<RiskScore[]> {
    const { data } = await this.http.get<ApiSuccess<RiskScore[]>>(ENDPOINTS.assistant.adminRisks, { params: { limit } });
    return unwrap(data);
  }

  async risk(userId: string): Promise<RiskScore> {
    const { data } = await this.http.get<ApiSuccess<RiskScore>>(ENDPOINTS.assistant.adminRisk(userId));
    return unwrap(data);
  }
}
