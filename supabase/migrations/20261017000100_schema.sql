-- =====================================================================
-- Schema: one club, one or more venues.
--
-- Applied locally by `pnpm db:reset` and to a hosted project by
-- `pnpm supabase db push`. Until the first deployment these baseline
-- files are edited in place rather than stacked.
-- =====================================================================

create extension if not exists btree_gist; -- exclusion constraint on court + time range

create type public.member_role as enum ('owner', 'admin', 'member');
create type public.booking_kind as enum ('match', 'lesson', 'league');
create type public.visibility as enum ('public', 'private');
create type public.league_format as enum ('americano', 'mexicano', 'round_robin');

-- ---------------------------------------------------------------------
-- profiles — one row per account, created by trigger on sign-up. The
-- very first account becomes the owner; everyone after is a member
-- until an owner changes their role. There can be several owners, and
-- the last one can never be demoted or deleted.
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  phone text,
  level numeric(2, 1) not null default 3.0 check (level between 0 and 7),
  photo_url text,
  role public.member_role not null default 'member',
  created_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, display_name, photo_url, role)
  values (
    new.id,
    coalesce(
      nullif(meta ->> 'display_name', ''),
      nullif(meta ->> 'full_name', ''),
      nullif(meta ->> 'name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      '회원'
    ),
    coalesce(meta ->> 'avatar_url', meta ->> 'picture'),
    (case when exists (select 1 from public.profiles where role = 'owner') then 'member' else 'owner' end)::public.member_role
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.protect_last_owner()
returns trigger
language plpgsql
as $$
begin
  if old.role = 'owner'
     and (tg_op = 'DELETE' or new.role <> 'owner')
     and not exists (select 1 from public.profiles where role = 'owner' and id <> old.id) then
    raise exception 'the last owner cannot be removed or demoted';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger protect_last_owner
  before update of role or delete on public.profiles
  for each row execute function public.protect_last_owner();

-- ---------------------------------------------------------------------
-- venues and courts
-- ---------------------------------------------------------------------
create table public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  timezone text not null default 'Asia/Seoul', -- open/close times and booking days are read in this zone
  open_time time not null default '07:00',
  close_time time not null default '22:00',
  max_players int not null default 6 check (max_players between 2 and 12), -- per booking
  amenities jsonb not null default '{}'::jsonb,
  photo_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.courts (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (venue_id, name)
);

-- ---------------------------------------------------------------------
-- leagues — one event (a league night) at a venue, with its own roster,
-- rounds and standings. Past events are kept.
-- ---------------------------------------------------------------------
create table public.leagues (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete restrict,
  name text not null,
  format public.league_format not null default 'americano',
  event_date date not null,
  court_count int not null default 2 check (court_count between 1 and 8),
  result_photo_url text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index leagues_date_idx on public.leagues (event_date desc);

-- A roster entry: a member, or a named guest.
create table public.league_players (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete cascade,
  guest_name text,
  created_at timestamptz not null default now(),
  constraint league_player_identity check ((profile_id is null) <> (guest_name is null))
);

create unique index league_players_member_once on public.league_players (league_id, profile_id)
  where profile_id is not null;

-- Round-robin pairs. player_ids holds league_players ids.
create table public.league_teams (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  name text not null,
  player_ids uuid[] not null,
  created_at timestamptz not null default now()
);

-- side_a / side_b hold league_players ids, or league_teams ids for
-- round-robin. sit_out holds league_players ids.
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  round_number int not null,
  court_number int not null,
  side_a uuid[] not null,
  side_b uuid[] not null,
  score_a int,
  score_b int,
  sit_out uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (league_id, round_number, court_number)
);

-- ---------------------------------------------------------------------
-- bookings — one row per booking with a start and end, on one court.
-- Members create matches; lessons and league bookings are admin-only.
-- The creator is added as the first participant by trigger, and a
-- booking whose last participant leaves is deleted.
-- ---------------------------------------------------------------------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references public.courts (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  kind public.booking_kind not null default 'match',
  visibility public.visibility not null default 'public',
  league_id uuid references public.leagues (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint booking_time_order check (ends_at > starts_at),
  constraint booking_no_overlap exclude using gist (court_id with =, tstzrange(starts_at, ends_at) with &&)
);

create index bookings_court_time_idx on public.bookings (court_id, starts_at);

create table public.booking_participants (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete cascade,
  guest_name text,
  added_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint participant_identity check ((profile_id is null) <> (guest_name is null))
);

create unique index booking_participants_member_once on public.booking_participants (booking_id, profile_id)
  where profile_id is not null;

create index booking_participants_booking_idx on public.booking_participants (booking_id);

create function public.add_creator_as_participant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is not null then
    insert into public.booking_participants (booking_id, profile_id, added_by)
    values (new.id, new.created_by, new.created_by);
  end if;
  return new;
end;
$$;

create trigger booking_add_creator
  after insert on public.bookings
  for each row execute function public.add_creator_as_participant();

create function public.enforce_booking_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  limit_players int;
  taken int;
begin
  select v.max_players into limit_players
  from public.bookings b
  join public.courts c on c.id = b.court_id
  join public.venues v on v.id = c.venue_id
  where b.id = new.booking_id;

  select count(*) into taken from public.booking_participants where booking_id = new.booking_id;
  if taken >= limit_players then
    raise exception 'booking is full (% players)', limit_players;
  end if;
  return new;
end;
$$;

create trigger booking_participant_capacity
  before insert on public.booking_participants
  for each row execute function public.enforce_booking_capacity();

create function public.delete_empty_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.bookings
  where id = old.booking_id
    and not exists (select 1 from public.booking_participants where booking_id = old.booking_id);
  return old;
end;
$$;

create trigger booking_delete_when_empty
  after delete on public.booking_participants
  for each row execute function public.delete_empty_booking();

-- ---------------------------------------------------------------------
-- Live updates for everything viewers watch.
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table
  public.venues, public.courts, public.bookings, public.booking_participants,
  public.leagues, public.league_players, public.league_teams, public.matches;
