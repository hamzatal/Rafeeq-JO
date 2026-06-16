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
  universities: {
    list: '/universities',
    one: (id: string) => `/universities/${id}`,
  },
  routes: {
    list: '/routes',
    one: (id: string) => `/routes/${id}`,
  },
  transport: {
    plans: '/plans',
    subscriptions: '/subscriptions',
    cancelSubscription: (id: string) => `/subscriptions/${id}/cancel`,
    availableTrips: '/trips/available',
    myTrips: '/trips/mine',
    bookTrip: (tripId: string) => `/trips/${tripId}/book`,
    tripLocation: (tripId: string) => `/trips/${tripId}/location`,
    cancelBooking: (passengerId: string) => `/trips/passengers/${passengerId}/cancel`,
  },
  driverTrips: {
    list: '/driver/trips',
    show: (id: string) => `/driver/trips/${id}`,
    passengers: (id: string) => `/driver/trips/${id}/passengers`,
    start: (id: string) => `/driver/trips/${id}/start`,
    end: (id: string) => `/driver/trips/${id}/end`,
    cancel: (id: string) => `/driver/trips/${id}/cancel`,
    board: (id: string) => `/driver/trips/${id}/board`,
    location: (id: string) => `/driver/trips/${id}/location`,
  },
  driver: {
    profile: '/driver/profile',
    documents: '/driver/documents',
    submit: '/driver/submit',
    vehicles: '/driver/vehicles',
  },
  admin: {
    users: '/admin/users',
    drivers: '/admin/drivers',
    driver: (id: string) => `/admin/drivers/${id}`,
    reviewDriver: (id: string) => `/admin/drivers/${id}/review`,
    reviewDocument: (docId: string) => `/admin/drivers/documents/${docId}/review`,
    documentFile: (docId: string) => `/admin/drivers/documents/${docId}/file`,
    universities: '/admin/universities',
    university: (id: string) => `/admin/universities/${id}`,
  },
} as const;

export const OTP_LENGTH = 6;
export const REWARD_TIERS = ['bronze', 'silver', 'gold', 'platinum'] as const;
