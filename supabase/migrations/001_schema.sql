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
