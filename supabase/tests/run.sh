#!/usr/bin/env bash
# Applies the migrations to a throwaway Postgres in Docker and runs rpc_test.sql.
#   supabase/tests/run.sh           # starts and removes its own container
set -euo pipefail
cd "$(dirname "$0")/../.."
name=cma-pg-test-$$
docker run -d --rm --name "$name" -e POSTGRES_PASSWORD=pg postgres:17-alpine >/dev/null
trap 'docker rm -f "$name" >/dev/null' EXIT
until docker exec "$name" pg_isready -U postgres -q; do sleep 0.5; done
sleep 1
psql() { docker exec -i "$name" psql -U postgres -q -v ON_ERROR_STOP=1 "$@"; }
psql < supabase/tests/auth_stub.sql
for f in supabase/migrations/*.sql; do psql < "$f"; done
payload=$(npx --no tsx scripts/sync-content.ts --print)
psql -v payload="$payload" < supabase/tests/rpc_test.sql
