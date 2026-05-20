-- ╔══════════════════════════════════════════════════════════╗
-- ║  POLINER — Link contatti rubrica ↔ utenti (Fase E)       ║
-- ║                                                          ║
-- ║  Un contatto della rubrica può essere "linkato" a un     ║
-- ║  membro guest del pollaio. Quando un guest accetta una   ║
-- ║  richiesta uova, il regalo punta al contatto linkato     ║
-- ║  (o ne viene creato uno auto). L'admin può anche         ║
-- ║  collegare manualmente un contatto esistente al guest    ║
-- ║  via merge_contatto_con_utente().                        ║
-- ╚══════════════════════════════════════════════════════════╝

alter table public.contatti
  add column if not exists utente_id uuid references auth.users(id) on delete set null;

-- Un contatto può essere linkato a un solo utente per pollaio
create unique index if not exists contatti_pollaio_utente_unique
  on public.contatti(pollaio_id, utente_id)
  where utente_id is not null;

-- ─── RPC merge_contatto_con_utente ─────────────────────────
-- Linka un contatto esistente a un membro del pollaio. Se esiste
-- già un altro contatto auto-creato per quell'utente, trasferisce
-- lo storico regali sul contatto target ed elimina l'orfano.
create or replace function public.merge_contatto_con_utente(
  p_contatto uuid,
  p_utente uuid,
  p_rinomina text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pollaio_id uuid;
  v_other_contatto_id uuid;
begin
  -- Trova il contatto target e il suo pollaio
  select pollaio_id into v_pollaio_id from public.contatti where id = p_contatto;
  if v_pollaio_id is null then
    return json_build_object('ok', false, 'errore', 'Contatto non trovato.');
  end if;

  -- Solo admin del pollaio può linkare
  if public.my_pollaio_role(v_pollaio_id) <> 'admin' then
    return json_build_object('ok', false, 'errore', 'Solo gli admin possono collegare contatti.');
  end if;

  -- L'utente target deve essere membro del pollaio
  if not exists (
    select 1 from public.pollaio_members
    where pollaio_id = v_pollaio_id and user_id = p_utente
  ) then
    return json_build_object('ok', false, 'errore', 'L''utente non è membro di questo pollaio.');
  end if;

  -- Se esiste un altro contatto linkato a questo utente, mergialo
  select id into v_other_contatto_id
  from public.contatti
  where pollaio_id = v_pollaio_id and utente_id = p_utente and id <> p_contatto
  limit 1;

  if v_other_contatto_id is not null then
    update public.regali set contatto_id = p_contatto where contatto_id = v_other_contatto_id;
    delete from public.contatti where id = v_other_contatto_id;
  end if;

  -- Linka + opzionale rename
  update public.contatti
  set utente_id = p_utente,
      nome = coalesce(nullif(trim(p_rinomina), ''), nome),
      updated_at = now()
  where id = p_contatto;

  return json_build_object('ok', true);
end;
$$;
grant execute on function public.merge_contatto_con_utente(uuid, uuid, text) to authenticated;
