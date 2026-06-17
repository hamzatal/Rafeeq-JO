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
  driverOffers: {
    list: '/driver/trips/offers',
    accept: (tripId: string) => `/driver/trips/offers/${tripId}/accept`,
  },
  wallet: {
    show: '/wallet',
    transactions: '/wallet/transactions',
    topupInstructions: '/wallet/topup-instructions',
  },
  payments: {
    list: '/payments',
    create: '/payments',
    one: (id: string) => `/payments/${id}`,
    instructions: (id: string) => `/payments/${id}/instructions`,
    proof: (id: string) => `/payments/${id}/proof`,
    adminQueue: '/admin/payments',
    adminOne: (id: string) => `/admin/payments/${id}`,
    adminProof: (paymentId: string) => `/admin/payments/proof/${paymentId}`,
    adminApprove: (id: string) => `/admin/payments/${id}/approve`,
    adminReject: (id: string) => `/admin/payments/${id}/reject`,
  },
  notifications: {
    list: '/notifications',
    unreadCount: '/notifications/unread-count',
    readAll: '/notifications/read-all',
    read: (id: string) => `/notifications/${id}/read`,
    preferences: '/notifications/preferences',
    devices: '/notifications/devices',
  },
  ratings: {
    mine: '/ratings/mine',
    received: '/ratings/received',
    rate: (tripId: string) => `/trips/${tripId}/ratings`,
  },
  support: {
    list: '/support/tickets',
    create: '/support/tickets',
    one: (id: string) => `/support/tickets/${id}`,
    reply: (id: string) => `/support/tickets/${id}/reply`,
    adminList: '/admin/support/tickets',
    adminEscalate: (id: string) => `/admin/support/tickets/${id}/escalate`,
    adminStatus: (id: string) => `/admin/support/tickets/${id}/status`,
  },
  complaints: {
    mine: '/complaints',
    file: '/complaints',
    adminList: '/admin/complaints',
    adminOne: (id: string) => `/admin/complaints/${id}`,
    adminStatus: (id: string) => `/admin/complaints/${id}/status`,
  },
  rideRequests: {
    create: '/ride-requests',
    estimate: '/ride-requests/estimate',
    mine: '/ride-requests/mine',
    cancel: (id: string) => `/ride-requests/${id}/cancel`,
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
    rideRequests: '/admin/ride-requests',
    matchingRun: '/admin/matching/run',
    walletCredit: '/admin/wallets/credit',
  },
} as const;

export const OTP_LENGTH = 6;
export const REWARD_TIERS = ['bronze', 'silver', 'gold', 'platinum'] as const;
