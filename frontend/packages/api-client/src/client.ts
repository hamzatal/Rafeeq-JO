import axios, { type AxiosInstance, type AxiosError } from 'axios';
import { API_VERSION, type ApiError, type ApiSuccess } from '@rafeeq/shared';

export interface RafeeqClientOptions {
  /** Base server URL, e.g. http://localhost:8000 */
  baseURL: string;
  /** Returns the stored bearer token (or null). May be async. */
  getToken?: () => string | null | Promise<string | null>;
  /** Preferred language sent via Accept-Language. */
  getLocale?: () => 'ar' | 'en';
  /** Called when the API returns 401 (token invalid/expired). */
  onUnauthorized?: () => void;
}

/** A normalised error thrown by the client for all non-2xx responses. */
export class RafeeqApiError extends Error {
  status: number;
  code?: string;
  errors?: Record<string, string[]>;

  constructor(status: number, payload: ApiError) {
    super(payload.message || 'Request failed');
    this.name = 'RafeeqApiError';
    this.status = status;
    this.code = payload.code;
    this.errors = payload.errors;
  }

  /** First validation message, if any. */
  firstError(): string | undefined {
    if (!this.errors) return undefined;
    const key = Object.keys(this.errors)[0];
    return key ? this.errors[key]?.[0] : undefined;
  }
}

export function createHttp(options: RafeeqClientOptions): AxiosInstance {
  const http = axios.create({
    baseURL: `${options.baseURL.replace(/\/$/, '')}/api/${API_VERSION}`,
    headers: { Accept: 'application/json' },
    timeout: 20000,
  });

  http.interceptors.request.use(async (config) => {
    const token = options.getToken ? await options.getToken() : null;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    config.headers['Accept-Language'] = options.getLocale?.() ?? 'ar';
    return config;
  });

  http.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiError>) => {
      const status = error.response?.status ?? 0;
      if (status === 401) options.onUnauthorized?.();

      const payload: ApiError = error.response?.data ?? {
        message: error.message || 'Network error',
        code: 'NETWORK_ERROR',
      };
      return Promise.reject(new RafeeqApiError(status, payload));
    },
  );

  return http;
}

/** Unwrap the { data, meta, message } envelope to just `data`. */
export function unwrap<T>(payload: ApiSuccess<T>): T {
  return payload.data;
}
