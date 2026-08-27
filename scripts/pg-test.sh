#!/usr/bin/env bash
#
# Run the backend test suite against a real PostgreSQL.
#
# Provisioning lives in pg-up.sh, which explains why SQLite is not an option here.
#
# Pass any phpunit arguments through:
#   ./scripts/pg-test.sh
#   ./scripts/pg-test.sh --filter=CaptainGuaranteeTest
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# shellcheck source=./pg-up.sh
. "$REPO_ROOT/scripts/pg-up.sh"

cd "$REPO_ROOT/backend"
exec php artisan test "$@"
