-- ╔══════════════════════════════════════════════════════════╗
-- ║  POLINER — Inviti per email (Fase B)                     ║
-- ║                                                          ║
-- ║  Admin invita persone per email a collaborare o          ║
-- ║  visualizzare un pollaio. Il link contiene un token       ║
-- ║  random; alla registrazione/login l'invito viene         ║
-- ║  accettato via RPC SECURITY DEFINER che verifica         ║
-- ║  email destinatario + scadenza.                          ║
-- ╚══════════════════════════════════════════════════════════╝

create table if not exists public.pollaio_inviti (
  id uuid primary key default gen_random_uuid(),
  pollaio_id uuid not null references public.pollai(id) on delete cascade,
  email text not null,
  ruolo text not null check (ruolo in ('admin','guest')),
  token uuid not null unique default gen_random_uuid(),
  invitato_da uuid not null references auth.users(id) on delete cascade,
  messaggio text,
  scadenza timestamptz not null default (now() + interval '7 days'),
  accettato_il timestamptz,
  accettato_da uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists pollaio_inviti_pollaio_idx on public.pollaio_inviti(pollaio_id);
create index if not exists pollaio_inviti_email_idx on public.pollaio_inviti(lower(email))
  where accettato_il is null;
-- Un solo invito attivo per (pollaio, email)
create unique index if not exists pollaio_inviti_unique_pending
  on public.pollaio_inviti(pollaio_id, lower(email))
  where accettato_il is null;

alter table public.pollaio_inviti enable row level security;

-- Admin del pollaio: full CRUD
drop policy if exists "inviti_admin_all" on public.pollaio_inviti;
create policy "inviti_admin_all" on public.pollaio_inviti for all
  using (public.my_pollaio_role(pollaio_id) = 'admin')
  with check (public.my_pollaio_role(pollaio_id) = 'admin');

-- Il destinatario (per email) può vedere il proprio invito pending
drop policy if exists "inviti_destinatario_select" on public.pollaio_inviti;
create policy "inviti_destinatario_select" on public.pollaio_inviti for select
  using (
    accettato_il is null
    and scadenza > now()
    and lower(email) = lower(coalesce(
      (select u.email from auth.users u where u.id = auth.uid()),
      ''
    ))
  );

-- ─── RPC accept_invito(token) ──────────────────────────────
-- Verifica scadenza + email matching, inserisce in pollaio_members,
-- marca invito come accettato, setta pollaio_attivo_id se mancante.
create or replace function public.accept_invito(p_token uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_invito record;
begin
  if v_user_id is null then
    return json_build_object('ok', false, 'errore', 'Devi accedere per accettare l''invito.');
  end if;

  select email into v_user_email from auth.users where id = v_user_id;

  select * into v_invito
  from public.pollaio_inviti
  where token = p_token
    and accettato_il is null
    and scadenza > now()
  for update;

  if v_invito.id is null then
    return json_build_object('ok', false, 'errore', 'Invito non valido o scaduto.');
  end if;

  if lower(v_invito.email) <> lower(coalesce(v_user_email, '')) then
    return json_build_object('ok', false, 'errore', 'Questo invito è per un altro indirizzo email.');
  end if;

  -- Inserisce membership (idempotente: se già membro non degrada admin a guest)
  insert into public.pollaio_members (pollaio_id, user_id, ruolo)
  values (v_invito.pollaio_id, v_user_id, v_invito.ruolo)
  on conflict (pollaio_id, user_id) do update
    set ruolo = case
      when public.pollaio_members.ruolo = 'admin' then 'admin'
      else excluded.ruolo
    end;

  -- Marca invito come accettato
  update public.pollaio_inviti
  set accettato_il = now(), accettato_da = v_user_id
  where id = v_invito.id;

  -- Se profilo non ha pollaio attivo, settalo
  update public.profiles
  set pollaio_attivo_id = v_invito.pollaio_id
  where id = v_user_id and pollaio_attivo_id is null;

  return json_build_object('ok', true, 'pollaio_id', v_invito.pollaio_id);
end;
$$;
grant execute on function public.accept_invito(uuid) to authenticated;
