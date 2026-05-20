-- Schedula la funzione cron-notifications via pg_cron + pg_net.
-- Il job gira ogni minuto: i promemoria vengono gestiti al minuto,
-- mentre gli sweep piu pesanti restano cadenzati internamente dalla function.
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

-- Schedula: ogni minuto
-- Sostituisci '__SERVICE_ROLE_KEY__' nel comando SQL applicato
-- (vedi scripts/setup-pg-cron.sql nel repo per il template pronto)
--
-- ATTENZIONE: questo file è informativo. La schedulazione effettiva avviene
-- via il comando in scripts/setup-pg-cron.sql che inietta i secrets.
