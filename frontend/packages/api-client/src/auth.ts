import type { AxiosInstance } from 'axios';
import {
  ENDPOINTS,
  type ApiSuccess,
  type AuthResult,
  type LoginPayload,
  type MfaChallenge,
  type MfaSetupResult,
  type MfaConfirmResult,
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

  /**
   * Password login. Returns either a full auth result, or — when the account
   * has 2FA enabled — an MFA challenge to be completed via `verifyMfa`.
   */
  async login(payload: LoginPayload): Promise<AuthResult | MfaChallenge> {
    const { data } = await this.http.post<ApiSuccess<AuthResult | MfaChallenge>>(
      ENDPOINTS.auth.login,
      payload,
    );
    return unwrap(data);
  }

  async me(): Promise<User> {
    const { data } = await this.http.get<ApiSuccess<User>>(ENDPOINTS.auth.me);
    return unwrap(data);
  }

  /* ── Two-factor authentication (staff/admin) ─────────────────────── */

  /** Complete an MFA login challenge with a TOTP/recovery code → token. */
  async verifyMfa(payload: { mfa_token: string; code: string; device_name?: string }): Promise<AuthResult> {
    const { data } = await this.http.post<ApiSuccess<AuthResult>>(ENDPOINTS.auth.verifyMfa, payload);
    return unwrap(data);
  }

  /** Begin 2FA enrollment: returns the secret + otpauth URI for the QR code. */
  async mfaSetup(): Promise<MfaSetupResult> {
    const { data } = await this.http.post<ApiSuccess<MfaSetupResult>>(ENDPOINTS.auth.mfaSetup);
    return unwrap(data);
  }

  /** Confirm enrollment with the first code → returns recovery codes. */
  async mfaConfirm(code: string): Promise<MfaConfirmResult> {
    const { data } = await this.http.post<ApiSuccess<MfaConfirmResult>>(ENDPOINTS.auth.mfaConfirm, { code });
    return unwrap(data);
  }

  /** Disable 2FA after re-verifying a current TOTP/recovery code. */
  async mfaDisable(code: string): Promise<void> {
    await this.http.post(ENDPOINTS.auth.mfaDisable, { code });
  }

  async logout(): Promise<void> {
    await this.http.post(ENDPOINTS.auth.logout);
  }
}
