import type { AxiosInstance } from 'axios';
import { ENDPOINTS, type ApiSuccess, type Rating, type RatingDirection } from '@rafeeq/shared';
import { unwrap } from './client';

export interface RateInput {
  direction: RatingDirection;
  stars: number;
  comment?: string;
  student_id?: string;
}

/** Two-way ratings (student ↔ captain). */
export class RatingsApi {
  constructor(private http: AxiosInstance) {}

  async rate(tripId: string, input: RateInput): Promise<Rating> {
    const { data } = await this.http.post<ApiSuccess<Rating>>(ENDPOINTS.ratings.rate(tripId), input);
    return unwrap(data);
  }

  async mine(): Promise<Rating[]> {
    const { data } = await this.http.get<ApiSuccess<Rating[]>>(ENDPOINTS.ratings.mine);
    return unwrap(data);
  }

  async received(): Promise<Rating[]> {
    const { data } = await this.http.get<ApiSuccess<Rating[]>>(ENDPOINTS.ratings.received);
    return unwrap(data);
  }
}
