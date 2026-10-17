-- =====================================================================
-- Storage buckets. All public to read; writes follow the same roles as
-- the tables they belong to.
--
--   avatars/{profile id}/...      own profile photo
--   venue-photos/{venue id}/...   admins
--   result-photos/{league id}/... admins
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, '{image/jpeg,image/png,image/webp}'),
  ('venue-photos', 'venue-photos', true, 5242880, '{image/jpeg,image/png,image/webp}'),
  ('result-photos', 'result-photos', true, 5242880, '{image/jpeg,image/png,image/webp}')
on conflict (id) do nothing;

create policy "avatars_write_own_folder" on storage.objects
  for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "venue_photos_write_admin" on storage.objects
  for all to authenticated
  using (bucket_id = 'venue-photos' and public.is_admin())
  with check (bucket_id = 'venue-photos' and public.is_admin());

create policy "result_photos_write_admin" on storage.objects
  for all to authenticated
  using (bucket_id = 'result-photos' and public.is_admin())
  with check (bucket_id = 'result-photos' and public.is_admin());
