-- ============================================================================
-- Kër Téranga Studio — owner-managed business dashboard
-- Run AFTER 001_schema.sql and 002_storage.sql (SQL Editor → paste → Run).
-- Safe to run more than once.
--
-- 1. Booking requests: new bookings arrive as "pending"; the owner confirms
--    (or declines) them in the dashboard. Pending requests HOLD their seats so
--    a session can never be over-booked; the public calendar shows a session as
--    "Réservé / Booked" once confirmed bookings fill it.
-- 2. Special price / label per session (e.g. "Thiéboudiène spécial 12 décembre").
-- 3. Communications (announcements), special offers, flyers & media library,
--    editable website content and contact details.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Booking requests (pending → confirmed / cancelled)
-- ---------------------------------------------------------------------------
alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings
  add constraint bookings_status_check check (status in ('pending','confirmed','cancelled'));
alter table public.bookings alter column status set default 'pending';
alter table public.bookings add column if not exists confirmed_at timestamptz;
-- existing bookings were confirmed automatically by the previous version
update public.bookings set confirmed_at = coalesce(confirmed_at, created_at) where status = 'confirmed';

-- seats taken by CONFIRMED bookings only (shown publicly as "booked")
alter table public.sessions add column if not exists confirmed integer not null default 0 check (confirmed >= 0);
-- optional special price and label for one session (special events)
alter table public.sessions add column if not exists price_xof integer check (price_xof is null or price_xof >= 0);
alter table public.sessions add column if not exists label jsonb not null default '{}'::jsonb;

-- booked = seats held by pending + confirmed bookings (capacity control)
create or replace function public.sync_session_booked()
returns trigger language plpgsql security definer set search_path = public as $$
declare sid uuid;
begin
  for sid in
    select distinct x from unnest(array[
      case when tg_op in ('UPDATE','DELETE') then old.session_id end,
      case when tg_op in ('INSERT','UPDATE') then new.session_id end
    ]) as x where x is not null
  loop
    update public.sessions s
       set booked = coalesce((select sum(b.participants) from public.bookings b
                               where b.session_id = sid and b.status in ('pending','confirmed')), 0),
           confirmed = coalesce((select sum(b.participants) from public.bookings b
                               where b.session_id = sid and b.status = 'confirmed'), 0)
     where s.id = sid;
  end loop;
  return null;
end $$;

-- recompute every session once
update public.sessions s set
  booked = coalesce((select sum(b.participants) from public.bookings b
                      where b.session_id = s.id and b.status in ('pending','confirmed')), 0),
  confirmed = coalesce((select sum(b.participants) from public.bookings b
                      where b.session_id = s.id and b.status = 'confirmed'), 0);

-- new email kind: "request received" (client)
alter table public.email_outbox drop constraint if exists email_outbox_kind_check;
alter table public.email_outbox add constraint email_outbox_kind_check check (kind in (
  'booking_received','booking_client','booking_admin','booking_cancelled','partner_admin','contact_admin'
));

-- Public availability: adds confirmed seats, special price and label
drop function if exists public.get_availability(uuid, date, date);
create or replace function public.get_availability(p_experience_id uuid, p_from date, p_to date)
returns table (
  id uuid, date date, start_time time, end_time time, capacity integer, remaining integer,
  confirmed integer, status text, price_xof integer, label jsonb
)
language sql stable security definer set search_path = public as $$
  select s.id, s.date, s.start_time, s.end_time, s.capacity,
         greatest(s.capacity - s.booked, 0) as remaining,
         s.confirmed,
         s.status, s.price_xof, s.label
    from public.sessions s
    join public.experiences e on e.id = s.experience_id and e.status = 'published'
   where s.experience_id = p_experience_id
     and s.status in ('open','full')
     and s.date between p_from and p_to
     and public.session_starts_at(s.date, s.start_time)
         > now() + make_interval(hours => e.booking_cutoff_hours)
     and not public.is_date_blocked(s.date, s.experience_id)
   order by s.date, s.start_time;
$$;
grant execute on function public.get_availability(uuid, date, date) to anon, authenticated;

