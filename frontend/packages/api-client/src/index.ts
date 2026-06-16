import type { AxiosInstance } from 'axios';
import { createHttp, type RafeeqClientOptions } from './client';
import { AuthApi } from './auth';
import { ProfileApi } from './profile';
import { DriverApi } from './driver';
import { AdminApi } from './admin';

export * from './client';
export * from './auth';
export * from './profile';
export * from './driver';
export * from './admin';

/** Aggregated API surface. Extend with more domains as modules land. */
export class RafeeqApi {
  readonly http: AxiosInstance;
  readonly auth: AuthApi;
  readonly profile: ProfileApi;
  readonly driver: DriverApi;
  readonly admin: AdminApi;

  constructor(options: RafeeqClientOptions) {
    this.http = createHttp(options);
    this.auth = new AuthApi(this.http);
    this.profile = new ProfileApi(this.http);
    this.driver = new DriverApi(this.http);
    this.admin = new AdminApi(this.http);
  }
}

export function createRafeeqApi(options: RafeeqClientOptions): RafeeqApi {
  return new RafeeqApi(options);
}
