export type UserType = 'student' | 'driver' | 'support' | 'supervisor' | 'admin';

export type UserStatus = 'pending' | 'active' | 'suspended' | 'banned';

export type DriverStatus =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'suspended';

export type DocumentType =
  | 'national_id'
  | 'license'
  | 'vehicle_registration'
  | 'insurance'
  | 'criminal_record'
  | 'photo';

export type DocumentStatus = 'pending' | 'approved' | 'rejected';

export type RewardTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export type Gender = 'male' | 'female';

export type OtpPurpose =
  | 'register'
  | 'login'
  | 'reset_password'
  | 'trip'
  | 'payment'
  | 'change_phone';

export type SubscriptionType = 'weekly' | 'monthly' | 'term';

export type SubscriptionStatus = 'pending' | 'active' | 'expired' | 'cancelled';

export type TripStatus = 'scheduled' | 'started' | 'completed' | 'cancelled';

export type TripPassengerStatus = 'booked' | 'onboard' | 'dropped' | 'no_show' | 'cancelled';
