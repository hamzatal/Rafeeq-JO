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
