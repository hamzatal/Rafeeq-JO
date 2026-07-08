import type {
  DocumentStatus,
  DocumentType,
  DriverStatus,
  Gender,
  RewardTier,
  UserStatus,
  UserType,
} from './enums';

export interface User {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  type: UserType;
  type_label: string;
  status: UserStatus;
  status_label: string;
  locale: 'ar' | 'en';
  avatar_url: string | null;
  phone_verified: boolean;
  mfa_enabled?: boolean;
  roles?: string[];
  created_at: string | null;
}

export interface University {
  id: string;
  name_ar: string;
  name_en: string;
  code: string;
  city: string | null;
  lat: number | null;
  lng: number | null;
  logo_url: string | null;
  contact_phone: string | null;
  is_active: boolean;
}

export interface StudentProfile {
  id: string;
  university_id: string | null;
  default_pickup_point_id: string | null;
  student_number: string | null;
  faculty: string | null;
  gender: Gender | null;
  gender_label: string | null;
  reward_tier: RewardTier;
  reward_tier_label: string;
  onboarded: boolean;
}

export interface Route {
  id: string;
  university_id: string;
  from_area_id: string | null;
  name: string;
  price_fils: number;
  price_jod?: number;
  capacity: number;
  days?: number[];
  departure_time?: string | null;
  is_active: boolean;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  plate_number: string;
  seats: number;
  status: 'active' | 'inactive';
}

export interface DriverDocument {
  id: string;
  type: DocumentType;
  type_label: string;
  status: DocumentStatus;
  status_label: string;
  review_note: string | null;
  expires_at: string | null;
  uploaded_at: string | null;
}

export interface DriverProfile {
  id: string;
  status: DriverStatus;
  status_label: string;
  can_drive: boolean;
  verification_level: number;
  rating_avg: number;
  rating_count: number;
  total_trips: number;
  face_verified: boolean;
  liveness_verified: boolean;
  review_note: string | null;
  submitted_at: string | null;
  user?: User;
  vehicles?: Vehicle[];
  documents?: DriverDocument[];
}


// ── Transport (Phase 2) ──────────────────────────────────────────────
import type {
  SubscriptionStatus,
  SubscriptionType,
  TripPassengerStatus,
  TripStatus,
} from './enums';

export interface SubscriptionPlan {
  id: string;
  university_id: string | null;
  route_id: string | null;
  name: string;
  type: SubscriptionType;
  type_label: string;
  price_fils: number;
  price_jod: number;
  rides_count: number | null;
  unlimited: boolean;
  duration_days: number;
  is_active: boolean;
}

export interface Subscription {
  id: string;
  student_id: string;
  plan_id: string;
  route_id: string | null;
  status: SubscriptionStatus;
  status_label: string;
  usable: boolean;
  starts_at: string | null;
  ends_at: string | null;
  remaining_rides: number | null;
  plan?: SubscriptionPlan;
}

export interface TripPassenger {
  id: string;
  trip_id: string;
  student_id: string;
  pickup_point_id: string | null;
  pickup_order: number | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  student_name: string | null;
  status: TripPassengerStatus;
  status_label: string;
  boarded_at: string | null;
  dropoff_confirmed_at: string | null;
  boarding_code: string | null;
  dropoff_code: string | null;
  trip?: Trip;
}

export interface Trip {
  id: string;
  route_id: string;
  driver_id: string;
  vehicle_id: string | null;
  status: TripStatus;
  status_label: string;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  capacity: number;
  booked_count?: number;
  /** Transparent fare breakdown + captain earnings preview (from TripResource). */
  pricing?: {
    fare_fils: number;
    base_fare_fils: number;
    express_fee_fils: number;
    surge_multiplier: number;
    commission_fils: number;
    captain_share_fils: number;
    riders: number;
    expected_captain_earnings_fils: number;
  };
  route?: { id: string; name: string; university_id: string };
  passengers?: TripPassenger[];
}

