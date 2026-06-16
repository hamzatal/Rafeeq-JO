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
