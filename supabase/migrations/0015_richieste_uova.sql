-- ╔══════════════════════════════════════════════════════════╗
-- ║  POLINER — Richieste uova (Fase E)                       ║
-- ║                                                          ║
-- ║  I guest possono richiedere uova; gli admin accettano    ║
-- ║  o rifiutano. L'accettazione sottrae automaticamente     ║
-- ║  dalle scorte usando una RPC SECURITY DEFINER con lock   ║
-- ║  per evitare race tra admin concorrenti.                 ║
-- ╚══════════════════════════════════════════════════════════╝

create table if not exists public.richieste_uova (
  id uuid primary key default gen_random_uuid(),
  pollaio_id uuid not null references public.pollai(id) on delete cascade,
  richiedente_user_id uuid not null references auth.users(id) on delete cascade,
  quantita int not null check (quantita > 0),
  nota text,
  stato text not null default 'in_attesa'
    check (stato in ('in_attesa','accettata','rifiutata')),
  evasa_da uuid references auth.users(id) on delete set null,
  evasa_il timestamptz,
  regalo_id uuid references public.regali(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists richieste_uova_pollaio_idx
  on public.richieste_uova(pollaio_id, stato, created_at);
create index if not exists richieste_uova_richiedente_idx
  on public.richieste_uova(richiedente_user_id);

alter table public.richieste_uova enable row level security;

-- SELECT: tutti i membri del pollaio
drop policy if exists "richieste_select_members" on public.richieste_uova;
create policy "richieste_select_members" on public.richieste_uova for select
  using (public.is_my_pollaio(pollaio_id));

-- INSERT: ogni membro (anche guest), purché stia inserendo per sé
drop policy if exists "richieste_insert_members" on public.richieste_uova;
create policy "richieste_insert_members" on public.richieste_uova for insert
  with check (
    public.is_my_pollaio(pollaio_id)
    and richiedente_user_id = auth.uid()
  );

-- UPDATE: solo admin (cambia stato accettata/rifiutata) — l'accettazione
-- effettiva passa via RPC ma le policy devono permettere comunque l'UPDATE
drop policy if exists "richieste_update_admin" on public.richieste_uova;
create policy "richieste_update_admin" on public.richieste_uova for update
  using (public.my_pollaio_role(pollaio_id) = 'admin');

-- DELETE: admin OPPURE il richiedente stesso (per annullare prima di evasione)
drop policy if exists "richieste_delete" on public.richieste_uova;
create policy "richieste_delete" on public.richieste_uova for delete
  using (
    public.my_pollaio_role(pollaio_id) = 'admin'
    or (richiedente_user_id = auth.uid() and stato = 'in_attesa')
  );

-- ─── RPC accetta_richiesta_uova ───────────────────────────
-- Atomic: lock su uova, verifica scorte, crea regalo, marca uova come
-- 'regalato', aggiorna richiesta.
create or replace function public.accetta_richiesta_uova(p_richiesta uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_richiesta record;
  v_disponibili int;
  v_contatto_id uuid;
  v_regalo_id uuid;
  v_richiedente_nome text;
begin
  if v_user_id is null then
    return json_build_object('ok', false, 'errore', 'Non autenticato');
  end if;

  -- Lock + check richiesta
  select * into v_richiesta
  from public.richieste_uova
  where id = p_richiesta and stato = 'in_attesa'
  for update;

  if v_richiesta.id is null then
    return json_build_object('ok', false, 'errore', 'Richiesta non trovata o già evasa.');
  end if;

  -- Verifica admin
  if public.my_pollaio_role(v_richiesta.pollaio_id) <> 'admin' then
    return json_build_object('ok', false, 'errore', 'Solo gli admin possono accettare richieste.');
  end if;

  -- Conta uova disponibili e blocca quelle che useremo
  select count(*) into v_disponibili
  from public.uova
  where pollaio_id = v_richiesta.pollaio_id
    and stato = 'disponibile';

  if v_disponibili < v_richiesta.quantita then
    return json_build_object(
      'ok', false,
      'errore', format('Scorte insufficienti: hai %s uova ma ne servono %s.',
                       v_disponibili, v_richiesta.quantita)
    );
  end if;

  -- Trova/crea contatto per il richiedente
  select id into v_contatto_id
  from public.contatti
  where pollaio_id = v_richiesta.pollaio_id and utente_id = v_richiesta.richiedente_user_id
  limit 1;

  if v_contatto_id is null then
    select display_name into v_richiedente_nome
    from public.profiles where id = v_richiesta.richiedente_user_id;

    insert into public.contatti (pollaio_id, nome, relazione, utente_id)
    values (
      v_richiesta.pollaio_id,
      coalesce(v_richiedente_nome, 'Membro guest'),
      'Membro del pollaio',
      v_richiesta.richiedente_user_id
    )
    returning id into v_contatto_id;
  end if;

  -- Crea regalo
  insert into public.regali (pollaio_id, contatto_id, quantita, note)
  values (
    v_richiesta.pollaio_id,
    v_contatto_id,
    v_richiesta.quantita,
    coalesce('Da richiesta uova' || case when v_richiesta.nota is not null then ' · ' || v_richiesta.nota else '' end, 'Da richiesta uova')
  )
  returning id into v_regalo_id;

  -- Marca N uova disponibili come regalate (FIFO: più vecchie prima)
  update public.uova
  set stato = 'regalato', regalo_id = v_regalo_id
  where id in (
    select id from public.uova
    where pollaio_id = v_richiesta.pollaio_id and stato = 'disponibile'
    order by data_deposizione asc
    limit v_richiesta.quantita
  );

  -- Marca richiesta accettata
  update public.richieste_uova
  set stato = 'accettata', evasa_da = v_user_id, evasa_il = now(), regalo_id = v_regalo_id
  where id = p_richiesta;

  return json_build_object('ok', true, 'regalo_id', v_regalo_id);
end;
$$;
grant execute on function public.accetta_richiesta_uova(uuid) to authenticated;

-- ─── RPC rifiuta_richiesta_uova ───────────────────────────
create or replace function public.rifiuta_richiesta_uova(p_richiesta uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_pollaio_id uuid;
begin
  if v_user_id is null then
    return json_build_object('ok', false, 'errore', 'Non autenticato');
  end if;

  select pollaio_id into v_pollaio_id
  from public.richieste_uova
  where id = p_richiesta and stato = 'in_attesa';

  if v_pollaio_id is null then
    return json_build_object('ok', false, 'errore', 'Richiesta non trovata o già evasa.');
  end if;

  if public.my_pollaio_role(v_pollaio_id) <> 'admin' then
    return json_build_object('ok', false, 'errore', 'Solo gli admin possono rifiutare richieste.');
  end if;

  update public.richieste_uova
  set stato = 'rifiutata', evasa_da = v_user_id, evasa_il = now()
  where id = p_richiesta;

  return json_build_object('ok', true);
end;
$$;
grant execute on function public.rifiuta_richiesta_uova(uuid) to authenticated;
