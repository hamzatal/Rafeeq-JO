#!/usr/bin/env bash
#
# Nightly logical backup, with verification.
#
# The audit found "zero backups — documented as an intention only, and volumes local to
# a single host". That is the failure that ends a company: every other bug in this
# project is recoverable, and losing the ledger is not.
#
# Three properties this script has that a bare `pg_dump | gzip` does not:
#
#   It VERIFIES. A dump that cannot be restored is not a backup, it is a file. Every run
#   restores into a scratch database and counts rows in the tables that matter. A silent
#   corruption is caught the night it happens, not the morning you need it.
#
#   It goes OFF-HOST. A backup on the same disk as the database survives a bad migration
#   and nothing else — not a disk failure, not a deleted volume, not ransomware.
#
#   It FAILS LOUDLY. Exit non-zero, and the scheduler alerts. A backup job that fails
#   quietly for six weeks is worse than none, because you believe you have one.
#
# Usage:
#   ./scripts/backup.sh                 # dump + verify + upload + prune
#   ./scripts/backup.sh --verify-only /path/to/dump.sql.gz
#   ./scripts/backup.sh --no-upload     # local only, for a first run
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/rafeeq}"
KEEP_DAILY="${KEEP_DAILY:-14}"
KEEP_WEEKLY="${KEEP_WEEKLY:-8}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
NAME="rafeeq-${STAMP}.sql.gz"

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_DATABASE="${DB_DATABASE:-rafeeq}"
DB_USERNAME="${DB_USERNAME:-rafeeq}"
export PGPASSWORD="${DB_PASSWORD:-}"

# Tables whose row counts are compared before and after the verification restore.
# Chosen because losing any of them is unrecoverable, not because they are large.
CRITICAL_TABLES="wallets wallet_transactions wallet_holds payment_requests payout_requests trip_passengers users"

log()  { printf '[backup %s] %s\n' "$(date -u +%H:%M:%S)" "$*"; }
fail() { printf '[backup FAILED] %s\n' "$*" >&2; exit 1; }

psql_q() { psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$1" -tAc "$2"; }

# ── verify: restore into a scratch database and compare row counts ────────────
verify_dump() {
  local dump="$1" scratch="rafeeq_verify_$$"
  log "verifying $dump"

  local before after
  before="$(for t in $CRITICAL_TABLES; do
    printf '%s=%s;' "$t" "$(psql_q "$DB_DATABASE" "SELECT count(*) FROM $t" 2>/dev/null || echo NA)"
  done)"

  psql_q postgres "CREATE DATABASE $scratch" >/dev/null
  # shellcheck disable=SC2064
  trap "psql -h '$DB_HOST' -p '$DB_PORT' -U '$DB_USERNAME' -d postgres -tAc 'DROP DATABASE IF EXISTS $scratch' >/dev/null 2>&1 || true" RETURN

  if ! gunzip -c "$dump" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$scratch" -q >/dev/null 2>&1; then
    fail "restore of $dump did not complete — this dump is NOT a backup"
  fi

  after="$(for t in $CRITICAL_TABLES; do
    printf '%s=%s;' "$t" "$(psql_q "$scratch" "SELECT count(*) FROM $t" 2>/dev/null || echo MISSING)"
  done)"

  if [ "$before" != "$after" ]; then
    fail "row counts differ after restore.
  live:     $before
  restored: $after"
  fi

  # A restored ledger that fails its own constraints is corrupt in a way row counts
  # cannot see, so the constraints are re-validated too.
  local bad
  bad="$(psql_q "$scratch" "SELECT count(*) FROM wallets WHERE balance_fils < 0 OR held_fils < 0 OR debt_fils < 0")"
  [ "$bad" = "0" ] || fail "restored ledger holds $bad negative wallet row(s)"

  log "verified: $before"
}

# ── main ─────────────────────────────────────────────────────────────────────
if [ "${1:-}" = "--verify-only" ]; then
  [ -f "${2:-}" ] || fail "usage: $0 --verify-only <dump.sql.gz>"
  verify_dump "$2"
  log "ok"
  exit 0
fi

mkdir -p "$BACKUP_DIR"
command -v pg_dump >/dev/null || fail "pg_dump not on PATH"

log "dumping $DB_DATABASE"
# --clean --if-exists so the dump is replayable into a populated database, which is what
# a real recovery looks like. No --data-only: the schema is part of the backup.
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_DATABASE" \
  --clean --if-exists --no-owner --no-privileges \
  | gzip -9 > "$BACKUP_DIR/$NAME" || fail "pg_dump failed"

SIZE="$(du -h "$BACKUP_DIR/$NAME" | cut -f1)"
log "wrote $NAME ($SIZE)"

# An empty or absurdly small dump means pg_dump "succeeded" against the wrong database.
MIN_BYTES="${MIN_BYTES:-10240}"
ACTUAL="$(stat -c%s "$BACKUP_DIR/$NAME")"
[ "$ACTUAL" -ge "$MIN_BYTES" ] || fail "dump is only ${ACTUAL} bytes — refusing to trust it"

verify_dump "$BACKUP_DIR/$NAME"

# ── off-host ─────────────────────────────────────────────────────────────────
if [ "${1:-}" != "--no-upload" ]; then
  if [ -n "${BACKUP_S3_BUCKET:-}" ] && command -v aws >/dev/null; then
    log "uploading to s3://$BACKUP_S3_BUCKET/"
    aws s3 cp "$BACKUP_DIR/$NAME" "s3://$BACKUP_S3_BUCKET/$NAME" \
      --storage-class STANDARD_IA || fail "off-host upload failed"
    log "uploaded"
  else
    # Not a warning to be ignored: a local-only backup does not survive the disk.
    printf '[backup WARNING] BACKUP_S3_BUCKET is not set — this backup is LOCAL ONLY and does not survive a disk loss.\n' >&2
  fi
fi

# ── prune, keeping weeklies ──────────────────────────────────────────────────
log "pruning (keep ${KEEP_DAILY} daily, ${KEEP_WEEKLY} weekly)"
find "$BACKUP_DIR" -name 'rafeeq-*.sql.gz' -mtime "+${KEEP_DAILY}" -print0 2>/dev/null |
  while IFS= read -r -d '' f; do
    # Keep Sunday dumps as weeklies.
    if [ "$(date -u -d "@$(stat -c%Y "$f")" +%u)" = "7" ] &&
       [ "$(find "$BACKUP_DIR" -name 'rafeeq-*.sql.gz' -mtime "-$((KEEP_WEEKLY * 7))" | wc -l)" -le "$KEEP_WEEKLY" ]; then
      continue
    fi
    rm -f "$f"
  done

log "done"
