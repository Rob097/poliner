-- ╔══════════════════════════════════════════════════════════╗
-- ║  POLINER — Fix policy inviti_destinatario_select         ║
-- ║                                                          ║
-- ║  La policy precedente leggeva auth.users direttamente,   ║
-- ║  ma il role authenticated non ha SELECT su auth.users.   ║
-- ║  Risultato: errore "permission denied for table users"  ║
-- ║  durante qualunque INSERT/SELECT sui pollaio_inviti.     ║
-- ║                                                          ║
-- ║  Fix: usare l'email dal JWT (auth.jwt() ->> 'email'),    ║
-- ║  che non richiede privilegi su auth.users.               ║
-- ╚══════════════════════════════════════════════════════════╝

drop policy if exists "inviti_destinatario_select" on public.pollaio_inviti;

create policy "inviti_destinatario_select" on public.pollaio_inviti for select
  using (
    accettato_il is null
    and scadenza > now()
    and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
