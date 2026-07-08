# Production image for the Rafeeq Laravel API.
# Uses serversideup/php which bundles a hardened nginx + php-fpm + healthcheck.
# PHP 8.4 to match composer.json (^8.4) and the CI matrix.
FROM serversideup/php:8.4-fpm-nginx AS base

USER root
RUN install-php-extensions pdo_pgsql pgsql redis gd intl bcmath pcntl
USER www-data

WORKDIR /var/www/html

# Install PHP dependencies first (better layer caching).
COPY --chown=www-data:www-data composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --no-progress --no-scripts --prefer-dist

# Copy the application source.
COPY --chown=www-data:www-data . .

RUN composer dump-autoload --optimize

# Run migrations + config cache at container start (after env is injected),
# then hand off to the base image's nginx + php-fpm supervisor.
ENV PHP_OPCACHE_ENABLE=1 \
    APP_ENV=production \
    APP_DEBUG=false

EXPOSE 8080
