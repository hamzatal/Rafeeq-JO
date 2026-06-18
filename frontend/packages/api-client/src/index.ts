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
import { ParcelsApi } from './parcels';
import { RewardsApi } from './rewards';
import { LostFoundApi } from './lostFound';
import { ExchangeApi } from './exchange';
import { AssistantApi } from './assistant';
import { GuardianApi, StudentGuardiansApi } from './guardian';
import { ChatApi } from './chat';

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
export * from './parcels';
export * from './rewards';
export * from './lostFound';
export * from './exchange';
export * from './assistant';
export * from './guardian';
export * from './chat';

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
  readonly parcels: ParcelsApi;
  readonly rewards: RewardsApi;
  readonly lostFound: LostFoundApi;
  readonly exchange: ExchangeApi;
  readonly assistant: AssistantApi;
  readonly guardian: GuardianApi;
  readonly studentGuardians: StudentGuardiansApi;
  readonly chat: ChatApi;

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
    this.parcels = new ParcelsApi(this.http);
    this.rewards = new RewardsApi(this.http);
    this.lostFound = new LostFoundApi(this.http);
    this.exchange = new ExchangeApi(this.http);
    this.assistant = new AssistantApi(this.http);
    this.guardian = new GuardianApi(this.http);
    this.studentGuardians = new StudentGuardiansApi(this.http);
    this.chat = new ChatApi(this.http);
  }
}

export function createRafeeqApi(options: RafeeqClientOptions): RafeeqApi {
  return new RafeeqApi(options);
}
