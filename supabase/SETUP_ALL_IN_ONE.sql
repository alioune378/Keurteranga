-- ============================================================================
-- KËR TÉRANGA — COMPLETE DATABASE SETUP (one paste)
-- Supabase → SQL Editor → New query → paste EVERYTHING → Run.
-- Run it once on the new, empty project.
-- ============================================================================


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> 001_schema.sql <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- ============================================================================
-- Kër Téranga — database schema (Supabase / PostgreSQL 15+)
-- Apply with the Supabase CLI (`supabase db push`) or paste into
-- Supabase Dashboard > SQL Editor > New query > Run.
--
-- All session dates/times are LOCAL Africa/Dakar time (UTC+0, no DST).
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Start of a session as an absolute timestamp (Africa/Dakar local time)
create or replace function public.session_starts_at(p_date date, p_time time)
returns timestamptz language sql stable as $$
  select (p_date + p_time) at time zone 'Africa/Dakar';
$$;

-- ---------------------------------------------------------------------------
-- Admin profiles (allow-list of Supabase Auth users who manage the site)
-- ---------------------------------------------------------------------------
create table if not exists public.admin_profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_profiles where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Experiences — bilingual content stored as {"fr": ..., "en": ...}
-- price_xof / max_participants may be NULL = "to be confirmed" (never invented)
-- ---------------------------------------------------------------------------
create table if not exists public.experiences (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  status               text not null default 'draft' check (status in ('draft','published','archived')),
  title                jsonb not null,
  summary              jsonb not null default '{}'::jsonb,
  description          jsonb not null default '{}'::jsonb,
  location             jsonb not null default '{}'::jsonb,
  duration             jsonb not null default '{}'::jsonb,
  included             jsonb not null default '{}'::jsonb,   -- {"fr": ["..."], "en": ["..."]}
  steps                jsonb not null default '{}'::jsonb,   -- {"fr": [{"title","text"}], "en": [...]}
  languages            text[] not null default array['fr','en'],
  price_xof            integer check (price_xof is null or price_xof >= 0),
  min_participants     integer not null default 1 check (min_participants >= 1),
  max_participants     integer check (max_participants is null or max_participants >= min_participants),
  booking_cutoff_hours integer not null default 24 check (booking_cutoff_hours between 0 and 720),
  featured             boolean not null default false,
  sort_order           integer not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

drop trigger if exists experiences_updated_at on public.experiences;
create trigger experiences_updated_at before update on public.experiences
  for each row execute function public.set_updated_at();

-- Photos of an experience (Supabase Storage bucket "photos" or /public paths)
create table if not exists public.experience_images (
  id            uuid primary key default gen_random_uuid(),
  experience_id uuid not null references public.experiences(id) on delete cascade,
  src           text not null,              -- public URL or /images/... path
  storage_path  text,                       -- set when stored in Supabase Storage
  alt           jsonb not null default '{}'::jsonb,
  is_cover      boolean not null default false,
  illustration  boolean not null default false, -- true = temporary/AI illustration, labelled on the site
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists experience_images_exp_idx on public.experience_images (experience_id, sort_order);

-- ---------------------------------------------------------------------------
-- Sessions — bookable time slots. `booked` is maintained by trigger.
-- status: open = bookable · full = closed automatically when capacity reached
--         closed = closed manually by the admin
-- ---------------------------------------------------------------------------
create table if not exists public.sessions (
  id            uuid primary key default gen_random_uuid(),
  experience_id uuid not null references public.experiences(id) on delete cascade,
  date          date not null,
  start_time    time not null,
  end_time      time,
  capacity      integer not null check (capacity > 0),
  booked        integer not null default 0 check (booked >= 0),
  status        text not null default 'open' check (status in ('open','full','closed')),
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (experience_id, date, start_time),
  check (end_time is null or end_time > start_time)
);
create index if not exists sessions_experience_date_idx on public.sessions (experience_id, date);

drop trigger if exists sessions_updated_at on public.sessions;
create trigger sessions_updated_at before update on public.sessions
  for each row execute function public.set_updated_at();

-- Automatic full / reopen when booked or capacity changes
create or replace function public.sessions_auto_status()
returns trigger language plpgsql as $$
begin
  if new.status = 'open' and new.booked >= new.capacity then
    new.status := 'full';
  elsif new.status = 'full' and new.booked < new.capacity then
    new.status := 'open';
  end if;
  return new;
end $$;

drop trigger if exists sessions_auto_status on public.sessions;
create trigger sessions_auto_status before insert or update of booked, capacity, status on public.sessions
  for each row execute function public.sessions_auto_status();

-- ---------------------------------------------------------------------------
-- Blocked dates / exceptions (experience_id NULL = all experiences)
-- ---------------------------------------------------------------------------
create table if not exists public.blocked_dates (
  id            uuid primary key default gen_random_uuid(),
  date          date not null,
  experience_id uuid references public.experiences(id) on delete cascade,
  reason        text,
  created_at    timestamptz not null default now()
);
create unique index if not exists blocked_dates_unique
  on public.blocked_dates (date, coalesce(experience_id, '00000000-0000-0000-0000-000000000000'::uuid));

create or replace function public.is_date_blocked(p_date date, p_experience_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.blocked_dates
     where date = p_date and (experience_id is null or experience_id = p_experience_id)
  );
$$;

-- ---------------------------------------------------------------------------
-- Bookings
-- ---------------------------------------------------------------------------
create table if not exists public.bookings (
  id               uuid primary key default gen_random_uuid(),
  reference        text not null unique,
  idempotency_key  uuid unique,              -- prevents duplicates on retries / double clicks
  session_id       uuid not null references public.sessions(id) on delete restrict,
  experience_id    uuid not null references public.experiences(id) on delete restrict,
  participants     integer not null check (participants > 0),
  language         text not null default 'fr' check (language in ('fr','en')),
  first_name       text not null check (length(first_name) between 1 and 80),
  last_name        text not null check (length(last_name) between 1 and 80),
  email            text not null check (length(email) <= 200),
  phone            text not null check (length(phone) between 6 and 30),
  country          text check (country is null or length(country) <= 80),
  special_requests text check (special_requests is null or length(special_requests) <= 1000),
  locale           text not null default 'fr' check (locale in ('fr','en')),
  consent_at       timestamptz not null default now(),
  status           text not null default 'confirmed' check (status in ('confirmed','cancelled')),
  cancelled_at     timestamptz,
  admin_notes      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists bookings_session_idx on public.bookings (session_id);
create index if not exists bookings_created_idx on public.bookings (created_at desc);

drop trigger if exists bookings_updated_at on public.bookings;
create trigger bookings_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();

-- Keep sessions.booked in sync with confirmed bookings (cancellation restores capacity)
create or replace function public.sync_session_booked()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('UPDATE','DELETE') then
    update public.sessions s
       set booked = coalesce((select sum(b.participants) from public.bookings b
                              where b.session_id = old.session_id and b.status = 'confirmed'), 0)
     where s.id = old.session_id;
  end if;
  if tg_op in ('INSERT','UPDATE') then
    update public.sessions s
       set booked = coalesce((select sum(b.participants) from public.bookings b
                              where b.session_id = new.session_id and b.status = 'confirmed'), 0)
     where s.id = new.session_id;
  end if;
  return null;
end $$;

drop trigger if exists bookings_sync_booked on public.bookings;
create trigger bookings_sync_booked
  after insert or update of status, participants, session_id or delete on public.bookings
  for each row execute function public.sync_session_booked();

-- ---------------------------------------------------------------------------
-- Partnership inquiries & contact messages
-- ---------------------------------------------------------------------------
create table if not exists public.partner_inquiries (
  id           uuid primary key default gen_random_uuid(),
  organization text not null check (length(organization) between 1 and 160),
  org_type     text not null check (org_type in ('hotel','agency','tour_operator','corporate','association','other')),
  contact_name text not null check (length(contact_name) between 1 and 120),
  email        text not null check (length(email) <= 200),
  phone        text check (phone is null or length(phone) <= 30),
  country      text check (country is null or length(country) <= 80),
  group_size   text check (group_size is null or length(group_size) <= 60),
  message      text check (message is null or length(message) <= 3000),
  locale       text not null default 'fr',
  status       text not null default 'new' check (status in ('new','in_progress','closed')),
  created_at   timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(name) between 1 and 120),
  email      text not null check (length(email) <= 200),
  phone      text check (phone is null or length(phone) <= 30),
  subject    text check (subject is null or length(subject) <= 200),
  message    text not null check (length(message) between 1 and 5000),
  locale     text not null default 'fr',
  handled    boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Email outbox: rows are written in the SAME transaction as the booking, so a
-- booking is never lost if the email provider fails; sending is retried.
-- ---------------------------------------------------------------------------
create table if not exists public.email_outbox (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('booking_client','booking_admin','booking_cancelled','partner_admin','contact_admin')),
  ref_id      uuid not null,
  status      text not null default 'pending' check (status in ('pending','sent','failed')),
  attempts    integer not null default 0,
  last_error  text,
  next_try_at timestamptz not null default now(),
  sent_at     timestamptz,
  created_at  timestamptz not null default now(),
  unique (kind, ref_id)
);
create index if not exists email_outbox_pending_idx on public.email_outbox (status, next_try_at);

-- Queue admin notifications in the same transaction as the inquiry/message
create or replace function public.queue_notification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.email_outbox (kind, ref_id)
  values (case tg_table_name when 'partner_inquiries' then 'partner_admin' else 'contact_admin' end, new.id)
  on conflict (kind, ref_id) do nothing;
  return new;
end $$;

drop trigger if exists partner_inquiries_notify on public.partner_inquiries;
create trigger partner_inquiries_notify after insert on public.partner_inquiries
  for each row execute function public.queue_notification();
drop trigger if exists contact_messages_notify on public.contact_messages;
create trigger contact_messages_notify after insert on public.contact_messages
  for each row execute function public.queue_notification();

-- Claim pending emails for sending (skip locked => safe with parallel workers)
create or replace function public.claim_outbox(p_limit integer default 20, p_ids uuid[] default null)
returns setof public.email_outbox
language plpgsql security definer set search_path = public as $$
begin
  return query
  update public.email_outbox o
     set attempts = o.attempts + 1,
         next_try_at = now() + make_interval(mins => least(5 * power(2, o.attempts)::int, 720))
   where o.id in (
     select id from public.email_outbox
      where status = 'pending' and next_try_at <= now()
        and (p_ids is null or id = any(p_ids))
      order by created_at
      limit p_limit
      for update skip locked
   )
  returning o.*;
end $$;

-- ---------------------------------------------------------------------------
-- Rate limiting (server-side; called with the service role only)
-- ---------------------------------------------------------------------------
create table if not exists public.rate_limit_events (
  id         bigint generated always as identity primary key,
  bucket     text not null,
  key_hash   text not null,
  created_at timestamptz not null default now()
);
create index if not exists rate_limit_idx on public.rate_limit_events (bucket, key_hash, created_at desc);

create or replace function public.hit_rate_limit(p_bucket text, p_key_hash text, p_max integer, p_window_seconds integer)
returns boolean   -- true = allowed, false = limited
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  delete from public.rate_limit_events where created_at < now() - interval '1 day';
  select count(*) into n from public.rate_limit_events
   where bucket = p_bucket and key_hash = p_key_hash
     and created_at > now() - make_interval(secs => p_window_seconds);
  if n >= p_max then return false; end if;
  insert into public.rate_limit_events (bucket, key_hash) values (p_bucket, p_key_hash);
  return true;
end $$;

-- ---------------------------------------------------------------------------
-- Public read: availability (open sessions, after cutoff, not blocked)
-- ---------------------------------------------------------------------------
create or replace function public.get_availability(p_experience_id uuid, p_from date, p_to date)
returns table (
  id uuid, date date, start_time time, end_time time, capacity integer, remaining integer, status text
)
language sql stable security definer set search_path = public as $$
  select s.id, s.date, s.start_time, s.end_time, s.capacity,
         greatest(s.capacity - s.booked, 0) as remaining,
         s.status
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

-- ---------------------------------------------------------------------------
-- Booking creation — atomic, row-locked. Called by the server only.
-- ---------------------------------------------------------------------------
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
  -- Idempotency: same key => return the existing booking, never a duplicate
  if p_idempotency_key is not null then
    select * into b from public.bookings where idempotency_key = p_idempotency_key;
    if found then
      return jsonb_build_object('reference', b.reference, 'booking_id', b.id, 'duplicate', true);
    end if;
  end if;

  -- Lock the session row: concurrent bookings on this session are serialized here
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
    first_name, last_name, email, phone, country, special_requests, locale
  ) values (
    ref, p_idempotency_key, s.id, e.id, p_participants, p_language,
    trim(p_first_name), trim(p_last_name), lower(trim(p_email)), trim(p_phone),
    nullif(trim(p_country), ''), nullif(trim(p_special_requests), ''),
    case when p_locale = 'en' then 'en' else 'fr' end
  ) returning * into b;

  -- Queue confirmation + admin notification in the same transaction
  insert into public.email_outbox (kind, ref_id) values ('booking_client', b.id), ('booking_admin', b.id);

  return jsonb_build_object(
    'reference', b.reference,
    'booking_id', b.id,
    'duplicate', false,
    'remaining', s.capacity - s.booked - p_participants
  );
end $$;

-- ---------------------------------------------------------------------------
-- Admin: modify a booking (participants / session move) with capacity checks
-- ---------------------------------------------------------------------------
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

  if b.status = 'confirmed' and not p_force then
    select coalesce(sum(participants), 0) into other from public.bookings
     where session_id = s.id and status = 'confirmed' and id <> b.id;
    if other + p_participants > s.capacity then raise exception 'NOT_ENOUGH_SPOTS'; end if;
  end if;

  update public.bookings
     set session_id = s.id, experience_id = s.experience_id,
         participants = p_participants, admin_notes = p_admin_notes
   where id = b.id;
end $$;

-- Admin: cancel a booking (restores capacity via trigger, queues an email)
create or replace function public.admin_cancel_booking(p_booking_id uuid, p_notify boolean default true)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  update public.bookings set status = 'cancelled', cancelled_at = now()
   where id = p_booking_id and status = 'confirmed';
  if found and p_notify then
    insert into public.email_outbox (kind, ref_id) values ('booking_cancelled', p_booking_id)
    on conflict (kind, ref_id) do nothing;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------
revoke all on function public.create_booking(uuid, uuid, integer, text, text, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.claim_outbox(integer, uuid[]) from public, anon, authenticated;
revoke all on function public.hit_rate_limit(text, text, integer, integer) from public, anon, authenticated;
revoke all on function public.admin_update_booking(uuid, uuid, integer, text, boolean) from public, anon;
revoke all on function public.admin_cancel_booking(uuid, boolean) from public, anon;

grant execute on function public.create_booking(uuid, uuid, integer, text, text, text, text, text, text, text, text) to service_role;
grant execute on function public.claim_outbox(integer, uuid[]) to service_role;
grant execute on function public.hit_rate_limit(text, text, integer, integer) to service_role;
grant execute on function public.admin_update_booking(uuid, uuid, integer, text, boolean) to authenticated;
grant execute on function public.admin_cancel_booking(uuid, boolean) to authenticated;
grant execute on function public.get_availability(uuid, date, date) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Public visitors can only READ published content and session capacity.
-- Every write from visitors goes through server actions (service role).
-- ---------------------------------------------------------------------------
alter table public.admin_profiles    enable row level security;
alter table public.experiences       enable row level security;
alter table public.experience_images enable row level security;
alter table public.sessions          enable row level security;
alter table public.blocked_dates     enable row level security;
alter table public.bookings          enable row level security;
alter table public.partner_inquiries enable row level security;
alter table public.contact_messages  enable row level security;
alter table public.email_outbox      enable row level security;
alter table public.rate_limit_events enable row level security;

drop policy if exists "admin_profiles self/admin read" on public.admin_profiles;
create policy "admin_profiles self/admin read" on public.admin_profiles
  for select using (public.is_admin());

drop policy if exists "experiences read" on public.experiences;
create policy "experiences read" on public.experiences
  for select using (status = 'published' or public.is_admin());
drop policy if exists "experiences admin write" on public.experiences;
create policy "experiences admin write" on public.experiences
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "images read" on public.experience_images;
create policy "images read" on public.experience_images
  for select using (
    public.is_admin() or exists (select 1 from public.experiences e
                                  where e.id = experience_id and e.status = 'published')
  );
drop policy if exists "images admin write" on public.experience_images;
create policy "images admin write" on public.experience_images
  for all using (public.is_admin()) with check (public.is_admin());

-- sessions hold no personal data; public read is needed for realtime updates
drop policy if exists "sessions read" on public.sessions;
create policy "sessions read" on public.sessions for select using (true);
drop policy if exists "sessions admin write" on public.sessions;
create policy "sessions admin write" on public.sessions
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "blocked read" on public.blocked_dates;
create policy "blocked read" on public.blocked_dates for select using (true);
drop policy if exists "blocked admin write" on public.blocked_dates;
create policy "blocked admin write" on public.blocked_dates
  for all using (public.is_admin()) with check (public.is_admin());

-- personal data: admins only
drop policy if exists "bookings admin" on public.bookings;
create policy "bookings admin" on public.bookings
  for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "partners admin" on public.partner_inquiries;
create policy "partners admin" on public.partner_inquiries
  for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "contact admin" on public.contact_messages;
create policy "contact admin" on public.contact_messages
  for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "outbox admin read" on public.email_outbox;
create policy "outbox admin read" on public.email_outbox
  for select using (public.is_admin());
-- rate_limit_events: no policy => no access except service role

-- Table privileges (RLS still applies on top)
revoke all on all tables in schema public from anon;
grant select on public.experiences, public.experience_images, public.sessions, public.blocked_dates to anon;
grant select, insert, update, delete on
  public.experiences, public.experience_images, public.sessions, public.blocked_dates,
  public.bookings, public.partner_inquiries, public.contact_messages
  to authenticated;
grant select on public.email_outbox, public.admin_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: broadcast availability changes to the booking calendar
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.sessions;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.blocked_dates;
    exception when duplicate_object then null;
    end;
  end if;
end $$;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> 002_storage.sql <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- ============================================================================
-- Kër Téranga — Supabase Storage bucket for photos
-- Public read (photos appear on the website), admin-only upload/replace/delete.
-- Run after 001_schema.sql (Supabase only — uses the storage schema).
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 8388608, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "photos public read" on storage.objects;
create policy "photos public read" on storage.objects
  for select using (bucket_id = 'photos');

drop policy if exists "photos admin insert" on storage.objects;
create policy "photos admin insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'photos' and public.is_admin());

drop policy if exists "photos admin update" on storage.objects;
create policy "photos admin update" on storage.objects
  for update to authenticated using (bucket_id = 'photos' and public.is_admin());

drop policy if exists "photos admin delete" on storage.objects;
create policy "photos admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'photos' and public.is_admin());


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> 003_studio.sql <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

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


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> 004_media_storage.sql <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- ============================================================================
-- Kër Téranga Studio — "media" storage bucket (flyers, posters, PDFs)
-- Run after 003_studio.sql (Supabase only — uses the storage schema).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Storage: "media" bucket — images AND PDF flyers, public read, admin write
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 15728640,
        array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "media public read" on storage.objects;
create policy "media public read" on storage.objects
  for select using (bucket_id = 'media');
drop policy if exists "media admin insert" on storage.objects;
create policy "media admin insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'media' and public.is_admin());
drop policy if exists "media admin update" on storage.objects;
create policy "media admin update" on storage.objects
  for update to authenticated using (bucket_id = 'media' and public.is_admin());
drop policy if exists "media admin delete" on storage.objects;
create policy "media admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'media' and public.is_admin());



-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> seed.sql (experience + photos, no sample dates) <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

-- ============================================================================
-- Kër Téranga — SAMPLE DATA (données d'exemple)
-- ⚠️ Everything below is SAMPLE content to start from. Values marked
--    "[À compléter]" / NULL must be confirmed by Kër Téranga in the admin
--    dashboard (price, group size, address, sessions, photos).
-- Run AFTER the migrations.
-- ============================================================================

insert into public.experiences (
  slug, status, title, summary, description, location, duration, included, steps,
  languages, price_xof, min_participants, max_participants, booking_cutoff_hours,
  featured, sort_order
) values (
  'atelier-thieboudiene',
  'published',
  '{"fr": "Atelier Thiéboudiène", "en": "Thiéboudiène Workshop"}',
  '{"fr": "Cuisinez ensemble le plat national du Sénégal et découvrez l''histoire, les gestes et l''art de recevoir qui l''accompagnent.",
    "en": "Cook Senegal''s national dish together and discover the history, the techniques and the art of hospitality behind it."}',
  '{"fr": "Le thiéboudiène — « riz au poisson » en wolof — est bien plus qu''un plat : c''est un moment de partage et un savoir transmis de génération en génération, inscrit en 2021 au patrimoine culturel immatériel de l''UNESCO. Pendant cet atelier, vous découvrez les ingrédients locaux, préparez le plat ensemble, apprenez les techniques et les secrets de la fondatrice, puis partagez le repas dans l''esprit de la Teranga.",
    "en": "Thiéboudiène — \"rice and fish\" in Wolof — is far more than a dish: it is a moment of sharing and a know-how handed down through generations, inscribed on UNESCO''s Intangible Cultural Heritage list in 2021. In this workshop you discover local ingredients, cook the dish together, learn the founder''s techniques and secrets, then share the meal in the spirit of Teranga."}',
  '{"fr": "Rond-point Mermoz, Dakar", "en": "Rond-point Mermoz, Dakar"}',
  '{"fr": "2h30 – 4h", "en": "2.5 – 4 hours"}',
  '{"fr": ["Présentation culturelle avec projection sur écran", "Préparation collective du plat", "Dégustation et moment de partage", "[À compléter : ingrédients, matériel, boissons…]"],
    "en": ["Cultural presentation with screen projection", "Cooking the dish together", "Tasting and sharing", "[To be completed: ingredients, equipment, drinks…]"]}',
  '{"fr": [
      {"title": "Accueil & introduction à la Teranga", "text": "Les présentations et le sens de l''hospitalité sénégalaise."},
      {"title": "Histoire & importance culturelle du Thiéboudiène", "text": "D''où vient le plat, sa place dans la vie familiale et son inscription à l''UNESCO."},
      {"title": "Découverte des ingrédients locaux", "text": "Les produits qui font le goût du thiéboudiène : les observer, les sentir, les comprendre."},
      {"title": "Préparation collective", "text": "Chacun participe à la préparation du plat."},
      {"title": "Techniques & secrets", "text": "Les gestes et les astuces transmis par la fondatrice."},
      {"title": "Dégustation & moment de partage", "text": "Le plat préparé ensemble, partagé dans l''esprit de la Teranga."},
      {"title": "Échange autour de la gastronomie & des traditions", "text": "Questions, échanges et conseils pour refaire le plat chez vous."}
    ],
    "en": [
      {"title": "Welcome & introduction to Teranga", "text": "Introductions and the meaning of Senegalese hospitality."},
      {"title": "History & cultural importance of Thiéboudiène", "text": "Where the dish comes from, its place in family life and its UNESCO listing."},
      {"title": "Discovering local ingredients", "text": "The products behind the taste of thiéboudiène: look, smell, understand."},
      {"title": "Cooking together", "text": "Everyone takes part in preparing the dish."},
      {"title": "Techniques & secrets", "text": "Gestures and tips handed down by the founder."},
      {"title": "Tasting & sharing", "text": "The dish you cooked together, shared in the spirit of Teranga."},
      {"title": "Conversation on Senegalese food & traditions", "text": "Questions, conversation and tips to cook the dish again at home."}
    ]}',
  array['fr','en'],
  null,   -- price per person: [À compléter] — set it in the admin dashboard
  1,
  null,   -- maximum group size: [À compléter]
  24,     -- online booking closes 24 h before the session (editable)
  true,
  1
)
on conflict (slug) do nothing;

