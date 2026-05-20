-- ╔══════════════════════════════════════════════════════════╗
-- ║  POLINER — RLS con check ruolo admin (Fase A)            ║
-- ║                                                          ║
-- ║  Per tutte le tabelle "dati operativi del pollaio":      ║
-- ║   - SELECT resta come prima (is_my_pollaio)              ║
-- ║   - INSERT/UPDATE/DELETE richiedono my_pollaio_role()    ║
-- ║     = 'admin'                                            ║
-- ║  Le tabelle user-owned (profiles, preferenze, push, ...) ║
-- ║  non vengono toccate.                                    ║
-- ╚══════════════════════════════════════════════════════════╝

-- Helper macro (a mano: 16 tabelle × 4 policy = 64 statement)

-- ── ANIMALI ──────────────────────────────────────────────
drop policy if exists "animali_insert" on public.animali;
drop policy if exists "animali_update" on public.animali;
drop policy if exists "animali_delete" on public.animali;
create policy "animali_insert" on public.animali for insert
  with check (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');
create policy "animali_update" on public.animali for update
  using (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');
create policy "animali_delete" on public.animali for delete
  using (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');

-- ── NIDI ────────────────────────────────────────────────
drop policy if exists "nidi_insert" on public.nidi;
drop policy if exists "nidi_update" on public.nidi;
drop policy if exists "nidi_delete" on public.nidi;
create policy "nidi_insert" on public.nidi for insert
  with check (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');
create policy "nidi_update" on public.nidi for update
  using (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');
create policy "nidi_delete" on public.nidi for delete
  using (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');

-- ── CONTATTI ────────────────────────────────────────────
drop policy if exists "contatti_insert" on public.contatti;
drop policy if exists "contatti_update" on public.contatti;
drop policy if exists "contatti_delete" on public.contatti;
create policy "contatti_insert" on public.contatti for insert
  with check (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');
create policy "contatti_update" on public.contatti for update
  using (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');
create policy "contatti_delete" on public.contatti for delete
  using (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');

-- ── REGALI ──────────────────────────────────────────────
drop policy if exists "regali_insert" on public.regali;
drop policy if exists "regali_update" on public.regali;
drop policy if exists "regali_delete" on public.regali;
create policy "regali_insert" on public.regali for insert
  with check (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');
create policy "regali_update" on public.regali for update
  using (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');
create policy "regali_delete" on public.regali for delete
  using (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');

-- ── UOVA ────────────────────────────────────────────────
drop policy if exists "uova_insert" on public.uova;
drop policy if exists "uova_update" on public.uova;
drop policy if exists "uova_delete" on public.uova;
create policy "uova_insert" on public.uova for insert
  with check (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');
create policy "uova_update" on public.uova for update
  using (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');
create policy "uova_delete" on public.uova for delete
  using (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');

-- ── EVENTI SALUTE ───────────────────────────────────────
drop policy if exists "eventi_salute_insert" on public.eventi_salute;
drop policy if exists "eventi_salute_update" on public.eventi_salute;
drop policy if exists "eventi_salute_delete" on public.eventi_salute;
create policy "eventi_salute_insert" on public.eventi_salute for insert
  with check (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');
create policy "eventi_salute_update" on public.eventi_salute for update
  using (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');
create policy "eventi_salute_delete" on public.eventi_salute for delete
  using (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');

-- ── TRATTAMENTI ─────────────────────────────────────────
drop policy if exists "trattamenti_insert" on public.trattamenti;
drop policy if exists "trattamenti_update" on public.trattamenti;
drop policy if exists "trattamenti_delete" on public.trattamenti;
create policy "trattamenti_insert" on public.trattamenti for insert
  with check (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');
create policy "trattamenti_update" on public.trattamenti for update
  using (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');
create policy "trattamenti_delete" on public.trattamenti for delete
  using (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');

-- ── PERIODI MUTA ────────────────────────────────────────
drop policy if exists "periodi_muta_insert" on public.periodi_muta;
drop policy if exists "periodi_muta_update" on public.periodi_muta;
drop policy if exists "periodi_muta_delete" on public.periodi_muta;
create policy "periodi_muta_insert" on public.periodi_muta for insert
  with check (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');
create policy "periodi_muta_update" on public.periodi_muta for update
  using (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');
create policy "periodi_muta_delete" on public.periodi_muta for delete
  using (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');

-- ── LOG USCITE ──────────────────────────────────────────
drop policy if exists "log_uscite_insert" on public.log_uscite;
drop policy if exists "log_uscite_update" on public.log_uscite;
drop policy if exists "log_uscite_delete" on public.log_uscite;
create policy "log_uscite_insert" on public.log_uscite for insert
  with check (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');
create policy "log_uscite_update" on public.log_uscite for update
  using (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');
create policy "log_uscite_delete" on public.log_uscite for delete
  using (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');

-- ── MANUTENZIONI ────────────────────────────────────────
drop policy if exists "manutenzioni_insert" on public.manutenzioni;
drop policy if exists "manutenzioni_update" on public.manutenzioni;
drop policy if exists "manutenzioni_delete" on public.manutenzioni;
create policy "manutenzioni_insert" on public.manutenzioni for insert
  with check (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');
create policy "manutenzioni_update" on public.manutenzioni for update
  using (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');
create policy "manutenzioni_delete" on public.manutenzioni for delete
  using (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');

-- ── MANUTENZIONI CONFIG (verrà droppata in 0007 Fase C) ─
drop policy if exists "manut_config_insert" on public.manutenzioni_config;
drop policy if exists "manut_config_update" on public.manutenzioni_config;
drop policy if exists "manut_config_delete" on public.manutenzioni_config;
create policy "manut_config_insert" on public.manutenzioni_config for insert
  with check (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');
create policy "manut_config_update" on public.manutenzioni_config for update
  using (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');
create policy "manut_config_delete" on public.manutenzioni_config for delete
  using (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');

-- ── METEO STORICO ───────────────────────────────────────
drop policy if exists "meteo_insert" on public.meteo_storico;
drop policy if exists "meteo_update" on public.meteo_storico;
drop policy if exists "meteo_delete" on public.meteo_storico;
create policy "meteo_insert" on public.meteo_storico for insert
  with check (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');
create policy "meteo_update" on public.meteo_storico for update
  using (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');
create policy "meteo_delete" on public.meteo_storico for delete
  using (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');

-- ── SPESE ───────────────────────────────────────────────
drop policy if exists "spese_insert" on public.spese;
drop policy if exists "spese_update" on public.spese;
drop policy if exists "spese_delete" on public.spese;
create policy "spese_insert" on public.spese for insert
  with check (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');
create policy "spese_update" on public.spese for update
  using (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');
create policy "spese_delete" on public.spese for delete
  using (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');

-- ── NOTE ────────────────────────────────────────────────
drop policy if exists "note_insert" on public.note;
drop policy if exists "note_update" on public.note;
drop policy if exists "note_delete" on public.note;
create policy "note_insert" on public.note for insert
  with check (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');
create policy "note_update" on public.note for update
  using (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');
create policy "note_delete" on public.note for delete
  using (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');

-- ── LISTA SPESA ─────────────────────────────────────────
drop policy if exists "lista_insert" on public.lista_spesa;
drop policy if exists "lista_update" on public.lista_spesa;
drop policy if exists "lista_delete" on public.lista_spesa;
create policy "lista_insert" on public.lista_spesa for insert
  with check (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');
create policy "lista_update" on public.lista_spesa for update
  using (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');
create policy "lista_delete" on public.lista_spesa for delete
  using (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');

-- ── SCORTE CIBO ─────────────────────────────────────────
drop policy if exists "scorte_insert" on public.scorte_cibo;
drop policy if exists "scorte_update" on public.scorte_cibo;
drop policy if exists "scorte_delete" on public.scorte_cibo;
create policy "scorte_insert" on public.scorte_cibo for insert
  with check (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');
create policy "scorte_update" on public.scorte_cibo for update
  using (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');
create policy "scorte_delete" on public.scorte_cibo for delete
  using (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');

-- ── SCORTE RIFORNIMENTI (ereditano via parent scorte_cibo) ─
drop policy if exists "riforn_insert" on public.scorte_rifornimenti;
drop policy if exists "riforn_update" on public.scorte_rifornimenti;
drop policy if exists "riforn_delete" on public.scorte_rifornimenti;
create policy "riforn_insert" on public.scorte_rifornimenti for insert
  with check (
    exists (select 1 from public.scorte_cibo s
            where s.id = scorta_id
              and public.is_my_pollaio(s.pollaio_id)
              and public.my_pollaio_role(s.pollaio_id) = 'admin')
  );
create policy "riforn_update" on public.scorte_rifornimenti for update
  using (
    exists (select 1 from public.scorte_cibo s
            where s.id = scorta_id
              and public.is_my_pollaio(s.pollaio_id)
              and public.my_pollaio_role(s.pollaio_id) = 'admin')
  );
create policy "riforn_delete" on public.scorte_rifornimenti for delete
  using (
    exists (select 1 from public.scorte_cibo s
            where s.id = scorta_id
              and public.is_my_pollaio(s.pollaio_id)
              and public.my_pollaio_role(s.pollaio_id) = 'admin')
  );
