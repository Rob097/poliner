create table if not exists public.notifiche_inviate (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users(id) on delete cascade,
	categoria text not null,
	riferimento_id text not null,
	inviata_il timestamptz not null default now()
);

create unique index if not exists notifiche_inviate_user_id_categoria_riferimento_id_key
	on public.notifiche_inviate(user_id, categoria, riferimento_id);

create index if not exists notifiche_inviate_user_id_inviata_il_idx
	on public.notifiche_inviate(user_id, inviata_il desc);

alter table public.notifiche_inviate
	add column if not exists letta_il timestamptz;

create index if not exists notifiche_inviate_user_id_letta_il_idx
	on public.notifiche_inviate(user_id, letta_il, inviata_il desc);

alter table public.notifiche_inviate enable row level security;

do $$
begin
	if not exists (
		select 1
		from pg_policies
		where schemaname = 'public'
			and tablename = 'notifiche_inviate'
			and policyname = 'notifiche_select_own'
	) then
		create policy "notifiche_select_own" on public.notifiche_inviate
			for select using (auth.uid() = user_id);
	end if;
end $$;

drop policy if exists "notifiche_update_own" on public.notifiche_inviate;
create policy "notifiche_update_own" on public.notifiche_inviate
	for update
	using (auth.uid() = user_id)
	with check (auth.uid() = user_id);