export interface TripLocation {
  lat: number;
  lng: number;
  speed: number | null;
  recorded_at: string | null;
  trip_status: TripStatus;
}



// ── Wallet & Payments (Phase 3) ──────────────────────────────────────
export interface Wallet {
  id: string;
  balance_fils: number;
  balance_jod: number;
  currency: string;
}

export type WalletTxnType =
  | 'topup' | 'ride_payment' | 'refund' | 'commission' | 'payout' | 'adjustment';

export interface WalletTransaction {
  id: string;
  type: WalletTxnType;
  type_label: string;
  amount_fils: number;
  amount_jod: number;
  balance_after: number;
  reference: string | null;
  description: string | null;
  reversed_at?: string | null;
  reversal_of?: string | null;
  is_reversible?: boolean;
  created_at: string | null;
}

export type PaymentPurpose = 'subscription' | 'wallet_topup' | 'parcel';
export type PaymentStatus =
  | 'pending' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'expired';

export interface Payment {
  id: string;
  method: string;
  status: string;
  ai_confidence: number | null;
  verified_by: string | null;
  bank_reference?: string | null;
  fraud_flags?: string[];
  extracted: Record<string, unknown> | null;
  notes: string | null;
  has_proof: boolean;
  submitted_at: string | null;
  created_at: string | null;
}

export interface PaymentRequest {
  id: string;
  number: string;
  purpose: PaymentPurpose;
  purpose_label: string;
  amount_fils: number;
  amount_jod: number;
  currency: string;
  method: string;
  status: PaymentStatus;
  status_label: string;
  reject_reason: string | null;
  expires_at: string | null;
  approved_at: string | null;
  created_at: string | null;
  payments?: Payment[];
  user?: { id: string; name: string; phone: string };
}

export interface CliqInstructions {
  number?: string;
  method: string;
  alias: string | null;
  beneficiary: string | null;
  bank: string | null;
  amount_fils: number;
  amount_jod: number;
  reference: string;
  expires_at?: string | null;
  note: string;
}

// ── Notifications (Phase 6) ──────────────────────────────────────────
export interface AppNotification {
  id: string;
  type: string;
  category: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  is_critical: boolean;
  read: boolean;
  read_at: string | null;
  created_at: string | null;
}

export interface NotificationPreference {
  push_enabled: boolean;
  sms_enabled: boolean;
  payments: boolean;
  trips: boolean;
  ratings: boolean;
  safety: boolean;
  general: boolean;
}

// ── Ratings ──────────────────────────────────────────────────────────
export type RatingDirection = 'student_rates_driver' | 'driver_rates_student';

export interface Rating {
  id: string;
  trip_id: string;
  rater_id: string;
  ratee_id: string;
  direction: RatingDirection;
  stars: number;
  comment: string | null;
  created_at: string | null;
}

// ── Ride requests (door-to-door pooling) ─────────────────────────────
export type RideType = 'scheduled' | 'express';
export type RideDirection = 'to_university' | 'from_university';
export type RideRequestStatus =
  | 'pending' | 'grouped' | 'assigned' | 'completed' | 'cancelled';

export interface RideRequest {
  id: string;
  zone_id: string | null;
  university_id: string;
  pickup_lat: number;
  pickup_lng: number;
  pickup_address: string | null;
  desired_time: string | null;
  type: RideType;
  type_label?: string;
  direction?: RideDirection;
  direction_label?: string;
  is_express: boolean;
  express_fee_fils: number;
  status: RideRequestStatus;
  status_label: string;
  zone?: { id: string; name_ar: string; name_en: string } | null;
  created_at?: string | null;
}

export interface FareQuote {
  base_fare_fils: number;
  express_fee_fils: number;
  surge_multiplier: number;
  fare_fils: number;
  commission_fils: number;
  captain_share_fils: number;
  riders: number;
  capacity: number;
  expected_total_fils: number;
  expected_captain_earnings_fils: number;
  below_min_fill: boolean;
}



