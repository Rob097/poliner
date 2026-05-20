create or replace function public.accept_invito(p_token uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
	v_user_id uuid := auth.uid();
	v_user_email text;
	v_invito record;
begin
	if v_user_id is null then
		return json_build_object('ok', false, 'errore', 'Devi accedere per accettare l''invito.');
	end if;

	select email into v_user_email from auth.users where id = v_user_id;

	select * into v_invito
	from public.pollaio_inviti
	where token = p_token
		and accettato_il is null
		and scadenza > now()
	for update;

	if v_invito.id is null then
		return json_build_object('ok', false, 'errore', 'Invito non valido o scaduto.');
	end if;

	if lower(v_invito.email) <> lower(coalesce(v_user_email, '')) then
		return json_build_object('ok', false, 'errore', 'Questo invito è per un altro indirizzo email.');
	end if;

	insert into public.pollaio_members (pollaio_id, user_id, ruolo)
	values (v_invito.pollaio_id, v_user_id, v_invito.ruolo)
	on conflict (pollaio_id, user_id) do update
		set ruolo = case
			when public.pollaio_members.ruolo = 'admin' then 'admin'
			else excluded.ruolo
		end;

	update public.pollaio_inviti
	set accettato_il = now(), accettato_da = v_user_id
	where id = v_invito.id;

	update public.profiles
	set pollaio_attivo_id = v_invito.pollaio_id
	where id = v_user_id;

	return json_build_object('ok', true, 'pollaio_id', v_invito.pollaio_id);
end;
$$;

grant execute on function public.accept_invito(uuid) to authenticated;
