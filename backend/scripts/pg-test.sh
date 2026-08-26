#!/usr/bin/env bash
# Run the suite against a throwaway Postgres.
#
# Why this exists: SQLite `:memory:` silently ignores `SELECT ... FOR UPDATE`,
# so every `lockForUpdate` in this codebase was untestable and three concurrency
# bugs shipped behind a green suite. The test database has to be the production
# engine. CI gets Postgres from a `services:` container; this script gives the
# same thing on a workstation with no Docker.
#
#   ./scripts/pg-test.sh                       # whole suite
#   ./scripts/pg-test.sh --filter Concurrency  # anything after -- goes to artisan test
#   COVERAGE=1 ./scripts/pg-test.sh            # with coverage
set -euo pipefail

PGDATA="${PGDATA:-/var/lib/pgsql/rafeeq}"
PGBIN="${PGBIN:-/usr/bin}"
DB="${DB_DATABASE:-rafeeq_test}"
USER_="${DB_USERNAME:-rafeeq}"
PASS="${DB_PASSWORD:-secret}"
SOCK=/var/run/postgresql

started=0
cleanup() { [ "$started" = 1 ] && su postgres -c "$PGBIN/pg_ctl -D $PGDATA stop -m immediate" >/dev/null 2>&1 || true; }
trap cleanup EXIT

if ! "$PGBIN/pg_isready" -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
  if [ ! -d "$PGDATA/base" ]; then
    echo "→ initdb $PGDATA"
    mkdir -p "$PGDATA" "$SOCK"; chown -R postgres:postgres "$PGDATA" "$SOCK"
    su postgres -c "$PGBIN/initdb -D $PGDATA -A trust --encoding=UTF8 --locale=C" >/dev/null
  fi
  echo "→ starting postgres"
  # fsync off: this database is disposable, and the suite is IO-bound without it.
  su postgres -c "$PGBIN/pg_ctl -D $PGDATA -l $PGDATA/server.log -o '-c listen_addresses=127.0.0.1 -c port=5432 \
    -c unix_socket_directories=$SOCK -c fsync=off -c full_page_writes=off -c synchronous_commit=off \
    -c max_connections=80' start -w -t 30" >/dev/null
  started=1
fi

psql -h 127.0.0.1 -U postgres -tc "SELECT 1 FROM pg_roles WHERE rolname='$USER_'" | grep -q 1 \
  || psql -h 127.0.0.1 -U postgres -qc "CREATE ROLE $USER_ LOGIN SUPERUSER PASSWORD '$PASS'"
psql -h 127.0.0.1 -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='$DB'" | grep -q 1 \
  || psql -h 127.0.0.1 -U postgres -qc "CREATE DATABASE $DB OWNER $USER_"

export DB_CONNECTION=pgsql DB_HOST=127.0.0.1 DB_PORT=5432
export DB_DATABASE="$DB" DB_USERNAME="$USER_" DB_PASSWORD="$PASS"
export APP_ENV=testing CACHE_STORE=array SESSION_DRIVER=array QUEUE_CONNECTION=sync

if [ "${COVERAGE:-0}" = "1" ]; then
  php -d memory_limit=1G -d pcov.enabled=1 -d pcov.directory=. vendor/bin/phpunit --coverage-text "$@"
else
  php artisan test "$@"
fi
