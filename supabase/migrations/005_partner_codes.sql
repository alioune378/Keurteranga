-- ============================================================================
-- Kër Téranga — partner promo codes
-- Run AFTER 003_studio.sql (SQL Editor → paste → Run). Safe to run more than once.
--
-- • Each partner (influencer, hotel, agency…) gets its own code, e.g. AWA10,
--   with a discount (% or fixed FCFA amount off the total) and optional dates.
-- • Guests type the code in the booking form (or arrive with ?code=AWA10 in the
--   link): the booking is linked to the partner, so every booking is tracked.
-- • The partner receives an email each time a booking with their code is
--   confirmed (or as soon as it is requested — chosen per partner).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Partners and their codes
-- ---------------------------------------------------------------------------
create table if not exists public.promo_partners (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (length(name) between 1 and 120),
  kind              text not null default 'influencer'
                    check (kind in ('influencer','hotel','agency','tour_operator','corporate','association','other')),
  contact_name      text check (contact_name is null or length(contact_name) <= 120),
  email             text check (email is null or length(email) <= 200),
  phone             text check (phone is null or length(phone) <= 30),
  code              text not null unique check (code ~ '^[A-Z0-9_-]{3,30}$'),
  discount_percent  integer check (discount_percent is null or discount_percent between 1 and 100),
  discount_xof      integer check (discount_xof is null or discount_xof > 0),
  notify            boolean not null default true,
  notify_on         text not null default 'confirmed' check (notify_on in ('confirmed','request')),
  locale            text not null default 'fr' check (locale in ('fr','en')),
  active            boolean not null default true,
  starts_on         date,
  ends_on           date,
  notes             text check (notes is null or length(notes) <= 1000),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (discount_percent is null or discount_xof is null),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

drop trigger if exists promo_partners_updated_at on public.promo_partners;
create trigger promo_partners_updated_at before update on public.promo_partners
  for each row execute function public.set_updated_at();

-- Codes are case-insensitive: always stored in capitals, without spaces
create or replace function public.promo_partners_normalize()
returns trigger language plpgsql as $$
begin
  new.code := upper(regexp_replace(coalesce(new.code, ''), '\s', '', 'g'));
  new.email := nullif(lower(trim(coalesce(new.email, ''))), '');
  return new;
end $$;

drop trigger if exists promo_partners_normalize on public.promo_partners;
create trigger promo_partners_normalize before insert or update on public.promo_partners
  for each row execute function public.promo_partners_normalize();

-- ---------------------------------------------------------------------------
-- 2. Each booking remembers the code used (snapshot of the discount)
-- ---------------------------------------------------------------------------
alter table public.bookings add column if not exists promo_code text;
alter table public.bookings add column if not exists promo_partner_id uuid references public.promo_partners(id) on delete set null;
alter table public.bookings add column if not exists promo_discount_percent integer;
alter table public.bookings add column if not exists promo_discount_xof integer;
create index if not exists bookings_promo_partner_idx on public.bookings (promo_partner_id);

-- new email kind: notification to the partner
alter table public.email_outbox drop constraint if exists email_outbox_kind_check;
alter table public.email_outbox add constraint email_outbox_kind_check check (kind in (
  'booking_received','booking_client','booking_admin','booking_cancelled','partner_admin','contact_admin','partner_booking'
));

-- ---------------------------------------------------------------------------
-- 3. Code lookup (active, within its dates — Africa/Dakar calendar)
-- ---------------------------------------------------------------------------
create or replace function public.find_promo(p_code text)
returns public.promo_partners
language sql stable security definer set search_path = public as $$
  select p.* from public.promo_partners p
   where p.code = upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'))
     and p.active
     and (p.starts_on is null or p.starts_on <= (now() at time zone 'Africa/Dakar')::date)
     and (p.ends_on   is null or p.ends_on   >= (now() at time zone 'Africa/Dakar')::date)
   limit 1;
$$;

-- What the booking form may know about a code: the discount only, never the partner's details
create or replace function public.check_promo(p_code text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p public.promo_partners;
begin
  p := public.find_promo(p_code);
  if p.id is null then return jsonb_build_object('valid', false); end if;
  return jsonb_build_object('valid', true, 'code', p.code,
                            'discount_percent', p.discount_percent, 'discount_xof', p.discount_xof);
end $$;

-- ---------------------------------------------------------------------------
-- 4. Booking creation: same atomic logic as 003 + optional promo code
-- ---------------------------------------------------------------------------
drop function if exists public.create_booking(uuid, uuid, integer, text, text, text, text, text, text, text, text);

create or replace function public.create_booking(
  p_idempotency_key uuid,
  p_session_id uuid,
  p_participants integer,
  p_language text,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_country text,
  p_special_requests text,
  p_locale text,
  p_promo_code text default null
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s   public.sessions%rowtype;
  e   public.experiences%rowtype;
  b   public.bookings%rowtype;
  p   public.promo_partners;
  ref text;
  max_p integer;
begin
  if p_idempotency_key is not null then
    select * into b from public.bookings where idempotency_key = p_idempotency_key;
    if found then
      return jsonb_build_object('reference', b.reference, 'booking_id', b.id, 'duplicate', true);
    end if;
  end if;

  -- an unknown / expired code is refused (the guest sees why and can remove it)
  if coalesce(trim(p_promo_code), '') <> '' then
    p := public.find_promo(p_promo_code);
    if p.id is null then raise exception 'INVALID_PROMO'; end if;
  end if;

  select * into s from public.sessions where id = p_session_id for update;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;

  select * into e from public.experiences where id = s.experience_id;
  if not found or e.status <> 'published' then raise exception 'SESSION_NOT_FOUND'; end if;

  if s.status = 'closed' then raise exception 'SESSION_CLOSED'; end if;
  if public.session_starts_at(s.date, s.start_time) <= now() + make_interval(hours => e.booking_cutoff_hours) then
    raise exception 'SESSION_PAST';
  end if;
  if public.is_date_blocked(s.date, s.experience_id) then raise exception 'DATE_BLOCKED'; end if;

  max_p := coalesce(e.max_participants, s.capacity);
  if p_participants is null or p_participants < e.min_participants or p_participants > max_p then
    raise exception 'INVALID_PARTICIPANTS';
  end if;

  if s.booked + p_participants > s.capacity then raise exception 'NOT_ENOUGH_SPOTS'; end if;

  if coalesce(trim(p_first_name), '') = '' or coalesce(trim(p_last_name), '') = ''
     or coalesce(trim(p_phone), '') = ''
     or p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
     or p_language not in ('fr','en') then
    raise exception 'INVALID_INPUT';
  end if;

  loop
    ref := 'KT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.bookings where reference = ref);
  end loop;

  insert into public.bookings (
    reference, idempotency_key, session_id, experience_id, participants, language,
    first_name, last_name, email, phone, country, special_requests, locale, status,
    promo_code, promo_partner_id, promo_discount_percent, promo_discount_xof
  ) values (
    ref, p_idempotency_key, s.id, e.id, p_participants, p_language,
    trim(p_first_name), trim(p_last_name), lower(trim(p_email)), trim(p_phone),
    nullif(trim(p_country), ''), nullif(trim(p_special_requests), ''),
    case when p_locale = 'en' then 'en' else 'fr' end,
    'pending',
    p.code, p.id, p.discount_percent, p.discount_xof
  ) returning * into b;

  insert into public.email_outbox (kind, ref_id) values ('booking_received', b.id), ('booking_admin', b.id);

  -- partner chose to be told as soon as a request arrives
  if p.id is not null and p.notify and p.email is not null and p.notify_on = 'request' then
    insert into public.email_outbox (kind, ref_id) values ('partner_booking', b.id)
    on conflict (kind, ref_id) do nothing;
  end if;

  return jsonb_build_object(
    'reference', b.reference,
    'booking_id', b.id,
    'duplicate', false,
    'status', 'pending',
    'remaining', s.capacity - s.booked - p_participants
  );
end $$;

-- ---------------------------------------------------------------------------
-- 5. Owner confirms → client email + partner email (default behaviour)
-- ---------------------------------------------------------------------------
create or replace function public.admin_confirm_booking(p_booking_id uuid, p_notify boolean default true)
returns void
language plpgsql security definer set search_path = public as $$
declare pid uuid;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  update public.bookings set status = 'confirmed', confirmed_at = now()
   where id = p_booking_id and status = 'pending'
  returning promo_partner_id into pid;
  if not found then raise exception 'BOOKING_NOT_PENDING'; end if;
  if p_notify then
    insert into public.email_outbox (kind, ref_id) values ('booking_client', p_booking_id)
    on conflict (kind, ref_id) do nothing;
  end if;
  if pid is not null and exists (
       select 1 from public.promo_partners
        where id = pid and notify and email is not null and notify_on = 'confirmed') then
    insert into public.email_outbox (kind, ref_id) values ('partner_booking', p_booking_id)
    on conflict (kind, ref_id) do nothing;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 6. Statistics per partner (dashboard)
-- ---------------------------------------------------------------------------
create or replace view public.promo_partner_stats with (security_invoker = true) as
select p.id,
       count(b.id)                                                     as requests,
       count(b.id) filter (where b.status = 'confirmed')               as confirmed,
       coalesce(sum(b.participants) filter (where b.status = 'confirmed'), 0) as guests,
       count(b.id) filter (where b.status = 'cancelled')               as cancelled,
       max(b.created_at)                                               as last_booking_at
  from public.promo_partners p
  left join public.bookings b on b.promo_partner_id = p.id
 group by p.id;

-- ---------------------------------------------------------------------------
-- 7. Privileges & Row Level Security (partners' details: admins only)
-- ---------------------------------------------------------------------------
revoke all on function public.create_booking(uuid, uuid, integer, text, text, text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_booking(uuid, uuid, integer, text, text, text, text, text, text, text, text, text) to service_role;
revoke all on function public.find_promo(text) from public, anon, authenticated;
revoke all on function public.check_promo(text) from public, anon, authenticated;
grant execute on function public.find_promo(text) to service_role;
grant execute on function public.check_promo(text) to service_role;
revoke all on function public.admin_confirm_booking(uuid, boolean) from public, anon;
grant execute on function public.admin_confirm_booking(uuid, boolean) to authenticated;

alter table public.promo_partners enable row level security;
drop policy if exists "promo partners admin" on public.promo_partners;
create policy "promo partners admin" on public.promo_partners
  for all using (public.is_admin()) with check (public.is_admin());

revoke all on public.promo_partners, public.promo_partner_stats from anon;
grant select, insert, update, delete on public.promo_partners to authenticated;
grant select on public.promo_partner_stats to authenticated;
