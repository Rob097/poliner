-- ╔══════════════════════════════════════════════════════════╗
-- ║  POLINER — Restringe i permessi del ruolo "guest"        ║
-- ║                                                          ║
-- ║  Due interventi:                                         ║
-- ║   1) Fix bug RLS:                                        ║
-- ║      - animali INSERT/UPDATE/DELETE erano stati          ║
-- ║        sovrascritti senza check ruolo dalla migrazione   ║
-- ║        20260521103000_fix_public_page_member_policy...   ║
-- ║      - eventi_inserimento non aveva mai avuto check di   ║
-- ║        ruolo (creata in 20260520230000)                  ║
-- ║   2) Restringe SELECT a ruolo 'admin' per le tabelle     ║
-- ║      che il guest non deve vedere (spese, scorte, note,  ║
-- ║      rubrica, manutenzione, trattamenti, salute, ...).   ║
-- ║                                                          ║
-- ║  Tabelle volutamente lasciate SELECT-aperte a tutti i    ║
-- ║  membri (servono al guest):                              ║
-- ║   - animali, uova, nidi (galline e uova in scorta)       ║
-- ║   - log_uscite (stato apertura/chiusura in home)         ║
-- ║   - richieste_uova (proprie richieste)                   ║
-- ║   - pollai, pollaio_members, pollaio_inviti              ║
-- ║   - profiles, preferenze_notifiche, push_subscriptions,  ║
-- ║     notifiche_inviate (user-owned)                       ║
-- ║                                                          ║
-- ║  Le policy `*_select_public` (pagina pubblica /p/[slug]) ║
-- ║  NON vengono toccate: restano accessibili a `anon`.      ║
-- ╚══════════════════════════════════════════════════════════╝

-- ── 1) FIX bug `animali` ─────────────────────────────────
-- Ripristina i check di ruolo admin su INSERT/UPDATE/DELETE
-- (la migrazione 20260521103000 li aveva rimossi inavvertitamente).

drop policy if exists "animali_insert" on public.animali;
create policy "animali_insert" on public.animali
  for insert to authenticated
  with check (
    public.is_my_pollaio(pollaio_id)
    and public.my_pollaio_role(pollaio_id) = 'admin'
  );

drop policy if exists "animali_update" on public.animali;
create policy "animali_update" on public.animali
  for update to authenticated
  using (
    public.is_my_pollaio(pollaio_id)
    and public.my_pollaio_role(pollaio_id) = 'admin'
  );

drop policy if exists "animali_delete" on public.animali;
create policy "animali_delete" on public.animali
  for delete to authenticated
  using (
    public.is_my_pollaio(pollaio_id)
    and public.my_pollaio_role(pollaio_id) = 'admin'
  );

-- ── 2) FIX gap `eventi_inserimento` ──────────────────────
-- Mancava il check di ruolo: il guest poteva scrivere fasi
-- di inserimento. Aggiungiamo il check admin.

drop policy if exists "ei_insert" on public.eventi_inserimento;
create policy "ei_insert" on public.eventi_inserimento
  for insert to authenticated
  with check (
    public.is_my_pollaio(pollaio_id)
    and public.my_pollaio_role(pollaio_id) = 'admin'
  );

drop policy if exists "ei_update" on public.eventi_inserimento;
create policy "ei_update" on public.eventi_inserimento
  for update to authenticated
  using (
    public.is_my_pollaio(pollaio_id)
    and public.my_pollaio_role(pollaio_id) = 'admin'
  );

drop policy if exists "ei_delete" on public.eventi_inserimento;
create policy "ei_delete" on public.eventi_inserimento
  for delete to authenticated
  using (
    public.is_my_pollaio(pollaio_id)
    and public.my_pollaio_role(pollaio_id) = 'admin'
  );

-- ── 3) Restringi SELECT a admin per le tabelle riservate ─

-- spese
drop policy if exists "spese_select" on public.spese;
create policy "spese_select" on public.spese
  for select to authenticated
  using (
    public.is_my_pollaio(pollaio_id)
    and public.my_pollaio_role(pollaio_id) = 'admin'
  );

