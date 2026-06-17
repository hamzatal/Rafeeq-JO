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
  status: TripPassengerStatus;
  status_label: string;
  boarded_at: string | null;
  boarding_code: string | null;
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
