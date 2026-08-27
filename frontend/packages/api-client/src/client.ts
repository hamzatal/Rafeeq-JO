import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios';
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
  /**
   * Called when the API returns 403 — authenticated, but not allowed.
   *
   * A separate hook from 401 because the RECOVERY is opposite. A 401 means sign in
   * again; a 403 means signing in again changes nothing, and treating them alike is
   * how a permission error turns into a sign-out loop: log out, log back in, get
   * 403, log out. Before this, 403 fell through to whatever the calling screen did
   * with an unknown error — usually nothing.
   */
  onForbidden?: (error: RafeeqApiError) => void;
  /** Called for 5xx, so the app can surface one consistent "our side" message. */
  onServerError?: (error: RafeeqApiError) => void;
}

/* ═══════════════════════════════════════════════════════════════════════════
   TIMEOUTS — a request that sends a photo is not a request that reads a row.

   One 15-second timeout covered everything. A document photo from a captain on
   3G in Irbid does not finish in 15 seconds, so `uploadDocument` failed on a
   timer while the upload was still progressing — and the retry uploaded the same
   file again from zero. Meanwhile 15s is far too PATIENT for a tap that reads a
   list: the user has concluded the app is broken by second four.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Reads and ordinary writes. */
export const TIMEOUT_DEFAULT = 15_000;

/** Anything carrying a `FormData` body — a document scan, a CliQ proof. */
export const TIMEOUT_UPLOAD = 90_000;

/** Requests that may retry, and how many extra attempts they get. */
const MAX_RETRIES = 2;

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

  /** No HTTP response at all: airplane mode, no signal, DNS, a dropped tunnel. */
  get isOffline(): boolean {
    return this.status === 0 || this.code === 'NETWORK_ERROR';
  }

  /** 422 — the server rejected the input. `errors` names the fields. */
  get isValidation(): boolean {
    return this.status === 422;
  }

  /** 5xx — our fault, and the user can do nothing except try again. */
  get isServer(): boolean {
    return this.status >= 500;
  }
}

/** Retry config carried on the request, so the interceptor can count attempts. */
interface RetryableConfig extends InternalAxiosRequestConfig {
  __retryCount?: number;
}

/**
 * Is this request safe to repeat automatically?
 *
 * Only idempotent methods, and only for a transport failure or a 5xx. Retrying a
 * POST is how a rider gets charged twice: the first request may have SUCCEEDED and
 * lost its response on the way back, and the client cannot tell that apart from a
 * request that never arrived. GET, HEAD and OPTIONS have no such risk.
 *
 * 4xx is never retried — the same request will be rejected the same way, and
 * hammering a 429 makes the rate limit worse.
 */
function isRetryable(error: AxiosError): boolean {
  const method = (error.config?.method ?? 'get').toLowerCase();
  if (!['get', 'head', 'options'].includes(method)) return false;

  const status = error.response?.status ?? 0;

  return status === 0 || status >= 500;
}

/** 400ms, 800ms — enough for a cell handover, short enough not to feel hung. */
const backoff = (attempt: number) => 400 * 2 ** (attempt - 1);

export function createHttp(options: RafeeqClientOptions): AxiosInstance {
  const http = axios.create({
    baseURL: `${options.baseURL.replace(/\/$/, '')}/api/${API_VERSION}`,
    headers: { Accept: 'application/json' },
    timeout: TIMEOUT_DEFAULT,
  });

  http.interceptors.request.use(async (config) => {
    const token = options.getToken ? await options.getToken() : null;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    config.headers['Accept-Language'] = options.getLocale?.() ?? 'ar';

    /*
     * Detected from the BODY, not asked for at the call site.
     *
     * There are only two upload endpoints today, but a timeout that has to be
     * remembered is a timeout that gets forgotten by the third one. `FormData` is
     * an unambiguous signal that a file is going up.
     */
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      config.timeout = TIMEOUT_UPLOAD;
    }

    return config;
  });

  http.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<ApiError>) => {
      const config = error.config as RetryableConfig | undefined;

      /* Retry before normalising: a successful retry must not surface as an error. */
      if (config && isRetryable(error)) {
        const attempt = (config.__retryCount ?? 0) + 1;
        if (attempt <= MAX_RETRIES) {
          config.__retryCount = attempt;
          await new Promise((resolve) => setTimeout(resolve, backoff(attempt)));

          return http.request(config);
        }
      }

      const status = error.response?.status ?? 0;

      /*
       * No HTTP response → connectivity or timeout. A localised message, because
       * axios' own "Network Error" is untranslated English and reads like a crash.
       */
      const isNetwork = !error.response;
      const payload: ApiError = error.response?.data ?? {
        message: isNetwork
          ? 'تعذّر الاتصال بالخادم. تأكّد من اتصالك بالإنترنت ومن صحّة عنوان الـ API.'
          : error.message || 'حدث خطأ غير متوقع.',
        code: isNetwork ? 'NETWORK_ERROR' : 'UNKNOWN',
      };

      const normalised = new RafeeqApiError(status, payload);

      /*
       * One place decides what each class of failure MEANS.
       *
       * Before this only 401 was handled, so a 403 and a 500 arrived at the calling
       * screen as an anonymous throw — and a screen that forgot to catch showed its
       * empty state, which is how «لا سحوبات معلّقة» came to mean "the server is
       * down". The hooks fire before the rejection so a global surface can react,
       * and the error still propagates so a screen can override.
       */
      if (status === 401) options.onUnauthorized?.();
      else if (status === 403) options.onForbidden?.(normalised);
      else if (normalised.isServer) options.onServerError?.(normalised);

      return Promise.reject(normalised);
    },
  );

  return http;
}

/** Unwrap the { data, meta, message } envelope to just `data`. */
export function unwrap<T>(payload: ApiSuccess<T>): T {
  return payload.data;
}
