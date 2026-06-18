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


/** ── Guardian (parent) portal ─────────────────────────────────────── */

export interface GuardianLink {
  id: string;
  relation: string;
  status: 'active' | 'pending' | 'revoked';
  notify_on_board: boolean;
  notify_on_dropoff: boolean;
  notify_on_sos: boolean;
  guardian?: { id: string; name: string; phone: string };
  student?: { id: string; name: string };
  created_at: string | null;
}

export interface GuardianChild {
  link_id: string;
  relation: string;
  student_user_id: string;
  name: string | null;
  university_id: string | null;
  notify_on_board: boolean;
  notify_on_dropoff: boolean;
  notify_on_sos: boolean;
}

export interface GuardianLiveTrip {
  active: boolean;
  passenger_status?: string;
  passenger_status_label?: string;
  trip: {
    id: string;
    status: string;
    status_label: string;
    scheduled_at: string | null;
    started_at: string | null;
    route_name: string | null;
    progress_percent: number;
  } | null;
  captain?: {
    name: string;
    phone: string | null;
    rating: number;
    total_trips: number;
  } | null;
  vehicle?: {
    make: string;
    model: string;
    color: string;
    plate_number: string;
  } | null;
  location?: {
    lat: number;
    lng: number;
    speed: number | null;
    recorded_at: string | null;
  } | null;
}

export interface GuardianArrivalEvent {
  type: 'arrival' | 'departure';
  label: string;
  route_name: string | null;
  at: string;
  trip_id: string;
}

export interface CaptainContact {
  captain_name: string;
  masked_phone: string | null;
  call_mode: string;
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
