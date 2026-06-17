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
    Rafeeq\Modules\Drivers\Providers\DriversServiceProvider::class,
    Rafeeq\Modules\Universities\Providers\UniversitiesServiceProvider::class,
    Rafeeq\Modules\Areas\Providers\AreasServiceProvider::class,
    Rafeeq\Modules\PickupPoints\Providers\PickupPointsServiceProvider::class,
    Rafeeq\Modules\Routes\Providers\RoutesServiceProvider::class,
    Rafeeq\Modules\Subscriptions\Providers\SubscriptionsServiceProvider::class,
    Rafeeq\Modules\Trips\Providers\TripsServiceProvider::class,
    Rafeeq\Modules\Zones\Providers\ZonesServiceProvider::class,
    Rafeeq\Modules\RideRequests\Providers\RideRequestsServiceProvider::class,
];
