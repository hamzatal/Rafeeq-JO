import type { AxiosInstance } from 'axios';
import { ENDPOINTS, type ApiSuccess, type ChatConversation, type ChatMessage } from '@rafeeq/shared';
import { unwrap } from './client';

/** In-app chat (student ↔ captain). Used by both the student and driver apps. */
export class ChatApi {
  constructor(private http: AxiosInstance) {}

  async conversations(): Promise<ChatConversation[]> {
    const { data } = await this.http.get<ApiSuccess<ChatConversation[]>>(ENDPOINTS.chat.conversations);
    return unwrap(data);
  }

  /** Open/fetch the conversation for a trip (captain passes studentUserId). */
  async openForTrip(tripId: string, studentUserId?: string): Promise<ChatConversation> {
    const { data } = await this.http.post<ApiSuccess<ChatConversation>>(
      ENDPOINTS.chat.open(tripId),
      studentUserId ? { student_user_id: studentUserId } : {},
    );
    return unwrap(data);
  }

  async messages(conversationId: string, afterId?: string): Promise<ChatMessage[]> {
    const { data } = await this.http.get<ApiSuccess<ChatMessage[]>>(ENDPOINTS.chat.messages(conversationId), {
      params: afterId ? { after: afterId } : undefined,
    });
    return unwrap(data);
  }

  async send(conversationId: string, body: string): Promise<ChatMessage> {
    const { data } = await this.http.post<ApiSuccess<ChatMessage>>(ENDPOINTS.chat.send(conversationId), { body });
    return unwrap(data);
  }

  async markRead(conversationId: string): Promise<void> {
    await this.http.post(ENDPOINTS.chat.read(conversationId));
  }
}
