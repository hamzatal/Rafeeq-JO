/** API + platform-wide constants. */

export const API_VERSION = 'v1';

export const ENDPOINTS = {
  ping: '/ping',
  auth: {
    register: '/auth/register',
    verifyOtp: '/auth/verify-otp',
    requestOtp: '/auth/request-otp',
    resendOtp: '/auth/resend-otp',
    login: '/auth/login',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    me: '/auth/me',
    logout: '/auth/logout',
    logoutAll: '/auth/logout-all',
  },
  profile: {
    base: '/profile',
    changePassword: '/profile/change-password',
    requestPhone: '/profile/phone/request',
    confirmPhone: '/profile/phone/confirm',
  },
  student: {
    profile: '/student/profile',
  },
  driver: {
    profile: '/driver/profile',
    documents: '/driver/documents',
    submit: '/driver/submit',
    vehicles: '/driver/vehicles',
  },
} as const;

export const OTP_LENGTH = 6;
export const REWARD_TIERS = ['bronze', 'silver', 'gold', 'platinum'] as const;
