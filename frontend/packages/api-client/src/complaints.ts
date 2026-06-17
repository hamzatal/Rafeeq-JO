import type { AxiosInstance } from 'axios';
import { ENDPOINTS, type ApiSuccess, type Complaint } from '@rafeeq/shared';
import { unwrap } from './client';

export interface FileComplaintInput {
  category: string;
  description: string;
  against_user_id?: string;
  against_type?: 'driver' | 'student';
  trip_id?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

/** Complaints (severity triage + auto-freeze on critical). */
export class ComplaintsApi {
  constructor(private http: AxiosInstance) {}

  async mine(): Promise<Complaint[]> {
    const { data } = await this.http.get<ApiSuccess<Complaint[]>>(ENDPOINTS.complaints.mine);
    return unwrap(data);
  }

  async file(input: FileComplaintInput): Promise<Complaint> {
    const { data } = await this.http.post<ApiSuccess<Complaint>>(ENDPOINTS.complaints.file, input);
    return unwrap(data);
  }

  async adminList(params: { status?: string; severity?: string } = {}): Promise<Complaint[]> {
    const { data } = await this.http.get<ApiSuccess<Complaint[]>>(ENDPOINTS.complaints.adminList, { params });
    return unwrap(data);
  }

  async show(id: string): Promise<Complaint> {
    const { data } = await this.http.get<ApiSuccess<Complaint>>(ENDPOINTS.complaints.adminOne(id));
    return unwrap(data);
  }

  async setStatus(id: string, payload: { status: string; resolution?: string; reinstate?: boolean }): Promise<Complaint> {
    const { data } = await this.http.post<ApiSuccess<Complaint>>(ENDPOINTS.complaints.adminStatus(id), payload);
    return unwrap(data);
  }
}
