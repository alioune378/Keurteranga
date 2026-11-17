-- ============================================================================
-- Kër Téranga Studio — acceptance tests (run by run_local_tests.sh after
-- acceptance.sql; admin user 1111… already exists)
-- ============================================================================
\set ON_ERROR_STOP 1

create temp table st_ids (k text primary key, v uuid);
grant all on st_ids to public;

with ins as (
  insert into public.sessions (experience_id, date, start_time, capacity, price_xof, label)
  select id, (now() at time zone 'Africa/Dakar')::date + 20, '12:00', 3, 15000,
         '{"fr":"Thiéboudiène spécial","en":"Special Thiéboudiène"}'::jsonb
    from public.experiences where slug = 'atelier-thieboudiene'
  returning id
)
insert into st_ids select 's', id from ins;

-- ---------------------------------------------------------------------------
-- S1 — a customer booking arrives as a PENDING request and holds its seats
-- ---------------------------------------------------------------------------
set role service_role;
select public.create_booking(gen_random_uuid(), (select v from st_ids where k='s'), 2, 'fr',
  'Awa', 'Ndiaye', 'awa.studio@example.com', '+221 77 000 0000', 'Sénégal', null, 'fr') \g /dev/null
reset role;
do $$
declare st text; b int; c int; rec int;
begin
  select status into st from public.bookings where email = 'awa.studio@example.com';
  if st <> 'pending' then raise exception 'FAIL S1: new booking should be pending, got %', st; end if;
  select booked, confirmed into b, c from public.sessions where id = (select v from st_ids where k='s');
  if b <> 2 or c <> 0 then raise exception 'FAIL S1: expected booked=2 confirmed=0, got %/%', b, c; end if;
  select count(*) into rec from public.email_outbox o join public.bookings x on x.id = o.ref_id
   where x.email = 'awa.studio@example.com' and o.kind in ('booking_received','booking_admin');
  if rec <> 2 then raise exception 'FAIL S1: request-received + owner emails not queued (%)', rec; end if;
  raise notice 'PASS S1: booking stored as a request (pending), 2 seats held, client + owner emails queued';
end $$;

-- ---------------------------------------------------------------------------
-- S2 — public calendar: seats held but NOT shown as booked until confirmed;
--      special price + label are exposed
-- ---------------------------------------------------------------------------
set role anon;
do $$
declare r record;
begin
  select * into r from public.get_availability(
    (select id from public.experiences where slug='atelier-thieboudiene'),
    (now() at time zone 'Africa/Dakar')::date + 20, (now() at time zone 'Africa/Dakar')::date + 20)
   where start_time = '12:00';
  if r.remaining <> 1 or r.confirmed <> 0 then raise exception 'FAIL S2: remaining/confirmed = %/%', r.remaining, r.confirmed; end if;
  if r.price_xof <> 15000 or r.label ->> 'fr' <> 'Thiéboudiène spécial' then raise exception 'FAIL S2: special price/label missing'; end if;
  raise notice 'PASS S2: public calendar shows 1 seat left, 0 confirmed, special price 15000 + label';
end $$;
reset role;

-- ---------------------------------------------------------------------------
-- S3 — anonymous visitors / non-admins cannot confirm
-- ---------------------------------------------------------------------------
set role anon;
do $$
begin
  begin
    perform public.admin_confirm_booking((select id from public.bookings where email='awa.studio@example.com'), true);
    raise exception 'FAIL S3: anon confirmed a booking';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS S3: visitors cannot call admin_confirm_booking';
end $$;
reset role;

-- ---------------------------------------------------------------------------
-- S4 — owner confirms → shown as booked publicly, confirmation email queued
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false) \g /dev/null
set role authenticated;
select public.admin_confirm_booking((select id from public.bookings where email='awa.studio@example.com'), true) \g /dev/null
reset role;
select set_config('request.jwt.claim.sub', '', false) \g /dev/null
do $$
declare st text; ca timestamptz; c int; q int;
begin
  select status, confirmed_at into st, ca from public.bookings where email='awa.studio@example.com';
  if st <> 'confirmed' or ca is null then raise exception 'FAIL S4: status=% confirmed_at=%', st, ca; end if;
  select confirmed into c from public.sessions where id = (select v from st_ids where k='s');
  if c <> 2 then raise exception 'FAIL S4: confirmed seats should be 2, got %', c; end if;
  select count(*) into q from public.email_outbox o join public.bookings x on x.id = o.ref_id
   where x.email='awa.studio@example.com' and o.kind = 'booking_client';
  if q <> 1 then raise exception 'FAIL S4: confirmation email not queued'; end if;
  raise notice 'PASS S4: owner confirmed → booking confirmed, 2 seats shown as booked, confirmation email queued';
