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
