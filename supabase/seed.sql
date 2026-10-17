-- Local development data. Applied by `supabase start` / `supabase db reset`
-- to the local database only — never to a hosted project.
--
-- Dev logins (password "padel-dev1" for all):
--   owner@example.com   owner
--   admin@example.com   admin
--   member@example.com  member
--   guest@example.com   member

-- Accounts. The sign-up trigger creates each profile; the first one becomes owner.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  -- GoTrue reads these as strings, so they must be '' rather than null.
  confirmation_token, recovery_token, email_change, email_change_token_new
)
select
  '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated',
  email, extensions.crypt('padel-dev1', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', jsonb_build_object('display_name', display_name), now(), now(),
  '', '', '', ''
from (values
  ('11111111-1111-4111-8111-111111111111'::uuid, 'owner@example.com', '관리자'),
  ('22222222-2222-4222-8222-222222222222'::uuid, 'admin@example.com', '김운영'),
  ('33333333-3333-4333-8333-333333333333'::uuid, 'member@example.com', '이서연'),
  ('44444444-4444-4444-8444-444444444444'::uuid, 'guest@example.com', '박지호')
) as u (id, email, display_name)
order by id; -- the owner's id sorts first

insert into auth.identities (user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select id, id::text, 'email', jsonb_build_object('sub', id::text, 'email', email), now(), now(), now()
from auth.users;

update public.profiles set role = 'admin' where id = '22222222-2222-4222-8222-222222222222';
update public.profile_contacts set phone = '010-1234-5678' where id = '11111111-1111-4111-8111-111111111111';

-- Venues and courts.
insert into public.venues (id, name, address, sort_order) values
  ('a1a1a1a1-0000-4000-8000-000000000001', 'Yongsan Mmove', '서울 용산구', 1),
  ('a1a1a1a1-0000-4000-8000-000000000002', 'Gimpo Padel Society', '경기 김포시', 2),
  ('a1a1a1a1-0000-4000-8000-000000000003', 'Dongtan Garros Padel', '경기 화성시 동탄', 3);

insert into public.courts (venue_id, name, sort_order)
select v.id, c.name, c.sort_order
from public.venues v
cross join lateral (
  select * from (values ('1', 1), ('2', 2), ('3', 3)) as c (name, sort_order)
  where v.name <> 'Yongsan Mmove' or c.sort_order <= 2
) c;

-- A public match tomorrow at 19:00 (Seoul) on Yongsan court 1, booked by the member.
-- The trigger adds the creator; a second member and a guest join.
with slot as (
  select ((now() at time zone 'Asia/Seoul')::date + 1 + time '19:00') at time zone 'Asia/Seoul' as starts_at
), booking as (
  insert into public.bookings (id, court_id, starts_at, ends_at, kind, visibility, created_by)
  select 'b0b0b0b0-0000-4000-8000-000000000001', c.id, s.starts_at, s.starts_at + interval '1 hour', 'match', 'public',
         '33333333-3333-4333-8333-333333333333'
  from slot s, public.courts c
  join public.venues v on v.id = c.venue_id
  where v.name = 'Yongsan Mmove' and c.name = '1'
  returning id
)
insert into public.booking_participants (booking_id, profile_id, guest_name, added_by)
select id, p.profile_id, p.guest_name, '33333333-3333-4333-8333-333333333333'
from booking, (values
  ('44444444-4444-4444-8444-444444444444'::uuid, null),
  (null, '게스트 1')
) as p (profile_id, guest_name);

-- An upcoming league night at Yongsan with four players (enough to generate a schedule).
insert into public.leagues (id, venue_id, name, format, event_date, court_count, created_by) values
  ('c0c0c0c0-0000-4000-8000-000000000001', 'a1a1a1a1-0000-4000-8000-000000000001',
   '10월 아메리카노 나이트', 'americano', (now() at time zone 'Asia/Seoul')::date + 7, 2,
   '11111111-1111-4111-8111-111111111111');

insert into public.league_players (league_id, profile_id, guest_name) values
  ('c0c0c0c0-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', null),
  ('c0c0c0c0-0000-4000-8000-000000000001', '33333333-3333-4333-8333-333333333333', null),
  ('c0c0c0c0-0000-4000-8000-000000000001', '44444444-4444-4444-8444-444444444444', null),
  ('c0c0c0c0-0000-4000-8000-000000000001', null, '김민준');
