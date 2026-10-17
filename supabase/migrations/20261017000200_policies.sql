-- =====================================================================
-- Row Level Security.
--
--   - Logged-out visitors can read venues, courts, booking times and
--     league events, but no names: profiles, participants and rosters
--     need a login. Email and phone (profile_contacts) are visible only
--     to the person and to admins.
--   - Owners and admins ("admins" below) manage venues, courts, leagues,
--     lessons and anything else; only owners change roles.
--   - Members create matches, join public ones, and add people to
--     bookings they are in, until 24 hours before the start. After that
--     only admins can change a booking.
--   - Scores are entered by the players in that match, or by admins.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helpers. SECURITY DEFINER so a policy can look at other rows without
-- being blocked by the very policies it is part of.
-- ---------------------------------------------------------------------
create function public.my_role()
returns public.member_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

create function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.my_role() in ('owner', 'admin');
$$;

create function public.is_owner()
returns boolean
language sql
stable
as $$
  select public.my_role() = 'owner';
$$;

-- Members may change a booking until 24 hours before it starts.
create function public.booking_changes_open(target_booking uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.bookings
    where id = target_booking and now() < starts_at - interval '24 hours'
  );
$$;

create function public.booking_is_public(target_booking uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.bookings where id = target_booking and visibility = 'public');
$$;

create function public.is_participant(target_booking uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.booking_participants
    where booking_id = target_booking and profile_id = auth.uid()
  );
$$;

-- Is the current user on either side of the match (directly, or through
-- a round-robin team)?
create function public.plays_in_match(target_match uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.matches m
    join public.league_players lp on lp.league_id = m.league_id and lp.profile_id = auth.uid()
    where m.id = target_match
      and (
        lp.id = any (m.side_a || m.side_b)
        or exists (
          select 1 from public.league_teams t
          where t.id = any (m.side_a || m.side_b) and lp.id = any (t.player_ids)
        )
      )
  );
$$;

-- Only owners change roles. Sessions without a user (the SQL editor,
-- the service role) are allowed through so an owner can be set by hand.
create function public.restrict_role_changes()
returns trigger
language plpgsql
as $$
begin
  if new.role <> old.role and auth.uid() is not null and not public.is_owner() then
    raise exception 'only an owner can change roles';
  end if;
  return new;
end;
$$;

create trigger restrict_role_changes
  before update of role on public.profiles
  for each row execute function public.restrict_role_changes();

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles_select_members" on public.profiles
  for select to authenticated using (true);

-- Rows are only ever inserted by the sign-up trigger.
create policy "profiles_update_self_or_owner" on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_owner())
  with check (id = auth.uid() or public.is_owner());

-- ---------------------------------------------------------------------
-- profile_contacts: only the person and admins. Rows are created and
-- the email column maintained by triggers; the app can only edit phone.
-- ---------------------------------------------------------------------
alter table public.profile_contacts enable row level security;

create policy "contacts_select_self_or_admin" on public.profile_contacts
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "contacts_update_self_or_admin" on public.profile_contacts
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

revoke update on public.profile_contacts from authenticated;
grant update (phone) on public.profile_contacts to authenticated;

-- ---------------------------------------------------------------------
-- venues, courts, leagues: public to read, admins write
-- ---------------------------------------------------------------------
alter table public.venues enable row level security;
create policy "venues_select_all" on public.venues for select to anon, authenticated using (true);
create policy "venues_write_admin" on public.venues for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

alter table public.courts enable row level security;
create policy "courts_select_all" on public.courts for select to anon, authenticated using (true);
create policy "courts_write_admin" on public.courts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

alter table public.leagues enable row level security;
create policy "leagues_select_all" on public.leagues for select to anon, authenticated using (true);
create policy "leagues_write_admin" on public.leagues for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- league rosters and matches: members read, admins write, players score
-- ---------------------------------------------------------------------
alter table public.league_players enable row level security;
create policy "league_players_select_members" on public.league_players for select to authenticated using (true);
create policy "league_players_write_admin" on public.league_players for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

alter table public.league_teams enable row level security;
create policy "league_teams_select_members" on public.league_teams for select to authenticated using (true);
create policy "league_teams_write_admin" on public.league_teams for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

alter table public.matches enable row level security;
create policy "matches_select_members" on public.matches for select to authenticated using (true);
create policy "matches_insert_admin" on public.matches for insert to authenticated with check (public.is_admin());
create policy "matches_delete_admin" on public.matches for delete to authenticated using (public.is_admin());
create policy "matches_update_admin_or_player" on public.matches for update to authenticated
  using (public.is_admin() or public.plays_in_match(id))
  with check (public.is_admin() or public.plays_in_match(id));

-- Whatever the policy, a logged-in user can only ever change the scores.
revoke update on public.matches from authenticated;
grant update (score_a, score_b) on public.matches to authenticated;

-- ---------------------------------------------------------------------
-- bookings
-- ---------------------------------------------------------------------
alter table public.bookings enable row level security;

create policy "bookings_select_all" on public.bookings for select to anon, authenticated using (true);

-- Logged-out visitors see when courts are taken, but not by whom.
revoke select on public.bookings from anon;
grant select (id, court_id, starts_at, ends_at, kind, visibility, league_id) on public.bookings to anon;

-- Members book matches in the future; lessons, league slots and anything
-- tied to a league are admin-only.
create policy "bookings_insert_members" on public.bookings
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and starts_at > now()
    and (public.is_admin() or (kind = 'match' and league_id is null))
  );

-- Members change a booking by joining or leaving it (below); only admins
-- edit or delete the booking itself. An empty booking deletes itself.
create policy "bookings_update_admin" on public.bookings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "bookings_delete_admin" on public.bookings for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------
-- booking participants
-- ---------------------------------------------------------------------
alter table public.booking_participants enable row level security;

create policy "booking_participants_select_members" on public.booking_participants
  for select to authenticated using (true);

-- Before the cutoff a member can join a public booking, and anyone
-- already in a booking can add a member or a guest to it. Admins always can.
create policy "booking_participants_insert" on public.booking_participants
  for insert to authenticated
  with check (
    added_by = auth.uid()
    and (
      public.is_admin()
      or (
        public.booking_changes_open(booking_id)
        and (
          (profile_id = auth.uid() and public.booking_is_public(booking_id))
          or public.is_participant(booking_id)
        )
      )
    )
  );

-- Before the cutoff you can leave, and remove anyone you added. Admins always can.
create policy "booking_participants_delete" on public.booking_participants
  for delete to authenticated
  using (
    public.is_admin()
    or (public.booking_changes_open(booking_id) and (profile_id = auth.uid() or added_by = auth.uid()))
  );
