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

export type SubscriptionType = 'daily' | 'weekly' | 'monthly' | 'term';

export type SubscriptionStatus = 'pending' | 'active' | 'expired' | 'cancelled';

/**
 * `pending_driver` was missing, and it is the state a POOLED trip spends most of
 * its life in.
 *
 * `Shared\Enums\TripStatus` has had the case since the matcher started forming cars
 * before a captain accepted them («بانتظار كابتن»). This union did not, so the value
 * arrived over the wire, TypeScript typed it as one of the other four, and any client
 * comparison against it was a "no overlap" error waiting for someone to write it —
 * or worse, an `if` that silently never ran.
 */
export type TripStatus = 'pending_driver' | 'scheduled' | 'started' | 'completed' | 'cancelled';

export type TripPassengerStatus = 'booked' | 'onboard' | 'dropped' | 'no_show' | 'cancelled';

/**
 * How a rider pays. Chosen BEFORE a captain is matched.
 *
 * The backend enum and its validation rule have existed since the ride-request
 * endpoint did; this type did not, so the client had no way to name the field and
 * every request defaulted to `wallet`. A captain who cannot take cash today needs to
 * see it on the offer and decline knowingly, rather than find out at the pickup.
 */
export type PaymentMethod = 'wallet' | 'cash';
