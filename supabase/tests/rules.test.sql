-- Database-level tests of the rules in the migrations. Run with
-- `pnpm test:db` (supabase test db). Everything happens inside one
-- transaction that is rolled back at the end.
begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

-- Helpers to act as a signed-in user, or as a logged-out visitor.
create function pg_temp.login(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;
create function pg_temp.anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
end;
$$;
create function pg_temp.superuser() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
end;
$$;

-- Start from an empty database so the seed data cannot affect the checks
-- (the last-owner guard is lifted only to clear the seeded owner).
truncate public.venues cascade;
alter table public.profiles disable trigger protect_last_owner;
delete from auth.users;
alter table public.profiles enable trigger protect_last_owner;

-- Accounts: inserting into auth.users fires the sign-up trigger.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-000000000001', 'first@example.com', '{"display_name":"First"}'),
  ('00000000-0000-4000-8000-000000000002', 'second@example.com', '{"display_name":"Second"}'),
  ('00000000-0000-4000-8000-000000000003', 'third@example.com', '{}');

select is((select role from public.profiles where id = '00000000-0000-4000-8000-000000000001'), 'owner', 'the first account becomes owner');
select is((select role from public.profiles where id = '00000000-0000-4000-8000-000000000002'), 'member', 'later accounts are members');
select is((select display_name from public.profiles where id = '00000000-0000-4000-8000-000000000003'), 'third', 'display name falls back to the email prefix');

-- Roles
select pg_temp.login('00000000-0000-4000-8000-000000000002');
select throws_ok(
  $$ update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-000000000002' $$,
  'only an owner can change roles');

select pg_temp.login('00000000-0000-4000-8000-000000000001');
update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-000000000002';
select is((select role from public.profiles where id = '00000000-0000-4000-8000-000000000002'), 'admin',
  'an owner can promote a member to admin');
select throws_ok(
  $$ update public.profiles set role = 'member' where id = '00000000-0000-4000-8000-000000000001' $$,
  'the last owner cannot be removed or demoted');
update public.profiles set role = 'owner' where id = '00000000-0000-4000-8000-000000000002';
select is((select role from public.profiles where id = '00000000-0000-4000-8000-000000000002'), 'owner',
  'an owner can add a second owner');
update public.profiles set role = 'member' where id = '00000000-0000-4000-8000-000000000001';
select is((select role from public.profiles where id = '00000000-0000-4000-8000-000000000001'), 'member',
  'with two owners, one can step down');
-- From here: user 2 is the owner, user 1 and 3 are members.

-- Venues
select pg_temp.superuser();
insert into public.venues (id, name, max_players) values ('a0000000-0000-4000-8000-000000000001', 'Test Venue', 3);
insert into public.courts (id, venue_id, name) values ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', '1');

-- Bookings: a member books a public match three days out
select pg_temp.login('00000000-0000-4000-8000-000000000001');
insert into public.bookings (id, court_id, starts_at, ends_at, kind, visibility, created_by) values
  ('b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
   now() + interval '3 days', now() + interval '3 days 1 hour', 'match', 'public', '00000000-0000-4000-8000-000000000001');
select is(
  (select count(*)::int from public.booking_participants where booking_id = 'b0000000-0000-4000-8000-000000000001'),
  1, 'the creator is added as the first participant');
select throws_ok(
  $$ insert into public.bookings (court_id, starts_at, ends_at, created_by) values
     ('c0000000-0000-4000-8000-000000000001', now() + interval '3 days 30 minutes', now() + interval '3 days 2 hours',
      '00000000-0000-4000-8000-000000000001') $$,
  '23P01', null, 'overlapping bookings on one court are rejected');
select throws_ok(
  $$ insert into public.bookings (court_id, starts_at, ends_at, kind, created_by) values
     ('c0000000-0000-4000-8000-000000000001', now() + interval '5 days', now() + interval '5 days 1 hour', 'lesson',
      '00000000-0000-4000-8000-000000000001') $$,
  '42501', null, 'a member cannot create a lesson');

-- Joining
select pg_temp.login('00000000-0000-4000-8000-000000000003');
select lives_ok(
  $$ insert into public.booking_participants (booking_id, profile_id, added_by) values
     ('b0000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000003') $$,
  'a member can join a public booking');
select lives_ok(
  $$ insert into public.booking_participants (booking_id, guest_name, added_by) values
     ('b0000000-0000-4000-8000-000000000001', 'Guest', '00000000-0000-4000-8000-000000000003') $$,
  'a participant can add a guest');
select throws_ok(
  $$ insert into public.booking_participants (booking_id, profile_id, added_by) values
     ('b0000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003') $$,
  'booking is full (3 players)');

-- Private bookings
select pg_temp.login('00000000-0000-4000-8000-000000000001');
insert into public.bookings (id, court_id, starts_at, ends_at, kind, visibility, created_by) values
  ('b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001',
   now() + interval '4 days', now() + interval '4 days 1 hour', 'match', 'private', '00000000-0000-4000-8000-000000000001');
select pg_temp.login('00000000-0000-4000-8000-000000000003');
select throws_ok(
  $$ insert into public.booking_participants (booking_id, profile_id, added_by) values
     ('b0000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000003') $$,
  '42501', null, 'a member cannot join a private booking uninvited');
select pg_temp.login('00000000-0000-4000-8000-000000000001');
select lives_ok(
  $$ insert into public.booking_participants (booking_id, profile_id, added_by) values
     ('b0000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001') $$,
  'a participant can add a member to a private booking');

-- Leaving, the 24-hour cutoff, and empty bookings
select pg_temp.login('00000000-0000-4000-8000-000000000003');
delete from public.booking_participants where booking_id = 'b0000000-0000-4000-8000-000000000002' and profile_id = '00000000-0000-4000-8000-000000000003';
select is(
  (select count(*)::int from public.booking_participants where booking_id = 'b0000000-0000-4000-8000-000000000002'),
  1, 'a member can leave before the cutoff');

select pg_temp.superuser();
update public.bookings set starts_at = now() + interval '2 hours', ends_at = now() + interval '3 hours'
  where id = 'b0000000-0000-4000-8000-000000000002';
select pg_temp.login('00000000-0000-4000-8000-000000000001');
delete from public.booking_participants where booking_id = 'b0000000-0000-4000-8000-000000000002';
select is(
  (select count(*)::int from public.booking_participants where booking_id = 'b0000000-0000-4000-8000-000000000002'),
  1, 'inside 24 hours a member can no longer leave');
select pg_temp.login('00000000-0000-4000-8000-000000000002'); -- owner
delete from public.booking_participants where booking_id = 'b0000000-0000-4000-8000-000000000002';
select is((select count(*)::int from public.bookings where id = 'b0000000-0000-4000-8000-000000000002'), 0,
  'an admin can remove the last participant, which deletes the booking');

-- Logged-out visitors
select pg_temp.anon();
select is((select count(*)::int from public.bookings), 1, 'visitors can see booking times');
select is((select count(*)::int from public.booking_participants), 0, 'visitors cannot see who is in a booking');
select is((select count(*)::int from public.profiles), 0, 'visitors cannot see profiles');

-- League scores
select pg_temp.superuser();
insert into public.leagues (id, venue_id, name, event_date) values
  ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Night', current_date);
insert into public.league_players (id, league_id, profile_id) values
  ('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001'),
  ('e0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003');
insert into public.matches (id, league_id, round_number, court_number, side_a, side_b) values
  ('f0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 1, 1,
   '{e0000000-0000-4000-8000-000000000001}', '{e0000000-0000-4000-8000-000000000003}');

select pg_temp.login('00000000-0000-4000-8000-000000000001');
update public.matches set score_a = 21, score_b = 15 where id = 'f0000000-0000-4000-8000-000000000001';
select is((select score_a from public.matches where id = 'f0000000-0000-4000-8000-000000000001'), 21,
  'a player in the match can enter the score');
select throws_ok(
  $$ update public.matches set side_a = '{}' where id = 'f0000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'a player cannot change anything but the score');

select pg_temp.superuser();
insert into auth.users (id, email) values ('00000000-0000-4000-8000-000000000004', 'fourth@example.com');
select pg_temp.login('00000000-0000-4000-8000-000000000004');
update public.matches set score_a = 0 where id = 'f0000000-0000-4000-8000-000000000001';
select is((select score_a from public.matches where id = 'f0000000-0000-4000-8000-000000000001'), 21,
  'a member outside the match cannot change the score');

select * from finish();
rollback;
