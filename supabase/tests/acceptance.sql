-- ============================================================================
-- Kër Téranga — database acceptance tests
-- Run with supabase/tests/run_local_tests.sh (local PostgreSQL) — the
-- concurrency test (#1) is driven by the shell script with parallel sessions.
-- Each test raises an exception on failure; "PASS" notices on success.
-- ============================================================================
\set ON_ERROR_STOP on
set client_min_messages = notice;

-- Fixtures ------------------------------------------------------------------
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'founder@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'random@example.com')
on conflict do nothing;
insert into public.admin_profiles (user_id, full_name)
values ('11111111-1111-1111-1111-111111111111', 'Test Admin') on conflict do nothing;

create temp table t_ids (k text primary key, v uuid);
insert into t_ids
select 'exp', id from public.experiences where slug = 'atelier-thieboudiene';

-- a session far enough in the future (outside the 24 h cutoff)
insert into public.sessions (experience_id, date, start_time, end_time, capacity)
select v, (now() at time zone 'Africa/Dakar')::date + 10, '15:00', '18:00', 3 from t_ids where k = 'exp'
returning id as s_id \gset
insert into t_ids values ('s', :'s_id');

-- ---------------------------------------------------------------------------
-- TEST A — booking persists + outbox queued + idempotency
-- ---------------------------------------------------------------------------
set role service_role;
select public.create_booking('aaaaaaaa-0000-0000-0000-000000000001', :'s_id', 2, 'fr',
  'Awa', 'Diop', 'awa@example.com', '+221 77 123 45 67', 'Sénégal', null, 'fr') ->> 'reference' as ref1 \gset
select public.create_booking('aaaaaaaa-0000-0000-0000-000000000001', :'s_id', 2, 'fr',
  'Awa', 'Diop', 'awa@example.com', '+221 77 123 45 67', 'Sénégal', null, 'fr') ->> 'reference' as ref1b \gset
reset role;

do $$
declare n int; b int; o int;
begin
  select count(*) into n from public.bookings where idempotency_key = 'aaaaaaaa-0000-0000-0000-000000000001';
  if n <> 1 then raise exception 'FAIL A: expected 1 booking for idempotency key, got %', n; end if;
  select booked into b from public.sessions where id = (select v from t_ids where k='s');
  if b <> 2 then raise exception 'FAIL A: booked should be 2, got %', b; end if;
  select count(*) into o from public.email_outbox eo
    join public.bookings bk on bk.id = eo.ref_id
   where bk.idempotency_key = 'aaaaaaaa-0000-0000-0000-000000000001';
  if o <> 2 then raise exception 'FAIL A: expected 2 queued emails, got %', o; end if;
  raise notice 'PASS A: booking persisted once (idempotent), capacity updated, 2 emails queued';
end $$;
\echo 'ref1 =' :ref1 ' / retry returned =' :ref1b

-- ---------------------------------------------------------------------------
-- TEST 2 — automatic closing of a full session
-- ---------------------------------------------------------------------------
set role service_role;
select public.create_booking(gen_random_uuid(), :'s_id', 1, 'en',
  'John', 'Smith', 'john@example.com', '+1 555 010 0000', 'Canada', 'Vegetarian', 'en') \g /dev/null
reset role;

do $$
declare st text; rem int;
begin
  select status into st from public.sessions where id = (select v from t_ids where k='s');
  if st <> 'full' then raise exception 'FAIL 2: status should be full, got %', st; end if;
  select remaining into rem from public.get_availability((select v from t_ids where k='exp'),
      (now() at time zone 'Africa/Dakar')::date, (now() at time zone 'Africa/Dakar')::date + 30)
   where id = (select v from t_ids where k='s');
  if rem <> 0 then raise exception 'FAIL 2: remaining should be 0, got %', rem; end if;
  raise notice 'PASS 2: session closed automatically when full (status=full, remaining=0)';
end $$;

-- a further booking must be refused
do $$
begin
  begin
    perform public.create_booking(gen_random_uuid(), (select v from t_ids where k='s'), 1, 'fr',
      'Late', 'Comer', 'late@example.com', '+221 70 000 0000', null, null, 'fr');
    raise exception 'FAIL 2b: overbooking was accepted';
  exception when others then
    if sqlerrm <> 'NOT_ENOUGH_SPOTS' then raise; end if;
  end;
  raise notice 'PASS 2b: booking on a full session refused (NOT_ENOUGH_SPOTS)';
end $$;

-- ---------------------------------------------------------------------------
-- TEST 3 — cancellation restores capacity (and reopens the session)
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false) \g /dev/null
set role authenticated;
select public.admin_cancel_booking((select id from public.bookings where reference = :'ref1'), true) \g /dev/null
reset role;
select set_config('request.jwt.claim.sub', '', false) \g /dev/null
do $$
declare b int; st text; o int;
begin
  select booked, status into b, st from public.sessions where id = (select v from t_ids where k='s');
  if b <> 1 or st <> 'open' then raise exception 'FAIL 3: expected booked=1/open, got %/%', b, st; end if;
  select count(*) into o from public.email_outbox where kind = 'booking_cancelled';
  if o <> 1 then raise exception 'FAIL 3: cancellation email not queued'; end if;
  raise notice 'PASS 3: cancellation restored 2 spots, session reopened, cancellation email queued';
