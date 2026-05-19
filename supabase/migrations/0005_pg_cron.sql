-- Schedula la funzione cron-notifications via pg_cron + pg_net
-- Esegue ogni ora (al minuto 0).
--
-- Note: Vault è il modo consigliato per memorizzare la service-role key.
-- Per semplicità qui usiamo direttamente la chiave (è già esposta solo
-- nell'environment server-side dell'edge function chiamata via pg_net).

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Permessi: pg_cron richiede privilegi al ruolo postgres (già concessi su Supabase)

-- Rimuovi schedule esistente se presente (idempotente)
do $$
begin
  if exists (select 1 from cron.job where jobname = 'poliner-notifications') then
    perform cron.unschedule('poliner-notifications');
  end if;
end $$;

-- Schedula: ogni ora al minuto 0
-- Sostituisci '__SERVICE_ROLE_KEY__' e l'URL nel comando SQL applicato
-- (vedi script scripts/setup-pg-cron.sql nel repo per la versione con sostituzione)
--
-- ATTENZIONE: questo file è informativo. La schedulazione effettiva avviene
-- via il comando in scripts/setup-pg-cron.sql che inietta i secrets.
