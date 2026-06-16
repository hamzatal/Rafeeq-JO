import type { AxiosInstance } from 'axios';
import { createHttp, type RafeeqClientOptions } from './client';
import { AuthApi } from './auth';

export * from './client';
export * from './auth';

/** Aggregated API surface. Extend with more domains as modules land. */
export class RafeeqApi {
  readonly http: AxiosInstance;
  readonly auth: AuthApi;

  constructor(options: RafeeqClientOptions) {
    this.http = createHttp(options);
    this.auth = new AuthApi(this.http);
  }
}

export function createRafeeqApi(options: RafeeqClientOptions): RafeeqApi {
  return new RafeeqApi(options);
}
