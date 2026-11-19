-- ============================================================================
-- Kër Téranga — partner promo code tests (run by run_local_tests.sh)
-- ============================================================================
\set ON_ERROR_STOP on
set client_min_messages = notice;

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'founder@example.com') on conflict do nothing;
insert into public.admin_profiles (user_id, full_name) values ('11111111-1111-1111-1111-111111111111', 'Test Admin') on conflict do nothing;

insert into public.sessions (experience_id, date, start_time, capacity)
select id, (now() at time zone 'Africa/Dakar')::date + 20, '10:00', 10
  from public.experiences where slug = 'atelier-thieboudiene'
returning id as pc_sid \gset

-- partners: code typed in lower case with a space is normalised
insert into public.promo_partners (name, kind, email, code, discount_percent, notify_on)
values ('Awa Influence', 'influencer', ' Awa@Example.com ', 'awa 10', 10, 'confirmed'),
       ('Hôtel Teranga', 'hotel', 'hotel@example.com', 'HOTEL5000', null, 'request');
update public.promo_partners set discount_xof = 5000 where code = 'HOTEL5000';
insert into public.promo_partners (name, code, discount_percent, active) values ('Old', 'OLDCODE', 5, false);
insert into public.promo_partners (name, code, discount_percent, ends_on) values ('Expired', 'EXPIRED', 5, current_date - 1);

do $$
begin
  if not exists (select 1 from public.promo_partners where code = 'AWA10' and email = 'awa@example.com') then
    raise exception 'FAIL P1: code/email not normalised';
  end if;
  raise notice 'PASS P1: codes stored in capitals without spaces, emails lower-cased';
end $$;

-- P2 — check_promo reveals the discount only; inactive/expired codes are invalid
set role service_role;
do $$
declare r jsonb;
begin
  r := public.check_promo('awa10');
  if not (r->>'valid')::boolean or (r->>'discount_percent')::int <> 10 or r ? 'email' then
    raise exception 'FAIL P2: %', r;
  end if;
  if (public.check_promo('OLDCODE')->>'valid')::boolean then raise exception 'FAIL P2: inactive code accepted'; end if;
  if (public.check_promo('EXPIRED')->>'valid')::boolean then raise exception 'FAIL P2: expired code accepted'; end if;
  if (public.check_promo('NOPE')->>'valid')::boolean then raise exception 'FAIL P2: unknown code accepted'; end if;
  raise notice 'PASS P2: valid code returns its discount (no partner details); inactive / expired / unknown refused';
end $$;

-- P3 — booking with a code is linked to the partner; invalid code refused
select public.create_booking(gen_random_uuid(), :'pc_sid', 2, 'fr', 'Fatou', 'Ndiaye', 'fatou.pc@example.com',
  '+221770000001', null, null, 'fr', 'awa10') ->> 'booking_id' as pc_b1 \gset
select public.create_booking(gen_random_uuid(), :'pc_sid', 3, 'en', 'John', 'Smith', 'john.pc@example.com',
  '+15550000001', null, null, 'en', 'HOTEL5000') ->> 'booking_id' as pc_b2 \gset
select public.create_booking(gen_random_uuid(), :'pc_sid', 1, 'fr', 'Sans', 'Code', 'nocode.pc@example.com',
  '+221770000002', null, null, 'fr') ->> 'booking_id' as pc_b3 \gset
do $$
begin
  begin
    perform public.create_booking(gen_random_uuid(), (select id from public.sessions order by created_at desc limit 1),
      1, 'fr', 'X', 'Y', 'x.pc@example.com', '+221770000003', null, null, 'fr', 'EXPIRED');
    raise exception 'FAIL P3: expired code accepted';
  exception when others then
    if sqlerrm not like '%INVALID_PROMO%' then raise; end if;
  end;
end $$;
reset role;

do $$
declare b1 record; b2 record; n int;
begin
  select * into b1 from public.bookings where email = 'fatou.pc@example.com';
  select * into b2 from public.bookings where email = 'john.pc@example.com';
  if b1.promo_code <> 'AWA10' or b1.promo_discount_percent <> 10 or b1.promo_partner_id is null then raise exception 'FAIL P3: b1 %', row_to_json(b1); end if;
  if b2.promo_discount_xof <> 5000 then raise exception 'FAIL P3: b2 %', row_to_json(b2); end if;
  if (select promo_code from public.bookings where email = 'nocode.pc@example.com') is not null then raise exception 'FAIL P3: code on booking without code'; end if;
  if exists (select 1 from public.bookings where email = 'x.pc@example.com') then raise exception 'FAIL P3: booking with invalid code saved'; end if;
  raise notice 'PASS P3: bookings linked to their partner with the discount; invalid code refused, nothing saved';

  -- P4 — "request" partner notified immediately; "confirmed" partner not yet
  select count(*) into n from public.email_outbox where kind = 'partner_booking' and ref_id = b2.id;
  if n <> 1 then raise exception 'FAIL P4: hotel (notify on request) should be queued'; end if;
  select count(*) into n from public.email_outbox where kind = 'partner_booking' and ref_id = b1.id;
  if n <> 0 then raise exception 'FAIL P4: influencer notified before confirmation'; end if;
  raise notice 'PASS P4: partner set to "request" notified at once; partner set to "confirmed" waits';
end $$;

-- P5 — owner confirms → influencer notified once; no partner email for a booking without code
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false) \g /dev/null
set role authenticated;
select public.admin_confirm_booking(:'pc_b1', true) \g /dev/null
select public.admin_confirm_booking(:'pc_b3', true) \g /dev/null
do $$
declare s record;
begin
  if (select count(*) from public.email_outbox where kind = 'partner_booking'
       and ref_id = (select id from public.bookings where email = 'fatou.pc@example.com')) <> 1 then
    raise exception 'FAIL P5: influencer not notified after confirmation';
  end if;
  if exists (select 1 from public.email_outbox where kind = 'partner_booking'
              and ref_id = (select id from public.bookings where email = 'nocode.pc@example.com')) then
    raise exception 'FAIL P5: partner email queued for a booking without code';
  end if;
  raise notice 'PASS P5: confirmation queues exactly one partner email; none without a code';

  -- P6 — admin dashboard stats (RLS as admin)
  select st.* into s from public.promo_partner_stats st
    join public.promo_partners p on p.id = st.id where p.code = 'AWA10';
  if s.requests <> 1 or s.confirmed <> 1 or s.guests <> 2 then raise exception 'FAIL P6: %', row_to_json(s); end if;
  raise notice 'PASS P6: stats per partner (1 request, 1 confirmed, 2 guests)';
end $$;
reset role;

-- P7 — visitors can neither read partners nor check codes directly
set role anon;
do $$
begin
  begin
    perform 1 from public.promo_partners;
    raise exception 'FAIL P7: anon can read promo_partners';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.check_promo('AWA10');
    raise exception 'FAIL P7: anon can call check_promo';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS P7: visitors cannot read partners or probe codes directly (server only, rate-limited)';
end $$;
reset role;
