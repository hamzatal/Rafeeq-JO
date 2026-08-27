#!/usr/bin/env bash
#
# Bring up a local PostgreSQL for the backend, idempotently.
#
# ── Why the suite cannot run on SQLite ────────────────────────────────────────
#
# The schema depends on PostgreSQL in ways that are not incidental. Twenty-two money
# columns carry CHECK constraints that `LedgerIntegrityTest` reads back out of
# `information_schema`; the platform treasury is enforced by a partial unique index
# and a CHECK; `lockForUpdate()` is silently ignored by SQLite, which is how three
# concurrency bugs once passed a green suite. A green SQLite run is a green run of a
# different application.
#
# ── Why it is a script and not a README paragraph ─────────────────────────────
#
# In the dev sandbox the server is not managed by systemd and does not survive
# between shell invocations, and it fails in two ways whose error messages point
# somewhere other than the cause (see the comments below). Both fixes belong in
# version control rather than in someone's shell history.
#
# Sourced by pg-test.sh, or run directly before an artisan command:
#   . scripts/pg-up.sh && php artisan migrate:fresh --force
#
# Exports DB_* so a following artisan command connects without further setup.

PGDATA="${PGDATA:-/var/lib/pgsql/rafeeq}"
PGBIN="${PGBIN:-/usr/bin}"
DB_NAME="${DB_DATABASE:-rafeeq_test}"
DB_USER="${DB_USERNAME:-rafeeq}"
DB_PASS="${DB_PASSWORD:-secret}"

if [[ ! -x "$PGBIN/initdb" ]]; then
  echo "postgres binaries not found in $PGBIN." >&2
  echo "install with: dnf install -y postgresql16-server postgresql16-contrib" >&2
  return 1 2>/dev/null || exit 1
fi

# Provision the cluster on first run. `-A trust` is deliberate, and safe only because
# this cluster listens on loopback inside a disposable sandbox. It is never how a
# deployed database is configured.
if [[ ! -f "$PGDATA/PG_VERSION" ]]; then
  echo "==> initdb $PGDATA"
  mkdir -p "$PGDATA" /var/run/postgresql
  chown -R postgres:postgres "$PGDATA" /var/run/postgresql
  chmod 700 "$PGDATA"
  su postgres -c "$PGBIN/initdb -D $PGDATA -A trust --encoding=UTF8 --locale=C"
fi

mkdir -p /var/run/postgresql
chown postgres:postgres /var/run/postgresql

# Postgres writes a lock file into /tmp alongside its unix socket. Some container
# images ship /tmp as 0755 root:root instead of the standard 1777, and the failure
# reads as a bare "could not create lock file ... Permission denied" logged AFTER the
# server has already reported that it is listening — which looks like a networking
# problem and is not one.
if [[ "$(stat -c '%a' /tmp)" != "1777" ]]; then
  chmod 1777 /tmp
fi

if ! pg_isready -h 127.0.0.1 -q 2>/dev/null; then
  # The sandbox kills the server without letting it shut down, leaving a
  # postmaster.pid and two socket lock files that all point at a process which no
  # longer exists. pg_ctl then refuses with "another server might be running" and the
  # postmaster with "lock file already exists" — both correct in general and wrong
  # here. Removing them is safe only because the pg_isready above has just confirmed
  # that nothing is listening on the port.
  echo "==> clearing stale lock files"
  rm -f "$PGDATA/postmaster.pid" \
        /var/run/postgresql/.s.PGSQL.5432.lock \
        /tmp/.s.PGSQL.5432.lock

  echo "==> starting postgres"
  su postgres -c "$PGBIN/pg_ctl -D $PGDATA -l $PGDATA/server.log -w start"
fi

# Role and database, created only when absent, so a re-run costs nothing.
psql -h 127.0.0.1 -U postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" \
  | grep -q 1 \
  || psql -h 127.0.0.1 -U postgres -qc "CREATE ROLE $DB_USER LOGIN SUPERUSER PASSWORD '$DB_PASS'"

psql -h 127.0.0.1 -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" \
  | grep -q 1 \
  || psql -h 127.0.0.1 -U postgres -qc "CREATE DATABASE $DB_NAME OWNER $DB_USER"

export DB_CONNECTION=pgsql DB_HOST=127.0.0.1 DB_PORT=5432
export DB_DATABASE="$DB_NAME" DB_USERNAME="$DB_USER" DB_PASSWORD="$DB_PASS"
export CACHE_STORE=array SESSION_DRIVER=array QUEUE_CONNECTION=sync
