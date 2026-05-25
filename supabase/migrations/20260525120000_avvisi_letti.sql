-- ╔══════════════════════════════════════════════════════════╗
-- ║ Tabella `avvisi_letti`: snooze per-utente degli avvisi   ║
-- ║ derivati mostrati sulla home. Una riga = una "avviso_key"║
-- ║ archiviata. Quando la key cambia (rinnovo del ciclo),    ║
-- ║ l'avviso ricompare naturalmente perché la nuova key non  ║
-- ║ è presente.                                              ║
-- ╚══════════════════════════════════════════════════════════╝

create table if not exists public.avvisi_letti (
  user_id uuid not null references auth.users(id) on delete cascade,
  pollaio_id uuid not null references public.pollai(id) on delete cascade,
  avviso_key text not null,
  letto_il timestamptz not null default now(),
  primary key (user_id, pollaio_id, avviso_key)
);

create index if not exists avvisi_letti_user_pollaio_idx
  on public.avvisi_letti(user_id, pollaio_id);

alter table public.avvisi_letti enable row level security;

drop policy if exists "avvisi_letti_select_own" on public.avvisi_letti;
create policy "avvisi_letti_select_own" on public.avvisi_letti
  for select using (auth.uid() = user_id);

drop policy if exists "avvisi_letti_insert_own" on public.avvisi_letti;
create policy "avvisi_letti_insert_own" on public.avvisi_letti
  for insert with check (auth.uid() = user_id);

drop policy if exists "avvisi_letti_delete_own" on public.avvisi_letti;
create policy "avvisi_letti_delete_own" on public.avvisi_letti
  for delete using (auth.uid() = user_id);
