-- ╔══════════════════════════════════════════════════════════╗
-- ║  POLINER — Porta automatica: la sveglia scatta una volta ║
-- ║                                                          ║
-- ║  1) Ogni orario automatico viene valutato UNA sola volta ║
-- ║     al giorno (al primo giro del job dopo quell'ora).    ║
-- ║     Prima la condizione restava vera per tutto il        ║
-- ║     giorno: cancellando o svuotando la registrazione     ║
-- ║     automatica di oggi, il minuto dopo veniva riscritta. ║
-- ║     Ora, passato l'orario, la giornata è in mano         ║
-- ║     all'utente.                                          ║
-- ║                                                          ║
-- ║  2) Privacy: la riga di un pollaio con pagina pubblica   ║
-- ║     era leggibile per intero da chiunque (coordinate     ║
-- ║     comprese, e ora anche gli orari della porta).        ║
-- ║     L'accesso anonimo viene limitato alle colonne che    ║
-- ║     la pagina /p/<slug> mostra davvero.                  ║
-- ╚══════════════════════════════════════════════════════════╝

-- ── 1) SVEGLIA UNA VOLTA AL GIORNO ────────────────────────
alter table public.pollai
  add column porta_auto_apertura_fatta_il date,
  add column porta_auto_chiusura_fatta_il date;

comment on column public.pollai.porta_auto_apertura_fatta_il is
  'Giorno (italiano) in cui la sveglia di apertura è già scattata. Stato interno del job, gestito da funzione/trigger.';
comment on column public.pollai.porta_auto_chiusura_fatta_il is
  'Giorno (italiano) in cui la sveglia di chiusura è già scattata. Stato interno del job, gestito da funzione/trigger.';

-- Cambiare la configurazione fa ripartire la sveglia: nuovo riferimento
-- temporale e orari di oggi di nuovo "da valutare" (se cadono dopo la modifica).
create or replace function public.pollai_porta_auto_modificata()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.porta_auto_attiva is distinct from old.porta_auto_attiva
     or new.porta_auto_apertura is distinct from old.porta_auto_apertura
     or new.porta_auto_chiusura is distinct from old.porta_auto_chiusura then
    new.porta_auto_aggiornata_il := now();
    new.porta_auto_apertura_fatta_il := null;
    new.porta_auto_chiusura_fatta_il := null;
  end if;
  return new;
end;
$$;

create or replace function public.registra_porte_automatiche(
  p_adesso timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_locale timestamp := p_adesso at time zone 'Europe/Rome';
  v_oggi date := v_locale::date;
  v_ora time := v_locale::time;
begin
  -- Aperture. "dovute" = pollai la cui sveglia di apertura di oggi è arrivata
  -- (dopo l'ultima modifica della configurazione) e non è ancora scattata.
  -- Per ognuno: registra l'apertura se oggi non ce n'è già una, e in ogni
  -- caso segna la sveglia come scattata.
  with dovute as materialized (
    select p.id, p.porta_auto_apertura as ora
    from public.pollai p
    where p.porta_auto_attiva
      and p.porta_auto_apertura is not null
      and p.porta_auto_apertura <= v_ora
      and p.porta_auto_apertura_fatta_il is distinct from v_oggi
      and (
        p.porta_auto_aggiornata_il is null
        or (v_oggi + p.porta_auto_apertura)
           >= (p.porta_auto_aggiornata_il at time zone 'Europe/Rome')
      )
  ),
  registrate as (
    insert into public.log_uscite as l (pollaio_id, data, ora_uscita, uscita_auto)
    select d.id, v_oggi, d.ora, true
    from dovute d
    where not exists (
      select 1 from public.log_uscite x
      where x.pollaio_id = d.id
        and x.data = v_oggi
        and (
          x.ora_uscita is not null
          -- già chiuso prima dell'orario di apertura: non ha senso "aprirlo dopo"
          or (x.ora_rientro is not null and x.ora_rientro <= d.ora)
        )
    )
    on conflict (pollaio_id, data) do update
      set ora_uscita = excluded.ora_uscita,
          uscita_auto = true
      where l.ora_uscita is null
  )
  update public.pollai p
  set porta_auto_apertura_fatta_il = v_oggi
  from dovute d
  where p.id = d.id;

  -- Chiusure. Stessa logica: registra la chiusura solo se il pollaio risulta
  -- aperto da prima di quell'ora e non ancora chiuso.
  with dovute as materialized (
    select p.id, p.porta_auto_chiusura as ora
    from public.pollai p
    where p.porta_auto_attiva
      and p.porta_auto_chiusura is not null
      and p.porta_auto_chiusura <= v_ora
      and p.porta_auto_chiusura_fatta_il is distinct from v_oggi
      and (
        p.porta_auto_aggiornata_il is null
        or (v_oggi + p.porta_auto_chiusura)
           >= (p.porta_auto_aggiornata_il at time zone 'Europe/Rome')
      )
  ),
  registrate as (
    update public.log_uscite l
    set ora_rientro = d.ora,
        rientro_auto = true
    from dovute d
    where l.pollaio_id = d.id
      and l.data = v_oggi
      and l.ora_rientro is null
      and l.ora_uscita is not null
      and l.ora_uscita < d.ora
  )
  update public.pollai p
  set porta_auto_chiusura_fatta_il = v_oggi
  from dovute d
  where p.id = d.id;
end;
$$;

revoke all on function public.pollai_porta_auto_modificata() from public, anon, authenticated;
revoke all on function public.registra_porte_automatiche(timestamptz) from public, anon, authenticated;

-- ── 2) PRIVACY PAGINA PUBBLICA ────────────────────────────
-- La pagina /p/<slug> legge `pollai` con il client anonimo e usa solo queste
-- colonne (più slug e flag per il filtro, e `id`/`pubblico_attivo` per la
-- policy pubblica di `animali`). Tutto il resto — coordinate, proprietario,
-- orari della porta — non deve essere leggibile senza essere membri.
revoke select on public.pollai from anon;
grant select (
  id,
  nome,
  foto_url,
  posizione_nome,
  descrizione_pubblica,
  pubblico_slug,
  pubblico_attivo
) on public.pollai to anon;

-- La policy pubblica serve solo al client anonimo: gli utenti loggati vedono
-- i propri pollai tramite `pollai_select_members`, non quelli pubblici altrui.
alter policy "pollai_select_public" on public.pollai to anon;
