-- Some SECURITY DEFINER functions still inherited EXECUTE via PostgreSQL PUBLIC.
-- Revoke the effective PUBLIC grant while leaving intentional public RPCs untouched.

revoke execute on function public.accept_invito(uuid) from public;
revoke execute on function public.accetta_richiesta_uova(uuid) from public;
revoke execute on function public.rifiuta_richiesta_uova(uuid) from public;
revoke execute on function public.merge_contatto_con_utente(uuid, uuid, text) from public;
revoke execute on function public.my_pollaio_role(uuid) from public;
revoke execute on function public.is_my_pollaio(uuid) from public;
revoke execute on function public.auto_member_on_pollaio_insert() from public;