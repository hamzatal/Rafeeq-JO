/** API + platform-wide constants. */

export const API_VERSION = 'v1';

export const ENDPOINTS = {
  config: '/config',
  zones: '/zones',
  ads: '/ads',
  coupons: {
    validate: '/coupons/validate',
  },
  auth: {
    register: '/auth/register',
    verifyOtp: '/auth/verify-otp',
    requestOtp: '/auth/request-otp',
    resendOtp: '/auth/resend-otp',
    login: '/auth/login',
    verifyMfa: '/auth/mfa/verify',
    mfaSetup: '/auth/mfa/setup',
    mfaConfirm: '/auth/mfa/confirm',
    mfaDisable: '/auth/mfa/disable',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    me: '/auth/me',
    becomeDriver: '/auth/become-driver',
    logout: '/auth/logout',
  },
  profile: {
    base: '/profile',
    changePassword: '/profile/change-password',
    requestPhone: '/profile/phone/request',
    confirmPhone: '/profile/phone/confirm',
  },
  student: {
    profile: '/student/profile',
    addresses: '/student/addresses',
    address: (id: string) => `/student/addresses/${id}`,
    addressDefault: (id: string) => `/student/addresses/${id}/default`,
  },
  chat: {
    conversations: '/chat/conversations',
    open: (tripId: string) => `/chat/trips/${tripId}/open`,
    messages: (conversationId: string) => `/chat/conversations/${conversationId}/messages`,
    send: (conversationId: string) => `/chat/conversations/${conversationId}/messages`,
    read: (conversationId: string) => `/chat/conversations/${conversationId}/read`,
  },
  universities: {
    list: '/universities',
  },
  routes: {
    list: '/routes',
  },
  transport: {
    plans: '/plans',
    subscriptions: '/subscriptions',
    cancelSubscription: (id: string) => `/subscriptions/${id}/cancel`,
    paySubscriptionWallet: (id: string) => `/subscriptions/${id}/pay-wallet`,
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
    dropoff: (id: string) => `/driver/trips/${id}/dropoff`,
    location: (id: string) => `/driver/trips/${id}/location`,
  },
  driver: {
    profile: '/driver/profile',
    documents: '/driver/documents',
    submit: '/driver/submit',
    vehicles: '/driver/vehicles',
    /* PATCH and DELETE have existed on the backend since the Drivers module did.
       Nothing in either app could reach them, so a mistyped plate was permanent —
       and a trip will not start with a car whose plate is not the authorised one. */
    vehicle: (id: string) => `/driver/vehicles/${id}`,
    performance: '/driver/performance',
    earningsSummary: '/driver/earnings-summary',
    withdrawals: '/driver/wallet/withdrawals',
    location: '/driver/location',
  },
  adminWithdrawals: {
    list: '/admin/withdrawals',
    approve: (id: string) => `/admin/withdrawals/${id}/approve`,
    reject: (id: string) => `/admin/withdrawals/${id}/reject`,
  },
  driverOffers: {
    list: '/driver/trips/offers',
    accept: (tripId: string) => `/driver/trips/offers/${tripId}/accept`,
  },
  wallet: {
    show: '/wallet',
    transactions: '/wallet/transactions',
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
  rewards: {
    show: '/rewards',
    options: '/rewards/options',
    redeem: '/rewards/redeem',
    redeemWallet: '/rewards/redeem-wallet',
  },
  rideRequests: {
    create: '/ride-requests',
    estimate: '/ride-requests/estimate',
    mine: '/ride-requests/mine',
    cancel: (id: string) => `/ride-requests/${id}/cancel`,
  },
  assistant: {
    conversations: '/assistant/conversations',
    messages: (id: string) => `/assistant/conversations/${id}`,
    send: '/assistant/send',
    /** Badge counts only — three aggregate queries, no completion, no spend guard.
        `adminInsights` below runs a GPT call and is rate-limited; the sidebar must not
        use it to render four integers. */
    adminCounts: '/admin/ai/counts',
    adminInsights: '/admin/ai/insights',
    adminRisks: '/admin/ai/risks',
    adminRisk: (userId: string) => `/admin/ai/risks/${userId}`,
  },
  sos: {
    trigger: '/sos',
    mine: '/sos/mine',
  },
  emergencyContacts: {
    list: '/emergency-contacts',
    create: '/emergency-contacts',
    one: (id: string) => `/emergency-contacts/${id}`,
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
    routes: '/admin/routes',
    route: (id: string) => `/admin/routes/${id}`,
    plans: '/admin/plans',
    plan: (id: string) => `/admin/plans/${id}`,
    subscriptions: '/admin/subscriptions',
    subscriptionActivate: (id: string) => `/admin/subscriptions/${id}/activate`,
    trips: '/admin/trips',
    coupons: '/admin/coupons',
    coupon: (id: string) => `/admin/coupons/${id}`,
    rideRequests: '/admin/ride-requests',
    matchingRun: '/admin/matching/run',
    walletCredit: '/admin/wallets/credit',
    walletReverse: '/admin/wallets/reverse',
    walletTransactions: '/admin/wallets/transactions',
    staff: '/admin/staff',
    staffOne: (id: string) => `/admin/staff/${id}`,
    staffRoles: '/admin/staff/roles',
    settingsCliq: '/admin/settings/cliq',
    settingsPricing: '/admin/settings/pricing',
    zonePrices: '/admin/zone-prices',
    zonePrice: (id: string) => `/admin/zone-prices/${id}`,
    ads: '/admin/ads',
    ad: (id: string) => `/admin/ads/${id}`,
    notify: '/admin/notifications/send',
    notifyAudience: '/admin/notifications/audience',
    reportsFinancial: '/admin/reports/financial',
    reportsFinancialExport: '/admin/reports/financial/export',
    auditLogs: '/admin/audit-logs',
    auditLogActions: '/admin/audit-logs/actions',
    auditLogsExport: '/admin/audit-logs/export',
    /*
     * ── The admin safety centre ───────────────────────────────────────────────
     *
     * `Modules/Safety/Routes/api.php` has served these since the safety module landed;
     * the frontend had no constants for any of them, so the dashboard's «السلامة و SOS»
     * page rendered AI risk SCORES and nothing else — no incidents, no way to resolve
     * one. `docs/design/src/06-admin-3.html` annotates that screen «غير موجودة عملياً
     * اليوم — أخطر فجوة في المشروع», and an unreferenced endpoint is exactly the shape
     * that gap took.
     */
    safetySos: '/admin/safety/sos',
    safetySosResolve: (id: string) => `/admin/safety/sos/${id}/resolve`,
    safetyRiskFlags: '/admin/safety/risk-flags',
    safetyRiskFlagResolve: (id: string) => `/admin/safety/risk-flags/${id}/resolve`,
    safetyCancellations: '/admin/safety/cancellations',
    /** The four cards above the audit trail — screen 41. */
    securityOverview: '/admin/security/overview',
    zones: '/admin/zones',
    zone: (id: string) => `/admin/zones/${id}`,
    disputes: '/admin/disputes',
    dispute: (id: string) => `/admin/disputes/${id}`,
    disputeInvestigate: '/admin/disputes/investigate',
    disputeAssign: (id: string) => `/admin/disputes/${id}/assign`,
    disputeResolve: (id: string) => `/admin/disputes/${id}/resolve`,
    disputeDismiss: (id: string) => `/admin/disputes/${id}/dismiss`,
    disputeFreeze: (id: string) => `/admin/disputes/${id}/freeze`,
    disputeUnfreeze: (id: string) => `/admin/disputes/${id}/unfreeze`,
  },
} as const;

/**
 * How many digits an OTP has.
 *
 * It was exported and read by nothing, while both `otp.tsx` screens hard-coded
 * `maxLength={6}` and a six-dash placeholder — three copies of one number, and the
 * backend has a fourth (`Modules/Auth`). Deleting it would have left the three
 * copies; wiring it leaves one.
 *
 * Distinct from the BOARDING code, which is 4 digits (decision 14) — that difference
 * is deliberate and is why neither number should be a literal at a call site.
 */
export const OTP_LENGTH = 6;

/**
 * Digits in a trip boarding / drop-off code. Mirrors `TripCode::LENGTH`.
 *
 * Its own constant, and not `OTP_LENGTH`, because the two are different things that
 * happen to be the same number today: one is an SMS login code, the other is what a
 * student reads out to a captain. Reusing `OTP_LENGTH` would mean changing the login
 * code length silently changes the boarding code length — and the captain's input had
 * already drifted to `maxLength 6` with a four-dash placeholder and a `>= 4` guard
 * precisely because nothing owned this number.
 */
export const TRIP_CODE_LENGTH = 6;

/**
 * The captain tier ladder, in order.
 *
 * `reward_accounts.tier` is read by the captain dashboard through
 * `ENDPOINTS.driver.performance`. Kept rather than deleted because the ORDER is the
 * meaning — "next tier" is only computable from a sequence — and a screen that
 * re-derives it will get it wrong.
 */
export const REWARD_TIERS = ['bronze', 'silver', 'gold', 'platinum'] as const;