-- Booking creation: same atomic logic, but the booking is a PENDING request
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
  p_locale text
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s   public.sessions%rowtype;
  e   public.experiences%rowtype;
  b   public.bookings%rowtype;
  ref text;
  max_p integer;
begin
  if p_idempotency_key is not null then
    select * into b from public.bookings where idempotency_key = p_idempotency_key;
    if found then
      return jsonb_build_object('reference', b.reference, 'booking_id', b.id, 'duplicate', true);
    end if;
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
    first_name, last_name, email, phone, country, special_requests, locale, status
  ) values (
    ref, p_idempotency_key, s.id, e.id, p_participants, p_language,
    trim(p_first_name), trim(p_last_name), lower(trim(p_email)), trim(p_phone),
    nullif(trim(p_country), ''), nullif(trim(p_special_requests), ''),
    case when p_locale = 'en' then 'en' else 'fr' end,
    'pending'
  ) returning * into b;

  -- "request received" to the client + notification to the owner
  insert into public.email_outbox (kind, ref_id) values ('booking_received', b.id), ('booking_admin', b.id);

  return jsonb_build_object(
    'reference', b.reference,
    'booking_id', b.id,
    'duplicate', false,
    'status', 'pending',
    'remaining', s.capacity - s.booked - p_participants
  );
end $$;

-- Owner confirms a request → seats shown as booked on the website, email sent
create or replace function public.admin_confirm_booking(p_booking_id uuid, p_notify boolean default true)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  update public.bookings set status = 'confirmed', confirmed_at = now()
   where id = p_booking_id and status = 'pending';
  if not found then raise exception 'BOOKING_NOT_PENDING'; end if;
  if p_notify then
    insert into public.email_outbox (kind, ref_id) values ('booking_client', p_booking_id)
    on conflict (kind, ref_id) do nothing;
  end if;
end $$;

-- Cancel a confirmed booking OR decline a pending request (seats released)
create or replace function public.admin_cancel_booking(p_booking_id uuid, p_notify boolean default true)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  update public.bookings set status = 'cancelled', cancelled_at = now()
   where id = p_booking_id and status in ('pending','confirmed');
  if found and p_notify then
    insert into public.email_outbox (kind, ref_id) values ('booking_cancelled', p_booking_id)
    on conflict (kind, ref_id) do nothing;
  end if;
end $$;