end $$;

-- confirming twice is refused (no duplicate email)
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false) \g /dev/null
set role authenticated;
do $$
begin
  begin
    perform public.admin_confirm_booking((select id from public.bookings where email='awa.studio@example.com'), true);
    raise exception 'FAIL S4b: double confirmation accepted';
  exception when others then
    if sqlerrm <> 'BOOKING_NOT_PENDING' then raise; end if;
  end;
  raise notice 'PASS S4b: a booking cannot be confirmed twice';
end $$;
reset role;

-- ---------------------------------------------------------------------------
-- S5 — last seat requested, then DECLINED by the owner → seat released
-- ---------------------------------------------------------------------------
set role service_role;
select public.create_booking(gen_random_uuid(), (select v from st_ids where k='s'), 1, 'en',
  'John', 'Smith', 'john.studio@example.com', '+1 555 000 0000', 'USA', null, 'en') \g /dev/null
reset role;
do $$
declare b int; c int; st text;
begin
  select booked, confirmed, status into b, c, st from public.sessions where id = (select v from st_ids where k='s');
  if b <> 3 or c <> 2 or st <> 'full' then raise exception 'FAIL S5: expected 3 held/2 confirmed/full, got %/%/%', b, c, st; end if;
end $$;
set role authenticated;
select public.admin_cancel_booking((select id from public.bookings where email='john.studio@example.com'), true) \g /dev/null
reset role;
select set_config('request.jwt.claim.sub', '', false) \g /dev/null
do $$
declare b int; c int; st text;
begin
  select booked, confirmed, status into b, c, st from public.sessions where id = (select v from st_ids where k='s');
  if b <> 2 or c <> 2 or st <> 'open' then raise exception 'FAIL S5: expected 2/2/open after decline, got %/%/%', b, c, st; end if;
  raise notice 'PASS S5: pending request on the last seat declined → seat released, session reopened';
end $$;

-- ---------------------------------------------------------------------------
-- S6 — content modules: drafts and expired items are invisible to visitors
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false) \g /dev/null
set role authenticated;
insert into public.announcements (status, placement, title) values
  ('published', 'banner', '{"fr":"Atelier spécial le 12 décembre"}'),
  ('draft',     'home',   '{"fr":"Brouillon"}'),
  ('published', 'home',   '{"fr":"Expirée"}');
update public.announcements set ends_on = (now() at time zone 'Africa/Dakar')::date - 1 where title->>'fr' = 'Expirée';
insert into public.offers (status, title, discount_percent, ends_on)
values ('published', '{"fr":"Week-end Thiéboudiène"}', 10, (now() at time zone 'Africa/Dakar')::date + 5);
insert into public.media (title, file_url, mime, show_on_home) values ('{"fr":"Affiche"}', 'https://x/a.pdf', 'application/pdf', true);
update public.site_settings set contact = '{"email":"owner@example.com"}' where id = 1;
reset role;
select set_config('request.jwt.claim.sub', '', false) \g /dev/null

set role anon;
do $$
declare a int; o int; m int; e text;
begin
  select count(*) into a from public.announcements;
  if a <> 1 then raise exception 'FAIL S6: visitors see % announcements (expected 1 published, in date)', a; end if;
  select count(*) into o from public.offers;
  select count(*) into m from public.media;
  select contact->>'email' into e from public.site_settings;
  if o <> 1 or m <> 1 or e <> 'owner@example.com' then raise exception 'FAIL S6: offers=% media=% email=%', o, m, e; end if;
  begin
    insert into public.announcements (status, title) values ('published', '{"fr":"hack"}');
    raise exception 'FAIL S6: visitor wrote an announcement';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS S6: visitors see only published, in-date content; cannot write; settings readable';
end $$;
reset role;

\echo '=== studio.sql finished ==='
