create policy "poliner_media_authenticated_select"
on storage.objects
for select
to authenticated
using (
  (bucket_id = 'poliner-media'::text)
  and (owner = auth.uid())
);