-- Real workshop photos (14 November 2026).
insert into public.experience_images (experience_id, src, alt, is_cover, illustration, sort_order)
select e.id, v.src, v.alt::jsonb, v.is_cover, false, v.ord
  from public.experiences e,
  (values
    ('/images/ker-teranga/02_Experiences/fiche-atelier-thieboudiene.webp', '{"fr":"Un poste de cuisine prêt pour l''atelier thiéboudiène","en":"A cooking station ready for the thiéboudiène workshop"}', true, 0),
    ('/images/ker-teranga/03_Atelier/decoupe-ingredients.webp', '{"fr":"Une participante souriante prépare les légumes","en":"A smiling participant prepares the vegetables"}', false, 1),
    ('/images/ker-teranga/03_Atelier/marinade-poisson.webp', '{"fr":"Échange entre l''animatrice et une participante à son poste","en":"The host chatting with a participant at her station"}', false, 2),
    ('/images/ker-teranga/04_Ingredients/poissons-et-legumes.webp', '{"fr":"Poisson frais, tomates et légumes du thiéboudiène","en":"Fresh fish, tomatoes and vegetables for thiéboudiène"}', false, 3),
    ('/images/ker-teranga/03_Atelier/cuisson-poisson.webp', '{"fr":"Le plat mijote sur le feu pendant l''atelier","en":"The dish simmering on the stove during the workshop"}', false, 4),
    ('/images/ker-teranga/05_Culture/moment-degustation.webp', '{"fr":"Les participantes se rassemblent autour de la cuisson","en":"Participants gather around the stove"}', false, 5),
    ('/images/ker-teranga/02_Experiences/detail-plat-thieboudiene.webp', '{"fr":"Une participante épluche une carotte à son poste","en":"A participant peels a carrot at her station"}', false, 6)
  ) as v(src, alt, is_cover, ord)
 where e.slug = 'atelier-thieboudiene'
   and not exists (select 1 from public.experience_images i where i.experience_id = e.id);

-- (No sample sessions: Kër Téranga adds the real dates in the dashboard → Calendrier.)

-- ---------------------------------------------------------------------------
-- Make the founder an administrator (after creating her user in
-- Supabase > Authentication > Users > "Add user"):
--
-- insert into public.admin_profiles (user_id, full_name)
--   select id, 'Prénom Nom' from auth.users where email = 'email@exemple.com';
-- ---------------------------------------------------------------------------