-- note
drop policy if exists "note_select" on public.note;
create policy "note_select" on public.note
  for select to authenticated
  using (
    public.is_my_pollaio(pollaio_id)
    and public.my_pollaio_role(pollaio_id) = 'admin'
  );

-- lista_spesa
drop policy if exists "lista_select" on public.lista_spesa;
create policy "lista_select" on public.lista_spesa
  for select to authenticated
  using (
    public.is_my_pollaio(pollaio_id)
    and public.my_pollaio_role(pollaio_id) = 'admin'
  );

-- scorte_cibo
drop policy if exists "scorte_select" on public.scorte_cibo;
create policy "scorte_select" on public.scorte_cibo
  for select to authenticated
  using (
    public.is_my_pollaio(pollaio_id)
    and public.my_pollaio_role(pollaio_id) = 'admin'
  );

-- scorte_rifornimenti (eredita via scorta_id → scorte_cibo)
drop policy if exists "riforn_select" on public.scorte_rifornimenti;
create policy "riforn_select" on public.scorte_rifornimenti
  for select to authenticated
  using (
    exists (
      select 1 from public.scorte_cibo s
      where s.id = scorta_id
        and public.is_my_pollaio(s.pollaio_id)
        and public.my_pollaio_role(s.pollaio_id) = 'admin'
    )
  );

-- contatti (rubrica)
drop policy if exists "contatti_select" on public.contatti;
create policy "contatti_select" on public.contatti
  for select to authenticated
  using (
    public.is_my_pollaio(pollaio_id)
    and public.my_pollaio_role(pollaio_id) = 'admin'
  );

-- regali (storico dei regali)
drop policy if exists "regali_select" on public.regali;
create policy "regali_select" on public.regali
  for select to authenticated
  using (
    public.is_my_pollaio(pollaio_id)
    and public.my_pollaio_role(pollaio_id) = 'admin'
  );

-- manutenzioni
drop policy if exists "manutenzioni_select" on public.manutenzioni;
create policy "manutenzioni_select" on public.manutenzioni
  for select to authenticated
  using (
    public.is_my_pollaio(pollaio_id)
    and public.my_pollaio_role(pollaio_id) = 'admin'
  );

-- manutenzioni_voci
drop policy if exists "voci_select" on public.manutenzioni_voci;
create policy "voci_select" on public.manutenzioni_voci
  for select to authenticated
  using (
    public.is_my_pollaio(pollaio_id)
    and public.my_pollaio_role(pollaio_id) = 'admin'
  );

-- meteo_storico
drop policy if exists "meteo_select" on public.meteo_storico;
create policy "meteo_select" on public.meteo_storico
  for select to authenticated
  using (
    public.is_my_pollaio(pollaio_id)
    and public.my_pollaio_role(pollaio_id) = 'admin'
  );

-- eventi_salute
drop policy if exists "eventi_salute_select" on public.eventi_salute;
create policy "eventi_salute_select" on public.eventi_salute
  for select to authenticated
  using (
    public.is_my_pollaio(pollaio_id)
    and public.my_pollaio_role(pollaio_id) = 'admin'
  );

-- trattamenti
drop policy if exists "trattamenti_select" on public.trattamenti;
create policy "trattamenti_select" on public.trattamenti
  for select to authenticated
  using (
    public.is_my_pollaio(pollaio_id)
    and public.my_pollaio_role(pollaio_id) = 'admin'
  );

-- periodi_muta (la tabella ha pollaio_id? verifichiamo: sì, l'ha)
drop policy if exists "periodi_muta_select" on public.periodi_muta;
create policy "periodi_muta_select" on public.periodi_muta
  for select to authenticated
  using (
    public.is_my_pollaio(pollaio_id)
    and public.my_pollaio_role(pollaio_id) = 'admin'
  );

-- eventi_inserimento
drop policy if exists "ei_select" on public.eventi_inserimento;
create policy "ei_select" on public.eventi_inserimento
  for select to authenticated
  using (
    public.is_my_pollaio(pollaio_id)
    and public.my_pollaio_role(pollaio_id) = 'admin'
  );
