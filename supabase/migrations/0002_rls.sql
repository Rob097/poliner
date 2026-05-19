-- ╔══════════════════════════════════════════════════════════╗
-- ║  POLINER — Row Level Security                           ║
-- ╚══════════════════════════════════════════════════════════╝

-- Helper: il pollaio appartiene all'utente corrente?
create or replace function public.is_my_pollaio(p_pollaio uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.pollai where id = p_pollaio and user_id = auth.uid()
  );
$$;

-- ── PROFILES ──────────────────────────────────────────────
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);
-- insert/delete: gestiti dal trigger handle_new_user e da cascade

-- ── PREFERENZE NOTIFICHE ──────────────────────────────────
alter table public.preferenze_notifiche enable row level security;
create policy "pref_select_own" on public.preferenze_notifiche
  for select using (auth.uid() = user_id);
create policy "pref_update_own" on public.preferenze_notifiche
  for update using (auth.uid() = user_id);
create policy "pref_insert_own" on public.preferenze_notifiche
  for insert with check (auth.uid() = user_id);

-- ── PUSH SUBSCRIPTIONS ────────────────────────────────────
alter table public.push_subscriptions enable row level security;
create policy "push_select_own" on public.push_subscriptions
  for select using (auth.uid() = user_id);
create policy "push_insert_own" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);
create policy "push_delete_own" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

-- ── POLLAI ────────────────────────────────────────────────
alter table public.pollai enable row level security;
create policy "pollai_select_own" on public.pollai
  for select using (auth.uid() = user_id);
create policy "pollai_insert_own" on public.pollai
  for insert with check (auth.uid() = user_id);
create policy "pollai_update_own" on public.pollai
  for update using (auth.uid() = user_id);
create policy "pollai_delete_own" on public.pollai
  for delete using (auth.uid() = user_id);

-- ╔════════════════════════════════════════════════════════╗
-- ║  Tabelle che pendono da pollaio_id                     ║
-- ║  Helper macro: 4 policy uguali ovunque                 ║
-- ╚════════════════════════════════════════════════════════╝

-- ── ANIMALI ──
alter table public.animali enable row level security;
create policy "animali_select" on public.animali for select using (public.is_my_pollaio(pollaio_id));
create policy "animali_insert" on public.animali for insert with check (public.is_my_pollaio(pollaio_id));
create policy "animali_update" on public.animali for update using (public.is_my_pollaio(pollaio_id));
create policy "animali_delete" on public.animali for delete using (public.is_my_pollaio(pollaio_id));

-- ── NIDI ──
alter table public.nidi enable row level security;
create policy "nidi_select" on public.nidi for select using (public.is_my_pollaio(pollaio_id));
create policy "nidi_insert" on public.nidi for insert with check (public.is_my_pollaio(pollaio_id));
create policy "nidi_update" on public.nidi for update using (public.is_my_pollaio(pollaio_id));
create policy "nidi_delete" on public.nidi for delete using (public.is_my_pollaio(pollaio_id));

-- ── CONTATTI ──
alter table public.contatti enable row level security;
create policy "contatti_select" on public.contatti for select using (public.is_my_pollaio(pollaio_id));
create policy "contatti_insert" on public.contatti for insert with check (public.is_my_pollaio(pollaio_id));
create policy "contatti_update" on public.contatti for update using (public.is_my_pollaio(pollaio_id));
create policy "contatti_delete" on public.contatti for delete using (public.is_my_pollaio(pollaio_id));

-- ── REGALI ──
alter table public.regali enable row level security;
create policy "regali_select" on public.regali for select using (public.is_my_pollaio(pollaio_id));
create policy "regali_insert" on public.regali for insert with check (public.is_my_pollaio(pollaio_id));
create policy "regali_update" on public.regali for update using (public.is_my_pollaio(pollaio_id));
create policy "regali_delete" on public.regali for delete using (public.is_my_pollaio(pollaio_id));

-- ── UOVA ──
alter table public.uova enable row level security;
create policy "uova_select" on public.uova for select using (public.is_my_pollaio(pollaio_id));
create policy "uova_insert" on public.uova for insert with check (public.is_my_pollaio(pollaio_id));
create policy "uova_update" on public.uova for update using (public.is_my_pollaio(pollaio_id));
create policy "uova_delete" on public.uova for delete using (public.is_my_pollaio(pollaio_id));

-- ── EVENTI SALUTE ──
alter table public.eventi_salute enable row level security;
create policy "eventi_salute_select" on public.eventi_salute for select using (public.is_my_pollaio(pollaio_id));
create policy "eventi_salute_insert" on public.eventi_salute for insert with check (public.is_my_pollaio(pollaio_id));
create policy "eventi_salute_update" on public.eventi_salute for update using (public.is_my_pollaio(pollaio_id));
create policy "eventi_salute_delete" on public.eventi_salute for delete using (public.is_my_pollaio(pollaio_id));

-- ── TRATTAMENTI ──
alter table public.trattamenti enable row level security;
create policy "trattamenti_select" on public.trattamenti for select using (public.is_my_pollaio(pollaio_id));
create policy "trattamenti_insert" on public.trattamenti for insert with check (public.is_my_pollaio(pollaio_id));
create policy "trattamenti_update" on public.trattamenti for update using (public.is_my_pollaio(pollaio_id));
create policy "trattamenti_delete" on public.trattamenti for delete using (public.is_my_pollaio(pollaio_id));

