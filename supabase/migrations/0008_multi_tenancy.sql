-- ╔══════════════════════════════════════════════════════════╗
-- ║  POLINER — Multi-tenancy (Fase A)                        ║
-- ║                                                          ║
-- ║  Un account può far parte di più pollai con ruolo        ║
-- ║  admin o guest. Le policy RLS passano da "ownership" a   ║
-- ║  "membership". L'auto-iscrizione admin di chi crea un    ║
-- ║  pollaio è garantita da un trigger su INSERT pollai.     ║
-- ╚══════════════════════════════════════════════════════════╝

-- ─── Membership per pollaio ────────────────────────────────
create table if not exists public.pollaio_members (
  pollaio_id uuid not null references public.pollai(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  ruolo text not null check (ruolo in ('admin','guest')),
  created_at timestamptz not null default now(),
  primary key (pollaio_id, user_id)
);
create index if not exists pollaio_members_user_idx on public.pollaio_members(user_id);
create index if not exists pollaio_members_role_idx on public.pollaio_members(pollaio_id, ruolo);

-- ─── Pollaio attivo per profilo (default switch) ───────────
alter table public.profiles
  add column if not exists pollaio_attivo_id uuid references public.pollai(id) on delete set null;

-- ─── Backfill: ogni pollaio esistente diventa "admin" del suo creatore
insert into public.pollaio_members (pollaio_id, user_id, ruolo)
select p.id, p.user_id, 'admin'
from public.pollai p
on conflict do nothing;

-- ─── Backfill: setta pollaio attivo per ogni profilo che non ne ha
update public.profiles pr
set pollaio_attivo_id = (
  select pm.pollaio_id
  from public.pollaio_members pm
  where pm.user_id = pr.id
  order by pm.created_at asc
  limit 1
)
where pr.pollaio_attivo_id is null;

-- ─── Riscrittura helper is_my_pollaio() basato su membership
create or replace function public.is_my_pollaio(p_pollaio uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists(
    select 1 from public.pollaio_members
    where pollaio_id = p_pollaio
      and user_id = auth.uid()
  );
$$;
grant execute on function public.is_my_pollaio(uuid) to authenticated;

-- ─── Helper per il ruolo nel pollaio ───────────────────────
create or replace function public.my_pollaio_role(p_pollaio uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select ruolo from public.pollaio_members
  where pollaio_id = p_pollaio
    and user_id = auth.uid()
  limit 1;
$$;
grant execute on function public.my_pollaio_role(uuid) to authenticated;

-- ─── RLS su pollaio_members ────────────────────────────────
alter table public.pollaio_members enable row level security;

drop policy if exists "members_select_same_pollaio" on public.pollaio_members;
drop policy if exists "members_update_admin" on public.pollaio_members;
drop policy if exists "members_delete_admin_or_self" on public.pollaio_members;

create policy "members_select_same_pollaio" on public.pollaio_members
  for select using (public.is_my_pollaio(pollaio_id));

-- INSERT solo via funzioni SECURITY DEFINER (es. trigger auto-iscrizione,
-- accept_invito). Niente policy INSERT diretta per evitare bypass.

create policy "members_update_admin" on public.pollaio_members
  for update using (public.my_pollaio_role(pollaio_id) = 'admin');

create policy "members_delete_admin_or_self" on public.pollaio_members
  for delete using (
    public.my_pollaio_role(pollaio_id) = 'admin'
    or user_id = auth.uid()
  );

-- ─── Trigger: auto-iscrizione admin alla creazione di un pollaio ───
create or replace function public.auto_member_on_pollaio_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.pollaio_members (pollaio_id, user_id, ruolo)
  values (new.id, new.user_id, 'admin')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists trg_auto_member_pollaio on public.pollai;
create trigger trg_auto_member_pollaio
  after insert on public.pollai
  for each row execute function public.auto_member_on_pollaio_insert();

-- ─── Policy pollai aggiornate: SELECT a tutti i membri, ─────
-- UPDATE/DELETE solo admin, INSERT come prima (chiunque può crearne uno).
drop policy if exists "pollai_select_own" on public.pollai;
drop policy if exists "pollai_update_own" on public.pollai;
drop policy if exists "pollai_delete_own" on public.pollai;
drop policy if exists "pollai_select_members" on public.pollai;
drop policy if exists "pollai_update_admin" on public.pollai;
drop policy if exists "pollai_delete_admin" on public.pollai;

create policy "pollai_select_members" on public.pollai
  for select using (public.is_my_pollaio(id));
create policy "pollai_update_admin" on public.pollai
  for update using (public.my_pollaio_role(id) = 'admin');
create policy "pollai_delete_admin" on public.pollai
  for delete using (public.my_pollaio_role(id) = 'admin');
-- pollai_insert_own resta invariata (l'utente crea un pollaio
-- valorizzando user_id = auth.uid(); il trigger aggiunge la membership).
