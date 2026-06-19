import type { AxiosInstance } from 'axios';
import {
  ENDPOINTS,
  type ApiSuccess,
  type EmergencyContact,
  type EmergencyRelation,
  type SosIncident,
} from '@rafeeq/shared';
import { unwrap } from './client';

export interface EmergencyContactInput {
  name: string;
  phone: string;
  relation?: EmergencyRelation | null;
  is_primary?: boolean;
  notify_on_sos?: boolean;
}

export interface SosTriggerInput {
  lat?: number | null;
  lng?: number | null;
  trip_id?: string | null;
  note?: string | null;
}

/** Emergency: SOS trigger + guardian/emergency contacts (no separate guardian app). */
export class EmergencyApi {
  constructor(private http: AxiosInstance) {}

  // ── Emergency / guardian contacts ─────────────────────────────────
  async listContacts(): Promise<EmergencyContact[]> {
    const { data } = await this.http.get<ApiSuccess<EmergencyContact[]>>(ENDPOINTS.emergencyContacts.list);
    return unwrap(data);
  }

  async addContact(input: EmergencyContactInput): Promise<EmergencyContact> {
    const { data } = await this.http.post<ApiSuccess<EmergencyContact>>(ENDPOINTS.emergencyContacts.create, input);
    return unwrap(data);
  }

  async updateContact(id: string, input: Partial<EmergencyContactInput>): Promise<EmergencyContact> {
    const { data } = await this.http.patch<ApiSuccess<EmergencyContact>>(ENDPOINTS.emergencyContacts.one(id), input);
    return unwrap(data);
  }

  async deleteContact(id: string): Promise<void> {
    await this.http.delete<ApiSuccess<null>>(ENDPOINTS.emergencyContacts.one(id));
  }

  // ── SOS ───────────────────────────────────────────────────────────
  async triggerSos(input: SosTriggerInput = {}): Promise<SosIncident> {
    const { data } = await this.http.post<ApiSuccess<SosIncident>>(ENDPOINTS.sos.trigger, input);
    return unwrap(data);
  }

  async mySosIncidents(): Promise<SosIncident[]> {
    const { data } = await this.http.get<ApiSuccess<SosIncident[]>>(ENDPOINTS.sos.mine);
    return unwrap(data);
  }
}
