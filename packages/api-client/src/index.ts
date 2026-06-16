import type { AxiosInstance } from 'axios';
import { createHttp, type RafeeqClientOptions } from './client';
import { AuthApi } from './auth';
import { ProfileApi } from './profile';
import { DriverApi } from './driver';

export * from './client';
export * from './auth';
export * from './profile';
export * from './driver';

/** Aggregated API surface. Extend with more domains as modules land. */
export class RafeeqApi {
  readonly http: AxiosInstance;
  readonly auth: AuthApi;
  readonly profile: ProfileApi;
  readonly driver: DriverApi;

  constructor(options: RafeeqClientOptions) {
    this.http = createHttp(options);
    this.auth = new AuthApi(this.http);
    this.profile = new ProfileApi(this.http);
    this.driver = new DriverApi(this.http);
  }
}

export function createRafeeqApi(options: RafeeqClientOptions): RafeeqApi {
  return new RafeeqApi(options);
}