// ── Support & Complaints (Phase 6) ───────────────────────────────────
export type TicketStatus = 'open' | 'pending' | 'escalated' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TicketCategory =
  | 'subscription' | 'trip' | 'payment' | 'driver' | 'student'
  | 'parcel' | 'pickup' | 'technical' | 'other';

export interface TicketMessage {
  id: string;
  body: string;
  is_staff: boolean;
  sender_id: string | null;
  created_at: string | null;
}

export interface SupportTicket {
  id: string;
  number: string;
  category: TicketCategory;
  category_label: string;
  subject: string;
  status: TicketStatus;
  status_label: string;
  priority: TicketPriority;
  priority_label: string;
  level: number;
  ai_triage?: {
    sentiment: string;
    urgency: string;
    suggested_category: string;
    summary: string;
    suggested_reply: string;
    confidence: number;
  } | null;
  assigned_to: string | null;
  last_reply_at: string | null;
  created_at: string | null;
  messages?: TicketMessage[];
  user?: { id: string; name: string; phone: string };
}

export type ComplaintSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ComplaintStatus = 'open' | 'investigating' | 'resolved' | 'dismissed';

export interface Complaint {
  id: string;
  number: string;
  category: string;
  severity: ComplaintSeverity;
  severity_label: string;
  status: ComplaintStatus;
  status_label: string;
  description: string;
  against_type: 'driver' | 'student' | null;
  against_user_id: string | null;
  trip_id: string | null;
  resolution: string | null;
  resolved_at: string | null;
  created_at: string | null;
  reporter?: { id: string; name: string };
  against?: { id: string; name: string; status: string } | null;
}



// ── Extra services (Phase 4) ─────────────────────────────────────────
export type ParcelStatus = 'created' | 'awaiting_pickup' | 'in_transit' | 'delivered' | 'cancelled';
export type ParcelSize = 'small' | 'medium' | 'large';

export interface Parcel {
  id: string;
  number: string;
  receiver_name: string;
  receiver_phone: string;
  from_address: string | null;
  to_address: string | null;
  category: string;
  size: ParcelSize;
  size_label: string;
  description: string | null;
  fee_fils: number;
  fee_jod: number;
  status: ParcelStatus;
  status_label: string;
  picked_up_at: string | null;
  delivered_at: string | null;
  created_at: string | null;
  pickup_code: string | null;
  delivery_code: string | null;
  events?: { type: string; at: string | null }[];
}

export interface RewardSummary {
  points: number;
  lifetime_points: number;
  tier: string;
  tier_label: string;
  next_tier: string | null;
  next_tier_label: string | null;
  next_tier_at: number | null;
}

export interface RewardTransaction {
  id: string;
  type: 'earn' | 'redeem';
  points: number;
  reason: string;
  reference: string | null;
  created_at: string | null;
}

export type LostFoundType = 'lost' | 'found';
export type LostFoundStatus = 'open' | 'matched' | 'resolved';

export interface LostFoundItem {
  id: string;
  reporter_id: string;
  type: LostFoundType;
  category: string;
  title: string;
  description: string | null;
  location: string | null;
  status: LostFoundStatus;
  created_at: string | null;
}

export type ExchangeType = 'book' | 'notes' | 'tool' | 'other';
export type ExchangeStatus = 'available' | 'reserved' | 'closed';

export interface ExchangeItem {
  id: string;
  owner_id: string;
  type: ExchangeType;
  title: string;
  condition: 'new' | 'good' | 'fair';
  description: string | null;
  price_fils: number | null;
  status: ExchangeStatus;
  created_at: string | null;
}



// ── AI (Phase 5) ─────────────────────────────────────────────────────
export interface AiConversation {
  id: string;
  title: string | null;
  last_message_at: string | null;
}

export interface AiMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string | null;
}

