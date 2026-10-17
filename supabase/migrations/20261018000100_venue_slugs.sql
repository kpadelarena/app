-- Venues get a short, admin-chosen slug for URLs: /venues/yongsan instead
-- of the uuid. Lowercase letters, digits and single hyphens, 2–40 chars,
-- unique. Existing rows start with the first 8 characters of their id so
-- nothing breaks; admins change it in 지점 설정.
alter table public.venues add column slug text;

update public.venues set slug = substr(id::text, 1, 8) where slug is null;

alter table public.venues
  alter column slug set not null,
  add constraint venues_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 2 and 40),
  add constraint venues_slug_unique unique (slug);