-- Admin edit: capacity counts pending + confirmed seats
create or replace function public.admin_update_booking(
  p_booking_id uuid,
  p_session_id uuid,
  p_participants integer,
  p_admin_notes text,
  p_force boolean default false
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  b public.bookings%rowtype;
  s public.sessions%rowtype;
  other integer;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;

  select * into b from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;

  select * into s from public.sessions where id = p_session_id for update;
  if not found then raise exception 'SESSION_NOT_FOUND'; end if;

  if p_participants < 1 then raise exception 'INVALID_PARTICIPANTS'; end if;

  if b.status in ('pending','confirmed') and not p_force then
    select coalesce(sum(participants), 0) into other from public.bookings
     where session_id = s.id and status in ('pending','confirmed') and id <> b.id;
    if other + p_participants > s.capacity then raise exception 'NOT_ENOUGH_SPOTS'; end if;
  end if;

  update public.bookings
     set session_id = s.id, experience_id = s.experience_id,
         participants = p_participants, admin_notes = p_admin_notes
   where id = b.id;
end $$;

revoke all on function public.admin_confirm_booking(uuid, boolean) from public, anon;
grant execute on function public.admin_confirm_booking(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Communications (announcements)
--    placement: 'banner' = thin strip at the top of every page
--               'home'   = card in the "Actualités" section of the homepage
-- ---------------------------------------------------------------------------
create table if not exists public.announcements (
  id           uuid primary key default gen_random_uuid(),
  status       text not null default 'draft' check (status in ('draft','published')),
  placement    text not null default 'home' check (placement in ('banner','home')),
  title        jsonb not null default '{}'::jsonb,
  body         jsonb not null default '{}'::jsonb,
  cta_label    jsonb not null default '{}'::jsonb,
  cta_url      text check (cta_url is null or length(cta_url) <= 500),
  event_date   date,                         -- optional: date of the event announced
  image_url    text,
  image_path   text,
  starts_on    date,                         -- visible from (inclusive), null = immediately
  ends_on      date,                         -- visible until (inclusive), null = no end
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
drop trigger if exists announcements_updated_at on public.announcements;
create trigger announcements_updated_at before update on public.announcements
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Special offers
-- ---------------------------------------------------------------------------
create table if not exists public.offers (
  id                uuid primary key default gen_random_uuid(),
  status            text not null default 'draft' check (status in ('draft','published')),
  experience_id     uuid references public.experiences(id) on delete set null,
  title             jsonb not null default '{}'::jsonb,
  description       jsonb not null default '{}'::jsonb,
  discount_percent  integer check (discount_percent is null or discount_percent between 1 and 100),
  offer_price_xof   integer check (offer_price_xof is null or offer_price_xof >= 0),
  code              text check (code is null or length(code) <= 40),
  image_url         text,
  image_path        text,
  starts_on         date,
  ends_on           date,
  show_on_home      boolean not null default true,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);
drop trigger if exists offers_updated_at on public.offers;
create trigger offers_updated_at before update on public.offers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Media library (flyers, posters, promotional images, PDFs)
-- ---------------------------------------------------------------------------
create table if not exists public.media (
  id            uuid primary key default gen_random_uuid(),
  title         jsonb not null default '{}'::jsonb,
  kind          text not null default 'flyer' check (kind in ('flyer','poster','photo','other')),
  file_url      text not null,
  storage_path  text,
  mime          text not null,
  show_on_home  boolean not null default false,
  starts_on     date,
  ends_on       date,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 5. Website content & business information (single row, id = 1)
--    Every field is optional: empty = the site keeps its built-in text.
-- ---------------------------------------------------------------------------
create table if not exists public.site_settings (
  id          integer primary key default 1 check (id = 1),
  contact     jsonb not null default '{}'::jsonb,  -- email, phone, whatsapp, street, instagram, facebook, tiktok, linkedin
  content     jsonb not null default '{}'::jsonb,  -- hero_title, hero_subtitle, founder_name, founder_bio, history … {"fr","en"}
  updated_at  timestamptz not null default now()
);
insert into public.site_settings (id) values (1) on conflict (id) do nothing;
drop trigger if exists site_settings_updated_at on public.site_settings;
create trigger site_settings_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: visitors read published + in-date items only; admins do everything
-- ---------------------------------------------------------------------------
alter table public.announcements enable row level security;
alter table public.offers        enable row level security;
alter table public.media         enable row level security;
alter table public.site_settings enable row level security;

drop policy if exists "announcements read" on public.announcements;
create policy "announcements read" on public.announcements for select using (
  public.is_admin() or (status = 'published'
    and (starts_on is null or starts_on <= (now() at time zone 'Africa/Dakar')::date)
    and (ends_on   is null or ends_on   >= (now() at time zone 'Africa/Dakar')::date))
);
drop policy if exists "announcements admin" on public.announcements;
create policy "announcements admin" on public.announcements
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "offers read" on public.offers;
create policy "offers read" on public.offers for select using (
  public.is_admin() or (status = 'published'
    and (starts_on is null or starts_on <= (now() at time zone 'Africa/Dakar')::date)
    and (ends_on   is null or ends_on   >= (now() at time zone 'Africa/Dakar')::date))
);
drop policy if exists "offers admin" on public.offers;
create policy "offers admin" on public.offers
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "media read" on public.media;
create policy "media read" on public.media for select using (
  public.is_admin() or (show_on_home
    and (starts_on is null or starts_on <= (now() at time zone 'Africa/Dakar')::date)
    and (ends_on   is null or ends_on   >= (now() at time zone 'Africa/Dakar')::date))
);
drop policy if exists "media admin" on public.media;
create policy "media admin" on public.media
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "settings read" on public.site_settings;
create policy "settings read" on public.site_settings for select using (true);
drop policy if exists "settings admin" on public.site_settings;
create policy "settings admin" on public.site_settings
  for all using (public.is_admin()) with check (public.is_admin());

grant select on public.announcements, public.offers, public.media, public.site_settings to anon;
grant select, insert, update, delete on public.announcements, public.offers, public.media, public.site_settings to authenticated;