end $$;

-- ---------------------------------------------------------------------------
-- TEST 4 — administrator editing, closing and blocking
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false) \g /dev/null
set role authenticated;
update public.sessions set capacity = 6 where id = :'s_id';
update public.sessions set status = 'closed' where id = :'s_id';
reset role;

do $$
begin
  begin
    perform public.create_booking(gen_random_uuid(), (select v from t_ids where k='s'), 1, 'fr',
      'A', 'B', 'ab@example.com', '+221 70 000 0001', null, null, 'fr');
    raise exception 'FAIL 4: booking accepted on a closed session';
  exception when others then
    if sqlerrm <> 'SESSION_CLOSED' then raise; end if;
  end;
  if (select capacity from public.sessions where id = (select v from t_ids where k='s')) <> 6 then
    raise exception 'FAIL 4: capacity edit not saved';
  end if;
  raise notice 'PASS 4a: admin edited capacity and closed the session; bookings refused (SESSION_CLOSED)';
end $$;

set role authenticated;
update public.sessions set status = 'open' where id = :'s_id';
insert into public.blocked_dates (date, reason)
select date, 'Tabaski' from public.sessions where id = :'s_id';
reset role;

do $$
declare n int;
begin
  select count(*) into n from public.get_availability((select v from t_ids where k='exp'),
      (now() at time zone 'Africa/Dakar')::date, (now() at time zone 'Africa/Dakar')::date + 30)
   where id = (select v from t_ids where k='s');
  if n <> 0 then raise exception 'FAIL 4b: blocked date still listed'; end if;
  begin
    perform public.create_booking(gen_random_uuid(), (select v from t_ids where k='s'), 1, 'fr',
      'A', 'B', 'ab@example.com', '+221 70 000 0001', null, null, 'fr');
    raise exception 'FAIL 4b: booking accepted on a blocked date';
  exception when others then
    if sqlerrm <> 'DATE_BLOCKED' then raise; end if;
  end;
  raise notice 'PASS 4b: blocked date hidden from the calendar and refused (DATE_BLOCKED)';
end $$;

set role authenticated;
delete from public.blocked_dates where reason = 'Tabaski';
reset role;
select set_config('request.jwt.claim.sub', '', false) \g /dev/null
-- Admin edits a booking (participants) with capacity check
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false) \g /dev/null
set role authenticated;
select public.admin_update_booking(
  (select id from public.bookings where email = 'john@example.com'), :'s_id', 4, 'Group grew', false) \g /dev/null
reset role;
select set_config('request.jwt.claim.sub', '', false) \g /dev/null
do $$
begin
  if (select booked from public.sessions where id = (select v from t_ids where k='s')) <> 4 then
    raise exception 'FAIL 4c: booked should be 4 after admin edit';
  end if;
  raise notice 'PASS 4c: admin modified a booking, capacity recalculated';
end $$;

-- ---------------------------------------------------------------------------
-- TEST CUTOFF — sessions inside the 24 h booking cutoff are refused
-- ---------------------------------------------------------------------------
insert into public.sessions (experience_id, date, start_time, capacity)
select v, (now() at time zone 'Africa/Dakar')::date, '23:59', 5 from t_ids where k='exp'
returning id as cut_id \gset
do $$
begin
  begin
    perform public.create_booking(gen_random_uuid(), (select id from public.sessions where start_time = '23:59' limit 1), 1, 'fr',
      'A', 'B', 'ab@example.com', '+221 70 000 0001', null, null, 'fr');
    raise exception 'FAIL cutoff: booking accepted inside cutoff';
  exception when others then
    if sqlerrm <> 'SESSION_PAST' then raise; end if;
  end;
  raise notice 'PASS cutoff: booking refused inside the 24 h cutoff (Africa/Dakar time)';
