# Test report — Kër Téranga

Run date: 2026-11-14 · PostgreSQL 16 (local, throw-away instance) · `bash supabase/tests/run_local_tests.sh`

## Coverage vs. the acceptance criteria

| # | Criterion | Status | How |
|---|---|---|---|
| 1 | Two customers request the last seat simultaneously | ✅ **Passed** | Two parallel DB sessions; the first holds the row lock 2 s. Result: 1 booking, 2nd gets `NOT_ENOUGH_SPOTS`. Plus 25 parallel requests for 5 seats → exactly 5 accepted. |
| 2 | Automatic closing of a full session | ✅ **Passed** | Status switches to `full`, availability shows 0, further booking refused. |
| 3 | Cancellation restores capacity | ✅ **Passed** | Admin cancel → seats restored, session reopened, cancellation email queued. |
| 4 | Administrator editing or blocking a session | ✅ **Passed** | Capacity edit, manual close (`SESSION_CLOSED`), blocked date hidden & refused (`DATE_BLOCKED`), booking edit with capacity check. |
| 5 | French and English reservation flows | ⚠️ **Not run here** | Both flows are implemented (UI, messages, server action, emails in FR/EN). The Next.js app could not be built in this environment (package installation was blocked), so the end-to-end browser test must be run after deployment — steps in `PRODUCTION_CHECKLIST.md`. Email templates were rendered in FR and EN: `docs/email-previews/`. |
| 6 | Client and admin notification delivery | ⚠️ **Partially** | Verified at DB level: both emails are queued atomically with each booking, claimed for sending, kept pending on failure. Actual delivery requires Resend credentials (not available) — verify after setup. |
| 7 | Unauthorized access to booking records denied | ✅ **Passed** | Anonymous: no access to bookings / partner inquiries, cannot call `create_booking` or `admin_cancel_booking`. Signed-in non-admin: sees 0 bookings, cannot cancel or edit sessions. Public availability readable without personal data. |
| 8 | Database persistence after page refresh | ✅ **Passed** (DB level) | Data read back from a new connection. In-browser refresh check: after deployment. |
| — | Booking cut-off (Africa/Dakar) | ✅ Passed | Session inside the 24 h window refused (`SESSION_PAST`). |
| — | Idempotency (double click / retry) | ✅ Passed | Same key twice → one booking, same reference returned. |
| — | Partnership inquiry notification | ✅ Passed | Inquiry + admin email queued in the same transaction. |

Additional static checks performed: TypeScript syntax of every file; type-check of the
project's own code (external libraries stubbed — a full `tsc`/`next build` with real
packages must still run on Netlify); FR/EN message files have identical keys; email
HTML escaping of user input.

## Raw output of the last run

```
▶ Applying local Supabase stub, migration and sample seed
seed: 24 sample sessions
▶ TEST 1 — two customers request the LAST seat at the same time
   A: customer A -> KT-0776EF  
   B: ERROR:  NOT_ENOUGH_SPOTS CONTEXT:  PL/pgSQL function create_booking(uuid,uuid,integer,text,text,text,text,text,text,text,text) line 35 at RAISE 
PASS 1: exactly one booking; the second customer got NOT_ENOUGH_SPOTS (booked=1/1, status=full)
▶ TEST 1b — 25 simultaneous requests for 5 remaining seats
PASS 1b: 5 bookings accepted, 20 refused, booked=5/5 — no overbooking
▶ TESTS A, 2, 3, 4, cutoff, 7, outbox
NOTICE:  PASS A: booking persisted once (idempotent), capacity updated, 2 emails queued
ref1 = KT-1173AA  / retry returned = KT-1173AA
NOTICE:  PASS 2: session closed automatically when full (status=full, remaining=0)
NOTICE:  PASS 2b: booking on a full session refused (NOT_ENOUGH_SPOTS)
NOTICE:  PASS 3: cancellation restored 2 spots, session reopened, cancellation email queued
NOTICE:  PASS 4a: admin edited capacity and closed the session; bookings refused (SESSION_CLOSED)
NOTICE:  PASS 4b: blocked date hidden from the calendar and refused (DATE_BLOCKED)
NOTICE:  PASS 4c: admin modified a booking, capacity recalculated
NOTICE:  PASS cutoff: booking refused inside the 24 h cutoff (Africa/Dakar time)
NOTICE:  PASS 7a: anonymous visitor denied (bookings table)
NOTICE:  PASS 7b: anonymous visitor cannot call create_booking directly (server only)
NOTICE:  PASS 7c: anonymous visitor denied (partner inquiries)
NOTICE:  PASS 7d: anonymous visitor cannot cancel bookings
NOTICE:  PASS 7e/7f: signed-in non-admin sees 0 bookings and cannot cancel or edit
NOTICE:  PASS 7g: non-admin could not modify sessions
NOTICE:  PASS 7h: anonymous visitor can read availability (27 sessions)
NOTICE:  PASS outbox: 17 emails claimed; on failure they stay pending and are retried later
NOTICE:  PASS partner: inquiry stored and admin notification queued in the same transaction
=== acceptance.sql finished ===
▶ TEST 8 — persistence: a NEW connection (like a page refresh) reads the data back
bookings stored: 8, confirmed: 7, cancelled: 1
PASS 8: data read back from PostgreSQL in a separate session
✅ All database acceptance tests passed.
```
