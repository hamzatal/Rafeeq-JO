<?php

return [
    App\Providers\AppServiceProvider::class,

    // Platform foundation
    Rafeeq\Core\Providers\CoreServiceProvider::class,
    Rafeeq\Infrastructure\Providers\InfrastructureServiceProvider::class,

    // Domain modules (each module registers its own routes + migrations)
    Rafeeq\Modules\Auth\Providers\AuthServiceProvider::class,
    Rafeeq\Modules\Users\Providers\UsersServiceProvider::class,
    Rafeeq\Modules\Students\Providers\StudentsServiceProvider::class,
    Rafeeq\Modules\Addresses\Providers\AddressesServiceProvider::class,
    Rafeeq\Modules\Chat\Providers\ChatServiceProvider::class,
    Rafeeq\Modules\Drivers\Providers\DriversServiceProvider::class,
    Rafeeq\Modules\Universities\Providers\UniversitiesServiceProvider::class,
    Rafeeq\Modules\Areas\Providers\AreasServiceProvider::class,
    Rafeeq\Modules\PickupPoints\Providers\PickupPointsServiceProvider::class,
    Rafeeq\Modules\Routes\Providers\RoutesServiceProvider::class,
    Rafeeq\Modules\Subscriptions\Providers\SubscriptionsServiceProvider::class,
    Rafeeq\Modules\Coupons\Providers\CouponsServiceProvider::class,
    Rafeeq\Modules\Trips\Providers\TripsServiceProvider::class,
    Rafeeq\Modules\Zones\Providers\ZonesServiceProvider::class,
    Rafeeq\Modules\RideRequests\Providers\RideRequestsServiceProvider::class,
    Rafeeq\Modules\Matching\Providers\MatchingServiceProvider::class,
    Rafeeq\Modules\Wallet\Providers\WalletServiceProvider::class,
    Rafeeq\Modules\Payouts\Providers\PayoutsServiceProvider::class,
    Rafeeq\Modules\Payments\Providers\PaymentsServiceProvider::class,
    Rafeeq\Modules\Reports\Providers\ReportsServiceProvider::class,
    Rafeeq\Modules\Notifications\Providers\NotificationsServiceProvider::class,
    Rafeeq\Modules\Ratings\Providers\RatingsServiceProvider::class,
    Rafeeq\Modules\Support\Providers\SupportServiceProvider::class,
    Rafeeq\Modules\Complaints\Providers\ComplaintsServiceProvider::class,
    Rafeeq\Modules\Parcels\Providers\ParcelsServiceProvider::class,
    Rafeeq\Modules\Rewards\Providers\RewardsServiceProvider::class,
    Rafeeq\Modules\LostFound\Providers\LostFoundServiceProvider::class,
    Rafeeq\Modules\Exchange\Providers\ExchangeServiceProvider::class,
    Rafeeq\Modules\AI\Providers\AIServiceProvider::class,
    Rafeeq\Modules\Safety\Providers\SafetyServiceProvider::class,
    Rafeeq\Modules\Disputes\Providers\DisputesServiceProvider::class,
];
