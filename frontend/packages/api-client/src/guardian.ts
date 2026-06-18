import type { AxiosInstance } from 'axios';
import {
  ENDPOINTS,
  type ApiSuccess,
  type CaptainContact,
  type GuardianArrivalEvent,
  type GuardianChild,
  type GuardianLink,
  type GuardianLiveTrip,
} from '@rafeeq/shared';
import { unwrap } from './client';

/** Guardian-facing portal API (role: guardian). */
export class GuardianApi {
  constructor(private http: AxiosInstance) {}

  async children(): Promise<GuardianChild[]> {
    const { data } = await this.http.get<ApiSuccess<GuardianChild[]>>(ENDPOINTS.guardian.children);
    return unwrap(data);
  }

  async liveTrip(studentUserId: string): Promise<GuardianLiveTrip> {
    const { data } = await this.http.get<ApiSuccess<GuardianLiveTrip>>(ENDPOINTS.guardian.live(studentUserId));
    return unwrap(data);
  }

  async arrivals(studentUserId: string): Promise<GuardianArrivalEvent[]> {
    const { data } = await this.http.get<ApiSuccess<GuardianArrivalEvent[]>>(ENDPOINTS.guardian.arrivals(studentUserId));
    return unwrap(data);
  }

  async contactCaptain(studentUserId: string): Promise<CaptainContact> {
    const { data } = await this.http.get<ApiSuccess<CaptainContact>>(ENDPOINTS.guardian.contactCaptain(studentUserId));
    return unwrap(data);
  }

  async sos(studentUserId: string, note?: string): Promise<{ incident_id: string; status: string }> {
    const { data } = await this.http.post<ApiSuccess<{ incident_id: string; status: string }>>(
      ENDPOINTS.guardian.sos(studentUserId),
      { note },
    );
    return unwrap(data);
  }
}

/** Student-facing management of their own guardians (role: student). */
export class StudentGuardiansApi {
  constructor(private http: AxiosInstance) {}

  async list(): Promise<GuardianLink[]> {
    const { data } = await this.http.get<ApiSuccess<GuardianLink[]>>(ENDPOINTS.student.guardians);
    return unwrap(data);
  }

  async add(payload: { phone: string; relation?: string; name?: string }): Promise<GuardianLink> {
    const { data } = await this.http.post<ApiSuccess<GuardianLink>>(ENDPOINTS.student.guardians, payload);
    return unwrap(data);
  }

  async revoke(linkId: string): Promise<void> {
    await this.http.delete(ENDPOINTS.student.guardian(linkId));
  }
}
