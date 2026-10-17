# Agent guide

K-Padel Arena: a Korean padel club app for court bookings, league events
(Americano / Mexicano / round-robin) and standings. Next.js app on Vercel,
Supabase (Postgres, Auth, Storage, Realtime) for everything else. The
database is the security boundary: the browser talks to Supabase directly
with the public anon key, so **row-level security (RLS) is the only thing
standing between a user and other people's data**. Read the security
section before touching anything.

The README (Korean) covers local setup and deployment for humans. This
file is for agents and is deliberately in English.

## Security rules

These are non-negotiable. The repository is public.

1. **Never commit secrets.** No service-role keys, access tokens,
   database passwords, OAuth client secrets, or personal email addresses.
   The project ref, the hosted URL, the Vercel URL, and the local stack's
   fixed publishable key (`sb_publishable_…` in `.env.local.example`) are
   fine. Secrets live in GitHub Actions secrets, the Vercel dashboard, and
   the Supabase dashboard. If a secret lands in a commit, amend or rewrite
   that commit before pushing, and say so.

2. **Every table change is an RLS change.** A new table has RLS enabled
   and explicit policies in the same migration, or it must not exist.
   Decide, per table, what `anon` (logged out), `authenticated` members,
   admins (`is_admin()`) and owners (`is_owner()`) may select, insert,
   update and delete. Write it down in the migration comment.

3. **Sensitive personal data goes in `profile_contacts`, never in
   `profiles`.** `profiles` (name, level, photo, role) is readable by every
   signed-in member. `profile_contacts` (email, phone) is readable only by
   the person and by admins, and only `phone` is writable by the person.
   Do not add email, phone, addresses, birthdays or similar to `profiles`,
   and do not copy contact fields into other tables or into JSON columns.

4. **Logged-out visitors never see names.** `anon` may read venues,
   courts, booking times and league events so the schedule is public, but
   not profiles, booking participants, rosters or matches. The column
   grant on `bookings` hides `created_by` from `anon`; keep that pattern
   when adding columns that identify people.

5. **Policies are not enough on their own; use column grants and
   triggers for the rest.** Members may update only `score_a`/`score_b`
   on `matches` and only `phone` on `profile_contacts` because of
   `revoke`/`grant (column)` statements, not policies. Role changes are
   limited to owners by a trigger, and the last owner cannot be demoted
   by a trigger. When a rule is "who may change _which column_" or
   "what must stay true across rows", reach for grants and triggers.

6. **Hiding a control in the UI is not access control.** `isAdmin` /
   `isOwner` checks in React only tidy the screen. Every write the UI can
   make must already be refused by Postgres for anyone who should not be
   able to make it. Assume the client is hostile.

7. **Prove it.** Every policy, grant and trigger has a pgTAP check in
   `supabase/tests/rules.test.sql`, which runs in CI on any PR touching
   `supabase/`. When you add or change a rule, add the test that would
   fail without it, including the _negative_ case (member is refused,
   anon sees nothing). Quick manual check from a shell:

   ```bash
   docker exec -i supabase_db_kpadelarena psql -U postgres -d postgres -At <<'SQL'
   begin;
   set local role authenticated;
   select set_config('request.jwt.claims', '{"sub":"<profile uuid>","role":"authenticated"}', true);
   select count(*) from public.profile_contacts;  -- should be 1: only their own row
   rollback;
   SQL
   ```

8. **Realtime is subject to RLS, but only for tables in the
   publication.** Adding a table to `supabase_realtime` makes its changes
   visible to subscribers who pass the table's select policy. Do not add a
   table with sensitive columns to the publication.

9. **Storage buckets are public-read by design** (avatars, venue photos,
   result photos). Do not upload anything private to them, and keep the
   write policies (own folder / admin) when adding buckets.

## Data model in one breath

One club, many venues. `venues` → `courts` → `bookings` (match / lesson /
league; public or private) → `booking_participants` (a member _or_ a named
guest). `profiles` (one per auth user; role owner / admin / member; first
account becomes owner) + `profile_contacts`. League events: `leagues` →
`league_players` (member or guest), `league_teams` (round-robin pairs),
`matches` (sides hold `league_players` ids, or `league_teams` ids for
round-robin). Business rules enforced in the database: max players per
booking, no overlapping bookings per court (exclusion constraint),
bookings only change until 24 h before start unless admin, a booking is
deleted when its last participant leaves, a venue cannot be deleted while
it has leagues, the last owner cannot be demoted.

Agreed product decisions, so you do not re-litigate them: no payments, no
recurring bookings, no invite/accept step for private bookings, guests are
allowed everywhere but always labelled, per-venue timezone, email
confirmation stays on, Kakao login deferred.

## Layout

