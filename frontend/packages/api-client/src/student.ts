import type { AxiosInstance } from 'axios';
import { ENDPOINTS, type ApiSuccess, type StudentProfile } from '@rafeeq/shared';
import { unwrap } from './client';

/** Student profile (university, pickup point, student number...). */
export class StudentApi {
  constructor(private http: AxiosInstance) {}

  async getProfile(): Promise<StudentProfile> {
    const { data } = await this.http.get<ApiSuccess<StudentProfile>>(ENDPOINTS.student.profile);
    return unwrap(data);
  }

  async updateProfile(
    payload: Partial<Pick<StudentProfile, 'university_id' | 'default_pickup_point_id' | 'student_number' | 'faculty'>>,
  ): Promise<StudentProfile> {
    const { data } = await this.http.patch<ApiSuccess<StudentProfile>>(ENDPOINTS.student.profile, payload);
    return unwrap(data);
  }
}
