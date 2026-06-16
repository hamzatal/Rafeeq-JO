/** Request payload shapes for profile, student, and driver endpoints. */

export interface ChangePasswordPayload {
  current_password?: string;
  password: string;
  password_confirmation: string;
}

export interface UpdateProfilePayload {
  full_name?: string;
  email?: string | null;
  locale?: 'ar' | 'en';
}

export interface VehiclePayload {
  make: string;
  model: string;
  year: number;
  color: string;
  plate_number: string;
  seats?: number;
}

export interface UpdateStudentProfilePayload {
  university_id?: string | null;
  default_pickup_point_id?: string | null;
  student_number?: string | null;
  faculty?: string | null;
  gender?: 'male' | 'female' | null;
}