- `supabase/migrations/` — schema, policies, storage. **Append-only now**:
  production is deployed from these, so never edit an existing migration;
  add a new timestamped file. `supabase/seed.sql` is local-only dev data
  (logins `owner@` / `admin@` / `member@` / `guest@example.com`, password
  `padel-dev1`). After a schema change run `pnpm db:reset` and
  `pnpm db:types` (regenerates `src/lib/database.types.ts`, which is
  generated and ignored by ESLint).
- `src/lib/db.ts` — the only place that queries Supabase tables. Maps rows
  to the camelCase types in `src/lib/types.ts`. `src/lib/auth.ts` wraps
  Supabase Auth. `src/lib/queryKeys.ts` lists every TanStack Query key.
- `src/features/*` — one folder per area (auth, booking, club, league,
  members). Hooks (`useSession`, `useVenues`, `useLeague(s)`) own the
  queries and mutations; components stay presentational and take
  `canEdit` / `canScore`-style props. Write mutations invalidate the keys
  they affect; `subscribeToChanges` in `db.ts` invalidates on Realtime
  events; signing in or out re-reads every non-session query because
  what a visitor may see depends on who they are.
- `src/components/ui` — small shared pieces (BottomSheet, PrimaryButton,
  chipStyle, Eyebrow, SectionCard…). Reuse before adding.
- `src/app` — App Router. The club app is one client-rendered page
  served by the `[[...path]]` catch-all; `src/features/club/routes.ts`
  maps the URL to and from app state (venue, tab, league event, account
  sheet), so anything a user can be looking at should be linkable. Venue
  content lives under `/venues/<id>`; club-wide tabs (`/schedule`,
  `/members`) carry no venue and the last venue shown is remembered. Add
  new screens there, not as local `useState`. `/privacy` and `/terms`
  are static; `/reset-password` handles the recovery link.
- Shared validation (zod) lives in `src/features/auth/validation.ts`.

## Conventions

- Korean UI copy, English code and comments. Match the tone of existing
  copy (`…해요`, `…어요`).
- Keep it simple and shared: no new state libraries, no new UI kits,
  no duplicating a query that `db.ts` already has.
- Timezones: venue times are wall-clock in `venues.timezone`; convert with
  the helpers in `src/features/booking/slots.ts`, never with `new Date(y,
m, d)` arithmetic.
- Photos use plain `<img>` on purpose (arbitrary hosts).
- Do not ask the user to run SQL for routine setup. Venues, courts,
  roles and events are all managed in the app.

## Checks before any commit

```bash
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test
pnpm test:e2e        # needs the local stack (pnpm db:start) and a dev server on :3000
pnpm test:db         # on schema or policy changes; or the docker/psql one-liner in supabase/tests
```

CI runs the first line plus a build on every PR, and the database tests
on PRs that touch `supabase/`. Merging to `main` deploys migrations to
production via GitHub Actions and the app via Vercel, so `main` must
always be releasable.

## Git and PR workflow

The maintainer manages branches; agents do not create branches by hand.
PRs are stacked with GitHub's `gh stack` extension (`gh extension
install github/gh-stack` if `gh stack` is missing):

```bash
git fetch origin main:main && git checkout main   # start from an up-to-date trunk
gh stack init                                     # once per stack, when `gh stack view` shows none
gh stack add -Am "feat(scope): semantic message"  # new layer: branch named from the message, commits everything
gh stack submit --auto --open                     # push the stack and open or update its PR(s)
gh pr edit <n> -R kpadelarena/app --body-file <file>
```

Each further `gh stack add -Am …` stacks another layer on the current
one. Once the stack below has merged, start again from an updated
`main` with `gh stack init`. Because `-A` stages everything, check
`git status` first for files that should not go in (scratch files,
`.claude/`, test artefacts); use `-u` to stage tracked files only.

Semantic commit messages (`feat`, `fix`, `refactor`, `docs`, `ci`, …).
PR descriptions: a short summary and a test plan, no generated-by
attribution line.

## Things that bit us before

- Editing SQL with JavaScript `String.replace` turns `$$` into `$`; use a
  function replacer or `split/join`.
- PostgREST needs the FK name when a table has two foreign keys to the
  same target: `profiles!booking_participants_profile_id_fkey(...)`.
- A query fetched while logged out stays cached after login unless it is
  invalidated; the session hook now invalidates everything, keep it so.
- The in-app browser pane cannot open the local Realtime websocket; that
  is a pane limitation, not an app bug. Production Realtime works.
- Supabase refuses a new password equal to the old one (`same_password`);
  tests that reset passwords must change to a temporary one first.
- GitHub Actions runners are IPv4-only, so the Supabase CLI reaches the
  database through the session pooler; the CI token needs only read
  permissions (see README).