export interface AssistantReply {
  conversation_id: string;
  message: AiMessage;
  ai: boolean;
}

export interface RiskScore {
  user_id?: string;
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: { type: string; label: string; weight: number }[];
}

// ── Safety: SOS + emergency contacts ─────────────────────────────────
export type EmergencyRelation =
  | 'parent' | 'sibling' | 'spouse' | 'relative' | 'friend' | 'other';

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation: EmergencyRelation | null;
  is_primary: boolean;
  notify_on_sos: boolean;
  created_at: string | null;
}

export type SosStatus = 'open' | 'acknowledged' | 'resolved';

export interface SosIncident {
  id: string;
  trip_id: string | null;
  status: SosStatus;
  created_at: string | null;
}


/** ── In-app chat (student ↔ captain) ──────────────────────────────── */

export interface ChatConversation {
  id: string;
  trip_id: string | null;
  other_party: { id: string; name: string } | null;
  last_message_at: string | null;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  mine: boolean;
  body: string;
  read: boolean;
  created_at: string | null;
}


/** ── Captain payouts & performance ────────────────────────────────── */

export interface PayoutRequest {
  id: string;
  amount_fils: number;
  method: string;
  destination: string | null;
  status: 'pending' | 'paid' | 'rejected';
  note: string | null;
  admin_note: string | null;
  processed_at: string | null;
  created_at: string | null;
  captain?: { id: string; name: string; phone: string };
}

export interface DriverPerformance {
  tier: string;
  tier_label: string;
  points: number;
  lifetime_points: number;
  next_tier: string | null;
  next_tier_label: string | null;
  points_to_next: number;
  progress_percent: number;
  available_earnings_fils: number;
  rating: number;
  total_trips: number;
}

/** ── Smart ride suggestions (AI) ──────────────────────────────────── */
export type SmartSuggestionKind = 'to_university' | 'to_home' | 'new';

export interface SmartSuggestion {
  id: string;
  kind: SmartSuggestionKind;
  icon: string;
  title: string;
  subtitle: string;
  destination: { lat: number; lng: number; title: string } | null;
}

export interface SmartSuggestions {
  headline: string;
  suggestions: SmartSuggestion[];
}

/** ── Advertising banners ──────────────────────────────────────────── */
export type AdPlacement = 'student_home' | 'student_wallet' | 'driver_home';

export interface AdBanner {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
  placement: AdPlacement;
  is_active: boolean;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
}

/** Detailed captain earnings breakdown (money in fils). */
export interface EarningsBucket {
  earnings_fils: number;
  trips: number;
}

export interface EarningsSummary {
  totals: {
    today_fils: number;
    week_fils: number;
    month_fils: number;
    all_time_fils: number;
    today_trips: number;
    week_trips: number;
    month_trips: number;
    all_time_trips: number;
  };
  daily: (EarningsBucket & { date: string })[];
  weekly: (EarningsBucket & { week_start: string })[];
  available_fils: number;
}


/** ── Saved addresses (student) ────────────────────────────────────── */

export interface SavedAddress {
  id: string;
  label: 'home' | 'university' | 'work' | 'other' | string;
  title: string | null;
  address_text: string;
  lat: number | null;
  lng: number | null;
  is_default: boolean;
  created_at: string | null;
}


export interface FinancialReportZone {
  zone_id: string | null;
  rides_count: number;
  commission_fils: number;
  gross_fare_fils: number;
}

export interface FinancialReport {
  period: { from: string; to: string };
  zone_id: string | null;
  rides_count: number;
  gross_fare_fils: number;
  commission_fils: number;
  captain_earnings_fils: number;
  payouts_paid_fils: number;
  topups_fils: number;
  subscription_revenue_fils: number;
  by_zone: FinancialReportZone[];
}


/** Begin-setup response for two-factor authentication enrollment. */
export interface MfaSetupResult {
  secret: string;
  otpauth_uri: string;
}

