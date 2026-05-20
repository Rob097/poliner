insert into storage.buckets (id, name, public)
values ('poliner-media', 'poliner-media', true)
on conflict (id) do update
set public = true;