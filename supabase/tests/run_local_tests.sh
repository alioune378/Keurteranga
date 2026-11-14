#!/usr/bin/env bash
# ============================================================================
# Runs the database acceptance tests against a throw-away local PostgreSQL.
# Usage:  bash supabase/tests/run_local_tests.sh
# Requires: PostgreSQL 15+ binaries (initdb, pg_ctl, psql) on this machine.
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")/../.."

PGBIN="${PGBIN:-$(dirname "$(command -v initdb 2>/dev/null || ls -d /usr/lib/postgresql/*/bin/initdb | tail -1)")}"
TMP="$(mktemp -d)"
PORT="${PORT:-54329}"
export PGHOST="$TMP" PGPORT="$PORT" PGDATABASE=postgres

cleanup() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT

"$PGBIN/initdb" -D "$TMP/data" -U "$(whoami)" --auth=trust >/dev/null
"$PGBIN/pg_ctl" -D "$TMP/data" -o "-k $TMP -p $PORT -c listen_addresses=''" -l "$TMP/log" -w start >/dev/null
export PGUSER="$(whoami)"

PSQL=(psql -X -q -v ON_ERROR_STOP=1)
export PGOPTIONS="-c client_min_messages=warning"

echo "▶ Applying local Supabase stub, migration and sample seed"
"${PSQL[@]}" -f supabase/tests/00_local_supabase_stub.sql
"${PSQL[@]}" -f supabase/migrations/001_schema.sql
"${PSQL[@]}" -c "grant all on all tables in schema public to service_role; grant all on all sequences in schema public to service_role;"
"${PSQL[@]}" -f supabase/seed.sql
"${PSQL[@]}" -tA -c "select 'seed: ' || count(*) || ' sample sessions' from public.sessions;"

echo
echo "▶ TEST 1 — two customers request the LAST seat at the same time"
EXP=$("${PSQL[@]}" -tA -c "select id from public.experiences where slug='atelier-thieboudiene'")
SID=$("${PSQL[@]}" -tA -c "insert into public.sessions (experience_id, date, start_time, capacity)
  values ('$EXP', (now() at time zone 'Africa/Dakar')::date + 12, '11:00', 1) returning id" | head -1)

book_slow() {  # holds the session lock for 2 s before committing
  "${PSQL[@]}" -tA 2>&1 <<SQL
set role service_role;
begin;
select 'customer $1 -> ' || (public.create_booking(gen_random_uuid(), '$SID', 1, 'fr', 'Client', '$1', 'c$1@example.com', '+221770000000', null, null, 'fr') ->> 'reference');
select pg_sleep(2);
commit;
SQL
}
book_fast() {
  "${PSQL[@]}" -tA 2>&1 <<SQL
set role service_role;
select 'customer $1 -> ' || (public.create_booking(gen_random_uuid(), '$SID', 1, 'en', 'Client', '$1', 'c$1@example.com', '+15550000000', null, null, 'en') ->> 'reference');
SQL
}
OUT="$TMP/race"
book_slow A >"$OUT.A" & PA=$!
sleep 0.3
book_fast B >"$OUT.B" & PB=$!
wait $PA || true; wait $PB || true
echo "   A: $(tr '\n' ' ' <"$OUT.A")"
echo "   B: $(tr '\n' ' ' <"$OUT.B")"
read -r N BOOKED STATUS < <("${PSQL[@]}" -tA -F' ' -c "select (select count(*) from public.bookings where session_id='$SID'), booked, status from public.sessions where id='$SID'")
if [[ "$N" == "1" && "$BOOKED" == "1" && "$STATUS" == "full" ]] && grep -q NOT_ENOUGH_SPOTS "$OUT.B"; then
  echo "PASS 1: exactly one booking; the second customer got NOT_ENOUGH_SPOTS (booked=1/1, status=full)"
else
  echo "FAIL 1: bookings=$N booked=$BOOKED status=$STATUS"; exit 1
fi

echo
echo "▶ TEST 1b — 25 simultaneous requests for 5 remaining seats"
SID2=$("${PSQL[@]}" -tA -c "insert into public.sessions (experience_id, date, start_time, capacity)
  values ('$EXP', (now() at time zone 'Africa/Dakar')::date + 13, '11:00', 5) returning id" | head -1)
for i in $(seq 1 25); do
  "${PSQL[@]}" -tA -c "set role service_role; select public.create_booking(gen_random_uuid(), '$SID2', 1, 'fr', 'P', '$i', 'p$i@example.com', '+221770000000', null, null, 'fr') ->> 'reference'" >"$TMP/p$i" 2>&1 &
done
wait
OK=$(grep -l '^KT-' "$TMP"/p* | wc -l | tr -d ' ')
FULL=$(grep -l NOT_ENOUGH_SPOTS "$TMP"/p* | wc -l | tr -d ' ')
BOOKED2=$("${PSQL[@]}" -tA -c "select booked from public.sessions where id='$SID2'")
if [[ "$OK" == "5" && "$FULL" == "20" && "$BOOKED2" == "5" ]]; then
  echo "PASS 1b: 5 bookings accepted, 20 refused, booked=5/5 — no overbooking"
else
  echo "FAIL 1b: ok=$OK refused=$FULL booked=$BOOKED2"; exit 1
fi

echo
echo "▶ TESTS A, 2, 3, 4, cutoff, 7, outbox"
PGOPTIONS="-c client_min_messages=notice" "${PSQL[@]}" -f supabase/tests/acceptance.sql 2>&1 | sed 's/^psql:[^:]*:[0-9]*: //'

echo
echo "▶ TEST 8 — persistence: a NEW connection (like a page refresh) reads the data back"
"${PSQL[@]}" -tA -c "select 'bookings stored: ' || count(*) || ', confirmed: ' || count(*) filter (where status='confirmed') || ', cancelled: ' || count(*) filter (where status='cancelled') from public.bookings"
echo "PASS 8: data read back from PostgreSQL in a separate session"
echo
echo "✅ All database acceptance tests passed."