-- ── PERIODI MUTA ──
alter table public.periodi_muta enable row level security;
create policy "periodi_muta_select" on public.periodi_muta for select using (public.is_my_pollaio(pollaio_id));
create policy "periodi_muta_insert" on public.periodi_muta for insert with check (public.is_my_pollaio(pollaio_id));
create policy "periodi_muta_update" on public.periodi_muta for update using (public.is_my_pollaio(pollaio_id));
create policy "periodi_muta_delete" on public.periodi_muta for delete using (public.is_my_pollaio(pollaio_id));

-- ── LOG USCITE ──
alter table public.log_uscite enable row level security;
create policy "log_uscite_select" on public.log_uscite for select using (public.is_my_pollaio(pollaio_id));
create policy "log_uscite_insert" on public.log_uscite for insert with check (public.is_my_pollaio(pollaio_id));
create policy "log_uscite_update" on public.log_uscite for update using (public.is_my_pollaio(pollaio_id));
create policy "log_uscite_delete" on public.log_uscite for delete using (public.is_my_pollaio(pollaio_id));

-- ── MANUTENZIONI ──
alter table public.manutenzioni enable row level security;
create policy "manutenzioni_select" on public.manutenzioni for select using (public.is_my_pollaio(pollaio_id));
create policy "manutenzioni_insert" on public.manutenzioni for insert with check (public.is_my_pollaio(pollaio_id));
create policy "manutenzioni_update" on public.manutenzioni for update using (public.is_my_pollaio(pollaio_id));
create policy "manutenzioni_delete" on public.manutenzioni for delete using (public.is_my_pollaio(pollaio_id));

-- ── MANUTENZIONI CONFIG ──
alter table public.manutenzioni_config enable row level security;
create policy "manut_config_select" on public.manutenzioni_config for select using (public.is_my_pollaio(pollaio_id));
create policy "manut_config_insert" on public.manutenzioni_config for insert with check (public.is_my_pollaio(pollaio_id));
create policy "manut_config_update" on public.manutenzioni_config for update using (public.is_my_pollaio(pollaio_id));
create policy "manut_config_delete" on public.manutenzioni_config for delete using (public.is_my_pollaio(pollaio_id));

-- ── METEO STORICO ──
alter table public.meteo_storico enable row level security;
create policy "meteo_select" on public.meteo_storico for select using (public.is_my_pollaio(pollaio_id));
create policy "meteo_insert" on public.meteo_storico for insert with check (public.is_my_pollaio(pollaio_id));
create policy "meteo_update" on public.meteo_storico for update using (public.is_my_pollaio(pollaio_id));
create policy "meteo_delete" on public.meteo_storico for delete using (public.is_my_pollaio(pollaio_id));

-- ── SPESE ──
alter table public.spese enable row level security;
create policy "spese_select" on public.spese for select using (public.is_my_pollaio(pollaio_id));
create policy "spese_insert" on public.spese for insert with check (public.is_my_pollaio(pollaio_id));
create policy "spese_update" on public.spese for update using (public.is_my_pollaio(pollaio_id));
create policy "spese_delete" on public.spese for delete using (public.is_my_pollaio(pollaio_id));

-- ── NOTE ──
alter table public.note enable row level security;
create policy "note_select" on public.note for select using (public.is_my_pollaio(pollaio_id));
create policy "note_insert" on public.note for insert with check (public.is_my_pollaio(pollaio_id));
create policy "note_update" on public.note for update using (public.is_my_pollaio(pollaio_id));
create policy "note_delete" on public.note for delete using (public.is_my_pollaio(pollaio_id));

-- ── LISTA SPESA ──
alter table public.lista_spesa enable row level security;
create policy "lista_select" on public.lista_spesa for select using (public.is_my_pollaio(pollaio_id));
create policy "lista_insert" on public.lista_spesa for insert with check (public.is_my_pollaio(pollaio_id));
create policy "lista_update" on public.lista_spesa for update using (public.is_my_pollaio(pollaio_id));
create policy "lista_delete" on public.lista_spesa for delete using (public.is_my_pollaio(pollaio_id));

-- ── SCORTE CIBO ──
alter table public.scorte_cibo enable row level security;
create policy "scorte_select" on public.scorte_cibo for select using (public.is_my_pollaio(pollaio_id));
create policy "scorte_insert" on public.scorte_cibo for insert with check (public.is_my_pollaio(pollaio_id));
create policy "scorte_update" on public.scorte_cibo for update using (public.is_my_pollaio(pollaio_id));
create policy "scorte_delete" on public.scorte_cibo for delete using (public.is_my_pollaio(pollaio_id));

-- ── SCORTE RIFORNIMENTI ── (eredita ownership via parent)
alter table public.scorte_rifornimenti enable row level security;
create policy "riforn_select" on public.scorte_rifornimenti
  for select using (
    exists (select 1 from public.scorte_cibo s
            where s.id = scorta_id and public.is_my_pollaio(s.pollaio_id))
  );
create policy "riforn_insert" on public.scorte_rifornimenti
  for insert with check (
    exists (select 1 from public.scorte_cibo s
            where s.id = scorta_id and public.is_my_pollaio(s.pollaio_id))
  );
create policy "riforn_update" on public.scorte_rifornimenti
  for update using (
    exists (select 1 from public.scorte_cibo s
            where s.id = scorta_id and public.is_my_pollaio(s.pollaio_id))
  );
create policy "riforn_delete" on public.scorte_rifornimenti
  for delete using (
    exists (select 1 from public.scorte_cibo s
            where s.id = scorta_id and public.is_my_pollaio(s.pollaio_id))
  );