/** Confirm-setup response: one-time recovery codes (shown once). */
export interface MfaConfirmResult {
  recovery_codes: string[];
}

/** Login response when the account requires a second factor. */
export interface MfaChallenge {
  mfa_required: true;
  mfa_token: string;
}

/** A service zone, optionally bounded by a polygon geofence. */
export interface Zone {
  id: string;
  name_ar: string;
  name_en: string;
  city: string | null;
  center_lat: number;
  center_lng: number;
  radius_km: number;
  /** Polygon vertices as [lat, lng] pairs (null when radius-only). */
  boundary: Array<[number, number]> | null;
  has_boundary: boolean;
  is_active: boolean;
}


/** A dispute / investigation case in the safety center. */
export interface Dispute {
  id: string;
  subject: { id: string; name?: string; phone?: string; type?: string; status?: string };
  trip_id: string | null;
  type: string; // risk_threshold | collusion | ghost_trip | sos | manual
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  severity_label: string;
  risk_score: number | null;
  summary: string | null;
  assigned_to: string | null;
  action_taken: string | null;
  resolution: string | null;
  resolved_at: string | null;
  created_at: string | null;
}

export interface RiskAssessment {
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: Array<{ type: string; label: string; weight: number }>;
  patterns?: Array<{ student_id: string; cancels: number }>;
}

export interface DisputeEvidence {
  risk: RiskAssessment;
  risk_flags: Array<{
    id: string;
    type: string;
    severity: string;
    severity_label: string;
    description: string | null;
    meta: Record<string, unknown> | null;
    resolved: boolean;
    created_at: string | null;
  }>;
  cancellations: Array<{
    id: string;
    trip_id: string | null;
    reason: string | null;
    passengers_count: number;
    lat: number | null;
    lng: number | null;
    created_at: string | null;
  }>;
  ghost_watches: Array<{ id: string; trip_id: string; resolved: boolean; expires_at: string | null }>;
}

export interface DisputeDetail {
  dispute: Dispute;
  evidence: DisputeEvidence;
}

export interface InvestigateResult {
  assessment: RiskAssessment;
  dispute: Dispute | null;
  frozen: boolean;
}


/** Public client bootstrap config served by GET /v1/config. */
export interface AppConfig {
  maps: {
    provider: 'google' | 'mapbox' | string;
    key: string;
    mapbox_token: string;
    default_center: { lat: number; lng: number };
  };
  features: {
    realtime: boolean;
  };
}


/** Smart admin command-center briefing (GET /admin/ai/insights). */
export interface AdminInsights {
  generated_at: string;
  ai_enabled: boolean;
  metrics: {
    users: { total: number; students: number; drivers: number; new_this_month: number };
    drivers: { pending_review: number; approved: number };
    trips: { this_month: number; completed: number; cancelled: number };
    subscriptions: { active: number };
    finance: {
      rides_count: number;
      gross_fare_fils: number;
      commission_fils: number;
      captain_earnings_fils: number;
      subscription_revenue_fils: number;
    };
    safety: { open_disputes: number; unresolved_risk_flags: number; pending_payments: number };
  };
  analysis: string;
  recommendations: string[];
  source: 'ai' | 'rules';
}


/** Coupon / discount (admin-managed). */
export type CouponType = 'percentage' | 'fixed';
export type CouponScope = 'any' | 'subscription' | 'wallet_topup' | 'ride';

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  type: CouponType;
  type_label: string;
  value: number;
  max_discount_fils: number | null;
  min_amount_fils: number;
  scope: CouponScope;
  scope_label: string;
  university_id: string | null;
  plan_id: string | null;
  first_order_only: boolean;
  usage_limit: number | null;
  per_user_limit: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string | null;
}

export interface CouponValidation {
  code: string;
  discount_fils: number;
  final_fils: number;
}


/** A wallet-redemption option from the rewards catalog. */
export interface RewardRedemptionOption {
  points: number;
  credit_fils: number;
}