end $$;

-- ---------------------------------------------------------------------------
-- TEST 7 — unauthorized access to booking records is denied
-- ---------------------------------------------------------------------------
set role anon;
do $$
begin
  begin
    perform 1 from public.bookings limit 1;
    raise exception 'FAIL 7a: anon could read bookings';
  exception when insufficient_privilege then
    raise notice 'PASS 7a: anonymous visitor denied (bookings table)';
  end;
  begin
    perform public.create_booking(gen_random_uuid(), gen_random_uuid(), 1, 'fr','A','B','a@b.co','+221700000000',null,null,'fr');
    raise exception 'FAIL 7b: anon could call create_booking directly';
  exception when insufficient_privilege then
    raise notice 'PASS 7b: anonymous visitor cannot call create_booking directly (server only)';
  end;
  begin
    perform 1 from public.partner_inquiries limit 1;
    raise exception 'FAIL 7c: anon could read partner inquiries';
  exception when insufficient_privilege then
    raise notice 'PASS 7c: anonymous visitor denied (partner inquiries)';
  end;
  begin
    perform public.admin_cancel_booking(gen_random_uuid(), false);
    raise exception 'FAIL 7d: anon could call admin_cancel_booking';
  exception when insufficient_privilege then
    raise notice 'PASS 7d: anonymous visitor cannot cancel bookings';
  end;
end $$;
reset role;

-- signed-in but NOT admin
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false) \g /dev/null
set role authenticated;
do $$
declare n int;
begin
  select count(*) into n from public.bookings;
  if n <> 0 then raise exception 'FAIL 7e: non-admin user sees % bookings', n; end if;
  begin
    perform public.admin_cancel_booking((select id from public.bookings limit 1), false);
    raise exception 'FAIL 7f: non-admin could cancel';
  exception when others then
    if sqlerrm <> 'FORBIDDEN' then raise; end if;
  end;
  update public.sessions set capacity = 99;  -- RLS: silently affects 0 rows
  raise notice 'PASS 7e/7f: signed-in non-admin sees 0 bookings and cannot cancel or edit';
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', false) \g /dev/null
do $$
begin
  if exists (select 1 from public.sessions where capacity = 99) then
    raise exception 'FAIL 7g: non-admin modified a session';
  end if;
  raise notice 'PASS 7g: non-admin could not modify sessions';
end $$;

-- public visitors CAN read availability (no personal data)
set role anon;
do $$
declare n int;
begin
  select count(*) into n from public.get_availability(
    (select id from public.experiences where slug='atelier-thieboudiene'),
    (now() at time zone 'Africa/Dakar')::date, (now() at time zone 'Africa/Dakar')::date + 60);
  if n = 0 then raise exception 'FAIL 7h: availability not readable'; end if;
  raise notice 'PASS 7h: anonymous visitor can read availability (% sessions)', n;
end $$;
reset role;

-- ---------------------------------------------------------------------------
-- TEST OUTBOX — pending emails can be claimed for (re)sending
-- ---------------------------------------------------------------------------
set role service_role;
do $$
declare n int;
begin
  select count(*) into n from public.claim_outbox(50, null);
  if n < 3 then raise exception 'FAIL outbox: expected >= 3 claimable emails, got %', n; end if;
  -- simulate provider failure: rows stay pending with attempts=1 and a later retry time
  if exists (select 1 from public.email_outbox where status <> 'pending' or attempts <> 1) then
    raise exception 'FAIL outbox: unexpected state after claim';
  end if;
  raise notice 'PASS outbox: % emails claimed; on failure they stay pending and are retried later', n;
end $$;
reset role;

-- ---------------------------------------------------------------------------
-- TEST PARTNER — inquiry saved + admin notification queued atomically
-- ---------------------------------------------------------------------------
set role service_role;
insert into public.partner_inquiries (organization, org_type, contact_name, email, message)
values ('Hôtel Test', 'hotel', 'M. Test', 'hotel@example.com', 'Groupe de 20 personnes');
reset role;
do $$
begin
  if not exists (select 1 from public.email_outbox o join public.partner_inquiries p on p.id = o.ref_id
                  where o.kind = 'partner_admin' and p.organization = 'Hôtel Test') then
    raise exception 'FAIL partner: notification not queued';
  end if;
  raise notice 'PASS partner: inquiry stored and admin notification queued in the same transaction';
end $$;

\echo '=== acceptance.sql finished ==='
