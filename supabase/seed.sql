-- Local development data. Applied by `supabase start` / `supabase db reset`
-- to the local database only — never to a hosted project.
--
-- Dev login:  username "owner"  /  password "padel-dev"
-- (the app signs in as `<username>@padelconnect.invalid`, see src/lib/auth.ts)

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  -- GoTrue reads these as strings, so they must be '' rather than null.
  confirmation_token, recovery_token, email_change, email_change_token_new
) values (
  '00000000-0000-0000-0000-000000000000', '11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated',
  'owner@padelconnect.invalid', extensions.crypt('padel-dev', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(),
  '', '', '', ''
);

insert into auth.identities (user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
values (
  '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'email',
  '{"sub":"11111111-1111-4111-8111-111111111111","email":"owner@padelconnect.invalid"}',
  now(), now(), now()
);

insert into public.profiles (id, username, display_name)
values ('11111111-1111-4111-8111-111111111111', 'owner', '관리자');

-- One club owned by the dev user, with enough players (4) to generate a schedule.
with club as (
  insert into public.clubs (venue, owner_id)
  values ('Yongsan Mmove', '11111111-1111-4111-8111-111111111111')
  returning id
)
insert into public.club_members (club_id, profile_id, guest_name, role)
select club.id, member.profile_id, member.guest_name, member.role
from club, (values
  ('11111111-1111-4111-8111-111111111111'::uuid, null, 'owner'),
  (null, '김민준', 'player'),
  (null, '이서연', 'player'),
  (null, '박지호', 'player')
) as member (profile_id, guest_name, role);
