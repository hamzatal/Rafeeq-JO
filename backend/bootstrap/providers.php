<?php

use App\Providers\AppServiceProvider;
use Rafeeq\Core\Providers\CoreServiceProvider;
use Rafeeq\Infrastructure\Providers\InfrastructureServiceProvider;
use Rafeeq\Modules\Addresses\Providers\AddressesServiceProvider;
use Rafeeq\Modules\Ads\Providers\AdsServiceProvider;
use Rafeeq\Modules\AI\Providers\AIServiceProvider;
use Rafeeq\Modules\Areas\Providers\AreasServiceProvider;
use Rafeeq\Modules\Auth\Providers\AuthServiceProvider;
use Rafeeq\Modules\Chat\Providers\ChatServiceProvider;
use Rafeeq\Modules\Complaints\Providers\ComplaintsServiceProvider;
use Rafeeq\Modules\Coupons\Providers\CouponsServiceProvider;
use Rafeeq\Modules\Disputes\Providers\DisputesServiceProvider;
use Rafeeq\Modules\Drivers\Providers\DriversServiceProvider;
use Rafeeq\Modules\Exchange\Providers\ExchangeServiceProvider;
use Rafeeq\Modules\LostFound\Providers\LostFoundServiceProvider;
use Rafeeq\Modules\Matching\Providers\MatchingServiceProvider;
use Rafeeq\Modules\Notifications\Providers\NotificationsServiceProvider;
use Rafeeq\Modules\Parcels\Providers\ParcelsServiceProvider;
use Rafeeq\Modules\Payments\Providers\PaymentsServiceProvider;
use Rafeeq\Modules\Payouts\Providers\PayoutsServiceProvider;
use Rafeeq\Modules\PickupPoints\Providers\PickupPointsServiceProvider;
use Rafeeq\Modules\Ratings\Providers\RatingsServiceProvider;
use Rafeeq\Modules\Reports\Providers\ReportsServiceProvider;
use Rafeeq\Modules\Rewards\Providers\RewardsServiceProvider;
use Rafeeq\Modules\RideRequests\Providers\RideRequestsServiceProvider;
use Rafeeq\Modules\Routes\Providers\RoutesServiceProvider;
use Rafeeq\Modules\Safety\Providers\SafetyServiceProvider;
use Rafeeq\Modules\Settings\Providers\SettingsServiceProvider;
use Rafeeq\Modules\Students\Providers\StudentsServiceProvider;
use Rafeeq\Modules\Subscriptions\Providers\SubscriptionsServiceProvider;
use Rafeeq\Modules\Support\Providers\SupportServiceProvider;
use Rafeeq\Modules\Trips\Providers\TripsServiceProvider;
use Rafeeq\Modules\Universities\Providers\UniversitiesServiceProvider;
use Rafeeq\Modules\Users\Providers\UsersServiceProvider;
use Rafeeq\Modules\Wallet\Providers\WalletServiceProvider;
use Rafeeq\Modules\Zones\Providers\ZonesServiceProvider;

return [
    AppServiceProvider::class,

    // Platform foundation
    CoreServiceProvider::class,
    InfrastructureServiceProvider::class,

    // Domain modules (each module registers its own routes + migrations)
    AuthServiceProvider::class,
    UsersServiceProvider::class,
    SettingsServiceProvider::class,
    StudentsServiceProvider::class,
    AddressesServiceProvider::class,
    ChatServiceProvider::class,
    DriversServiceProvider::class,
    UniversitiesServiceProvider::class,
    AreasServiceProvider::class,
    PickupPointsServiceProvider::class,
    RoutesServiceProvider::class,
    SubscriptionsServiceProvider::class,
    CouponsServiceProvider::class,
    TripsServiceProvider::class,
    ZonesServiceProvider::class,
    AdsServiceProvider::class,
    RideRequestsServiceProvider::class,
    MatchingServiceProvider::class,
    WalletServiceProvider::class,
    PayoutsServiceProvider::class,
    PaymentsServiceProvider::class,
    ReportsServiceProvider::class,
    NotificationsServiceProvider::class,
    RatingsServiceProvider::class,
    SupportServiceProvider::class,
    ComplaintsServiceProvider::class,
    ParcelsServiceProvider::class,
    RewardsServiceProvider::class,
    LostFoundServiceProvider::class,
    ExchangeServiceProvider::class,
    AIServiceProvider::class,
    SafetyServiceProvider::class,
    DisputesServiceProvider::class,
];
