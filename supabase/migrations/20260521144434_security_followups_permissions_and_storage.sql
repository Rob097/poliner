-- Security follow-ups applied to the linked Supabase project.
-- Removes broad storage listing and narrows execute grants on exposed RPCs.

revoke execute on function public.accept_invito(uuid) from anon;
revoke execute on function public.accetta_richiesta_uova(uuid) from anon;
revoke execute on function public.rifiuta_richiesta_uova(uuid) from anon;
revoke execute on function public.merge_contatto_con_utente(uuid, uuid, text) from anon;
revoke execute on function public.my_pollaio_role(uuid) from anon;
revoke execute on function public.is_my_pollaio(uuid) from anon;
revoke execute on function public.auto_member_on_pollaio_insert() from anon, authenticated;

drop policy if exists poliner_media_authenticated_read on storage.objects;