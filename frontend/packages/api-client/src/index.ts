import type { AxiosInstance } from 'axios';
import { createHttp, type RafeeqClientOptions } from './client';
import { AuthApi } from './auth';
import { ProfileApi } from './profile';
import { DriverApi } from './driver';
import { AdminApi } from './admin';
import { CatalogApi } from './catalog';
import { TransportApi } from './transport';
import { DriverTripsApi } from './driverTrips';
import { WalletApi } from './wallet';
import { PaymentsApi } from './payments';
import { NotificationsApi } from './notifications';
import { RatingsApi } from './ratings';
import { RideRequestsApi } from './rideRequests';
import { SupportApi } from './support';
import { ComplaintsApi } from './complaints';

export * from './client';
export * from './auth';
export * from './profile';
export * from './driver';
export * from './admin';
export * from './catalog';
export * from './transport';
export * from './driverTrips';
export * from './wallet';
export * from './payments';
export * from './notifications';
export * from './ratings';
export * from './rideRequests';
export * from './support';
export * from './complaints';

/** Aggregated API surface. Extend with more domains as modules land. */
export class RafeeqApi {
  readonly http: AxiosInstance;
  readonly auth: AuthApi;
  readonly profile: ProfileApi;
  readonly driver: DriverApi;
  readonly admin: AdminApi;
  readonly catalog: CatalogApi;
  readonly transport: TransportApi;
  readonly driverTrips: DriverTripsApi;
  readonly wallet: WalletApi;
  readonly payments: PaymentsApi;
  readonly notifications: NotificationsApi;
  readonly ratings: RatingsApi;
  readonly rideRequests: RideRequestsApi;
  readonly support: SupportApi;
  readonly complaints: ComplaintsApi;

  constructor(options: RafeeqClientOptions) {
    this.http = createHttp(options);
    this.auth = new AuthApi(this.http);
    this.profile = new ProfileApi(this.http);
    this.driver = new DriverApi(this.http);
    this.admin = new AdminApi(this.http);
    this.catalog = new CatalogApi(this.http);
    this.transport = new TransportApi(this.http);
    this.driverTrips = new DriverTripsApi(this.http);
    this.wallet = new WalletApi(this.http);
    this.payments = new PaymentsApi(this.http);
    this.notifications = new NotificationsApi(this.http);
    this.ratings = new RatingsApi(this.http);
    this.rideRequests = new RideRequestsApi(this.http);
    this.support = new SupportApi(this.http);
    this.complaints = new ComplaintsApi(this.http);
  }
}

export function createRafeeqApi(options: RafeeqClientOptions): RafeeqApi {
  return new RafeeqApi(options);
}
