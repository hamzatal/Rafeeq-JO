import type { User } from './models';
import type { OtpPurpose, UserType } from './enums';

export interface RegisterPayload {
  full_name: string;
  phone: string;
  email?: string;
  password?: string;
  type?: Extract<UserType, 'student' | 'driver'>;
}

export interface VerifyOtpPayload {
  phone: string;
  code: string;
  purpose: Extract<OtpPurpose, 'register' | 'login'>;
  device_name?: string;
}

export interface LoginPayload {
  phone: string;
  password: string;
  device_name?: string;
}

export interface AuthResult {
  user: User;
  token: string;
  token_type: 'Bearer';
}

export interface RegisterResult {
  user: User;
  otp_debug: string | null;
}

export interface OtpRequestResult {
  otp_debug: string | null;
}

export { type OtpPurpose };
