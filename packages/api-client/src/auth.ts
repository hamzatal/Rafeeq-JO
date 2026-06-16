import type { AxiosInstance } from 'axios';
import {
  ENDPOINTS,
  type ApiSuccess,
  type AuthResult,
  type LoginPayload,
  type RegisterPayload,
  type RegisterResult,
  type OtpRequestResult,
  type User,
  type VerifyOtpPayload,
} from '@rafeeq/shared';
import { unwrap } from './client';

/** Auth + profile API surface. */
export class AuthApi {
  constructor(private http: AxiosInstance) {}

  async register(payload: RegisterPayload): Promise<RegisterResult> {
    const { data } = await this.http.post<ApiSuccess<RegisterResult>>(
      ENDPOINTS.auth.register,
      payload,
    );
    return unwrap(data);
  }

  async verifyOtp(payload: VerifyOtpPayload): Promise<AuthResult> {
    const { data } = await this.http.post<ApiSuccess<AuthResult>>(
      ENDPOINTS.auth.verifyOtp,
      payload,
    );
    return unwrap(data);
  }

  async requestOtp(phone: string): Promise<OtpRequestResult> {
    const { data } = await this.http.post<ApiSuccess<OtpRequestResult>>(
      ENDPOINTS.auth.requestOtp,
      { phone },
    );
    return unwrap(data);
  }

  async resendOtp(phone: string, purpose: string): Promise<OtpRequestResult> {
    const { data } = await this.http.post<ApiSuccess<OtpRequestResult>>(
      ENDPOINTS.auth.resendOtp,
      { phone, purpose },
    );
    return unwrap(data);
  }

  async login(payload: LoginPayload): Promise<AuthResult> {
    const { data } = await this.http.post<ApiSuccess<AuthResult>>(
      ENDPOINTS.auth.login,
      payload,
    );
    return unwrap(data);
  }

  async me(): Promise<User> {
    const { data } = await this.http.get<ApiSuccess<User>>(ENDPOINTS.auth.me);
    return unwrap(data);
  }

  async logout(): Promise<void> {
    await this.http.post(ENDPOINTS.auth.logout);
  }
}
