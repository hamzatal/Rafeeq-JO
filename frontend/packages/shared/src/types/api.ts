/** Unified API envelope returned by the Rafeeq backend. */
export interface ApiSuccess<T> {
  data: T;
  meta?: {
    pagination?: {
      current_page: number;
      per_page: number;
      total: number | null;
      has_more: boolean;
    };
    [key: string]: unknown;
  };
  message?: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  code?: string;
}

export type Paginated<T> = ApiSuccess<T[]>;
