-- ╔══════════════════════════════════════════════════════════╗
-- ║  POLINER — Porta automatica                              ║
-- ║                                                          ║
-- ║  Chi ha una porta automatica imposta un orario di        ║
-- ║  apertura e/o di chiusura: a quell'ora l'apertura o la   ║
-- ║  chiusura viene registrata da sola in log_uscite.        ║
-- ║                                                          ║
-- ║  Non è un sistema rigido: vale la stessa regola dei      ║
-- ║  pulsanti manuali, cioè un orario già registrato non     ║
-- ║  viene mai sovrascritto. Se il pollaio è stato aperto a  ║
-- ║  mano alle 6:50, alle 7:00 non succede nulla.            ║
-- ║                                                          ║
-- ║  Funziona come una sveglia: contano solo gli orari che   ║
-- ║  arrivano DOPO l'ultima modifica della configurazione    ║
-- ║  (niente registrazioni retroattive).                     ║
-- ║                                                          ║
-- ║  Gli orari sono ore italiane (Europe/Rome), come il      ║
-- ║  resto dell'app.                                         ║
-- ╚══════════════════════════════════════════════════════════╝

-- ── POLLAI: configurazione ────────────────────────────────
alter table public.pollai
  add column porta_auto_attiva boolean not null default false,
  add column porta_auto_apertura time,
  add column porta_auto_chiusura time,
  add column porta_auto_aggiornata_il timestamptz;

alter table public.pollai
  add constraint pollai_porta_auto_orari_check check (
    porta_auto_apertura is null
    or porta_auto_chiusura is null
    or porta_auto_chiusura > porta_auto_apertura
  ),
  add constraint pollai_porta_auto_attiva_check check (
    not porta_auto_attiva
    or porta_auto_apertura is not null
    or porta_auto_chiusura is not null
  );

comment on column public.pollai.porta_auto_apertura is
  'Ora italiana di apertura automatica (null = si apre a mano).';
comment on column public.pollai.porta_auto_chiusura is
  'Ora italiana di chiusura automatica (null = si chiude a mano).';
comment on column public.pollai.porta_auto_aggiornata_il is
  'Ultima modifica della configurazione: le registrazioni automatiche valgono solo per gli orari successivi. Gestita da trigger.';

-- Ogni modifica alla configurazione fa ripartire la "sveglia".
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
  end if;
  return new;
end;
$$;

create trigger trg_pollai_porta_auto before update on public.pollai
  for each row execute function public.pollai_porta_auto_modificata();

-- ── LOG_USCITE: quali orari sono stati registrati dalla porta ─
alter table public.log_uscite
  add column uscita_auto boolean not null default false,
  add column rientro_auto boolean not null default false;

comment on column public.log_uscite.uscita_auto is
  'true = ora_uscita registrata dalla porta automatica. Torna false se l''orario viene corretto a mano.';
comment on column public.log_uscite.rientro_auto is
  'true = ora_rientro registrata dalla porta automatica. Torna false se l''orario viene corretto a mano.';

-- Un orario corretto (o cancellato) a mano non è più "automatico".
-- La funzione della porta imposta orario e flag insieme, quindi lì il flag
-- cambia (false → true) e resta com'è.
create or replace function public.log_uscite_azzera_auto()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.ora_uscita is null
     or (new.ora_uscita is distinct from old.ora_uscita
         and new.uscita_auto = old.uscita_auto) then
    new.uscita_auto := false;
  end if;
  if new.ora_rientro is null
     or (new.ora_rientro is distinct from old.ora_rientro
         and new.rientro_auto = old.rientro_auto) then
    new.rientro_auto := false;
  end if;
  return new;
end;
$$;

create trigger trg_log_uscite_azzera_auto before update on public.log_uscite
  for each row execute function public.log_uscite_azzera_auto();

-- ── REGISTRAZIONE AUTOMATICA ──────────────────────────────
-- Chiamata ogni minuto da pg_cron. `p_adesso` esiste per i test: in
-- produzione vale sempre now().
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
  -- Aperture: l'orario di oggi è passato (dopo l'ultima modifica della
  -- configurazione) e oggi non risulta ancora nessuna apertura.
  insert into public.log_uscite as l (pollaio_id, data, ora_uscita, uscita_auto)
  select p.id, v_oggi, p.porta_auto_apertura, true
  from public.pollai p
  where p.porta_auto_attiva
    and p.porta_auto_apertura is not null
    and p.porta_auto_apertura <= v_ora
    and (
      p.porta_auto_aggiornata_il is null
      or (v_oggi + p.porta_auto_apertura)
         >= (p.porta_auto_aggiornata_il at time zone 'Europe/Rome')
    )
    and not exists (
      select 1 from public.log_uscite x
      where x.pollaio_id = p.id
        and x.data = v_oggi
        and (
          x.ora_uscita is not null
          -- già chiuso prima dell'orario di apertura: non ha senso "aprirlo dopo"
          or (x.ora_rientro is not null and x.ora_rientro <= p.porta_auto_apertura)
        )
    )
  on conflict (pollaio_id, data) do update
    set ora_uscita = excluded.ora_uscita,
        uscita_auto = true
    where l.ora_uscita is null;

  -- Chiusure: l'orario di oggi è passato, il pollaio risulta aperto da prima
  -- di quell'ora e non è ancora stato chiuso.
  update public.log_uscite l
  set ora_rientro = p.porta_auto_chiusura,
      rientro_auto = true
  from public.pollai p
  where p.id = l.pollaio_id
    and l.data = v_oggi
    and p.porta_auto_attiva
    and p.porta_auto_chiusura is not null
    and p.porta_auto_chiusura <= v_ora
    and (
      p.porta_auto_aggiornata_il is null
      or (v_oggi + p.porta_auto_chiusura)
         >= (p.porta_auto_aggiornata_il at time zone 'Europe/Rome')
    )
    and l.ora_rientro is null
    and l.ora_uscita is not null
    and l.ora_uscita < p.porta_auto_chiusura;
end;
$$;

-- Funzioni interne: niente esposizione via RPC.
revoke all on function public.pollai_porta_auto_modificata() from public, anon, authenticated;
revoke all on function public.log_uscite_azzera_auto() from public, anon, authenticated;
revoke all on function public.registra_porte_automatiche(timestamptz) from public, anon, authenticated;

-- ── PG_CRON ───────────────────────────────────────────────
-- Ogni minuto, come il job delle notifiche. Idempotente.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname = 'poliner-porta-automatica';

    perform cron.schedule(
      'poliner-porta-automatica',
      '* * * * *',
      'select public.registra_porte_automatiche()'
    );
  end if;
end $$;
