-- Template manuale per creare o riallineare il job pg_cron di Poliner.
-- Sostituisci `__SERVICE_ROLE_KEY__` prima di eseguirlo.
-- Il job gira ogni minuto; la function decide internamente quali sweep pesanti
-- eseguire, cosi i promemoria restano precisi senza moltiplicare il carico.

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'poliner-notifications') then
    perform cron.unschedule('poliner-notifications');
  end if;
end $$;

select cron.schedule(
  'poliner-notifications',
  '* * * * *',
  $$
  select
    net.http_post(
      url := 'https://sispxufbdmetaszlhurk.functions.supabase.co/cron-notifications',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', '__SERVICE_ROLE_KEY__'
      ),
      body := '{}'::jsonb
    );
  $$
);