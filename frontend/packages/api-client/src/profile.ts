import type { AxiosInstance } from 'axios';
import {
  ENDPOINTS,
  type ApiSuccess,
  type ChangePasswordPayload,
  type UpdateProfilePayload,
  type User,
} from '@rafeeq/shared';
import { unwrap } from './client';

export class ProfileApi {
  constructor(private http: AxiosInstance) {}

  async get(): Promise<User> {
    const { data } = await this.http.get<ApiSuccess<User>>(ENDPOINTS.profile.base);
    return unwrap(data);
  }

  async update(payload: UpdateProfilePayload): Promise<User> {
    const { data } = await this.http.patch<ApiSuccess<User>>(ENDPOINTS.profile.base, payload);
    return unwrap(data);
  }

  async changePassword(payload: ChangePasswordPayload): Promise<void> {
    await this.http.post(ENDPOINTS.profile.changePassword, payload);
  }

  async requestPhoneChange(phone: string): Promise<{ otp_debug: string | null }> {
    const { data } = await this.http.post<ApiSuccess<{ otp_debug: string | null }>>(
      ENDPOINTS.profile.requestPhone,
      { phone },
    );
    return unwrap(data);
  }

  async confirmPhoneChange(phone: string, code: string): Promise<User> {
    const { data } = await this.http.post<ApiSuccess<User>>(ENDPOINTS.profile.confirmPhone, {
      phone,
      code,
    });
    return unwrap(data);
  }
}
