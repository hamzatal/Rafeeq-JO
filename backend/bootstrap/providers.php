<?php

return [
    App\Providers\AppServiceProvider::class,

    // Platform foundation
    Rafeeq\Core\Providers\CoreServiceProvider::class,
    Rafeeq\Infrastructure\Providers\InfrastructureServiceProvider::class,

    // Domain modules (each module registers its own routes + migrations)
    Rafeeq\Modules\Auth\Providers\AuthServiceProvider::class,
];
