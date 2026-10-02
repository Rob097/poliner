-- ╔══════════════════════════════════════════════════════════╗
-- ║  POLINER — Sospensione uova (tempo di sospensione)       ║
-- ║                                                          ║
-- ║  Dopo un farmaco (antibiotico, antiparassitario, ...)    ║
-- ║  le uova delle galline trattate non sono commestibili    ║
-- ║  per un certo periodo: il "tempo di sospensione" (nel    ║
-- ║  linguaggio normativo "tempo di attesa").                ║
-- ║                                                          ║
-- ║  Modello:                                                ║
-- ║   - sospensioni_uova: periodo [data_inizio, data_fine]   ║
-- ║     (estremi inclusi) + galline coinvolte: tutte oppure  ║
-- ║     l'elenco `animale_ids`.                              ║
-- ║   - uova.stato guadagna 'non_commestibile' e 'scartato'. ║
-- ║     Un trigger su `uova` marca come 'non_commestibile'   ║
-- ║     ogni uovo deposto nel periodo da una gallina         ║
-- ║     coinvolta — o senza gallina indicata, per prudenza.  ║
-- ║     Un trigger su `sospensioni_uova` ricalcola le uova   ║
-- ║     del periodo a ogni insert/update/delete.             ║
-- ║                                                          ║
-- ║  Scorte, regali, richieste dei guest, tool AI e          ║
-- ║  notifiche filtrano già su stato = 'disponibile': le     ║
-- ║  uova sospese ne restano escluse senza toccarli.         ║
-- ╚══════════════════════════════════════════════════════════╝

-- ── TABELLA ───────────────────────────────────────────────
create table public.sospensioni_uova (
  id uuid primary key default gen_random_uuid(),
  pollaio_id uuid not null references public.pollai(id) on delete cascade,
  data_inizio date not null,
  data_fine date not null,
  tutte boolean not null default false,
  animale_ids uuid[] not null default '{}',
  motivo text not null,
  prodotto text,
  note text,
  trattamento_id uuid references public.trattamenti(id) on delete set null,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sospensioni_uova_periodo_check check (data_fine >= data_inizio),
  constraint sospensioni_uova_galline_check check (tutte or cardinality(animale_ids) > 0),
  constraint sospensioni_uova_motivo_check check (length(btrim(motivo)) > 0)
);

create index sospensioni_uova_pollaio_fine_idx
  on public.sospensioni_uova (pollaio_id, data_fine desc);
create index sospensioni_uova_trattamento_idx
  on public.sospensioni_uova (trattamento_id)
  where trattamento_id is not null;

create trigger trg_sospensioni_uova_updated before update on public.sospensioni_uova
  for each row execute function public.set_updated_at();

comment on table public.sospensioni_uova is
  'Periodi di sospensione (tempo di attesa) dopo farmaci: le uova deposte nel periodo dalle galline coinvolte non sono commestibili.';
comment on column public.sospensioni_uova.data_fine is
  'Ultimo giorno (incluso) in cui le uova NON sono commestibili. Dal giorno dopo tornano buone.';
comment on column public.sospensioni_uova.tutte is
  'true = tutto il pollaio (es. farmaco nell''abbeveratoio); animale_ids viene ignorato.';

-- ── UOVA: nuovi stati + riferimento alla sospensione ─────
alter table public.uova
  add column sospensione_id uuid references public.sospensioni_uova(id) on delete set null;

create index uova_sospensione_id_idx
  on public.uova (sospensione_id)
  where sospensione_id is not null;

alter table public.uova drop constraint uova_stato_check;
alter table public.uova add constraint uova_stato_check
  check (stato in ('disponibile', 'non_commestibile', 'scartato', 'consumato', 'regalato'));

comment on column public.uova.sospensione_id is
  'Sospensione che ha reso l''uovo non commestibile. Gestita dai trigger, non scriverla a mano.';

-- ── FUNZIONI ──────────────────────────────────────────────

-- Sospensione che copre un uovo (la più lunga, se più d'una), oppure null.
-- Il giorno di deposizione è quello italiano, coerente con il resto dell'app.
create or replace function public.sospensione_uova_per(
  p_pollaio_id uuid,
  p_animale_id uuid,
  p_data_deposizione timestamptz
)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.id
  from public.sospensioni_uova s
  where s.pollaio_id = p_pollaio_id
    and (p_data_deposizione at time zone 'Europe/Rome')::date
        between s.data_inizio and s.data_fine
    and (s.tutte or p_animale_id is null or p_animale_id = any (s.animale_ids))
  order by s.data_fine desc, s.created_at desc
  limit 1
$$;

-- BEFORE INSERT/UPDATE su uova: classifica l'uovo. Tocca solo le uova "in
-- scorta" (disponibile / non_commestibile): consumate, regalate e scartate
-- sono storia e restano come sono.
create or replace function public.uova_applica_sospensione()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sospensione uuid;
begin
  if new.stato not in ('disponibile', 'non_commestibile') then
    return new;
  end if;

  v_sospensione := public.sospensione_uova_per(
    new.pollaio_id, new.animale_id, new.data_deposizione
  );
  new.sospensione_id := v_sospensione;
  new.stato := case when v_sospensione is null then 'disponibile' else 'non_commestibile' end;
  return new;
end;
$$;

create trigger trg_uova_sospensione
  before insert or update of stato, data_deposizione, animale_id, pollaio_id on public.uova
  for each row execute function public.uova_applica_sospensione();

-- Ricalcola le uova in scorta deposte tra p_dal e p_al (giorni italiani,
-- estremi inclusi). Aggiorna solo le righe che cambiano davvero.
create or replace function public.ricalcola_uova_sospensione(
  p_pollaio_id uuid,
  p_dal date,
  p_al date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  with calcolo as (
    select
      u.id,
      public.sospensione_uova_per(u.pollaio_id, u.animale_id, u.data_deposizione) as sospensione_id
    from public.uova u
    where u.pollaio_id = p_pollaio_id
      and u.stato in ('disponibile', 'non_commestibile')
      and u.data_deposizione >= (p_dal::timestamp at time zone 'Europe/Rome')
      and u.data_deposizione < ((p_al + 1)::timestamp at time zone 'Europe/Rome')
  )
  update public.uova u
  set stato = case when c.sospensione_id is null then 'disponibile' else 'non_commestibile' end,
      sospensione_id = c.sospensione_id
  from calcolo c
  where u.id = c.id
    and (
      u.sospensione_id is distinct from c.sospensione_id
      or u.stato <> case when c.sospensione_id is null then 'disponibile' else 'non_commestibile' end
    );
end;
$$;

-- AFTER INSERT/UPDATE/DELETE su sospensioni_uova: ricalcola sia il vecchio
-- sia il nuovo periodo (le date possono essere state spostate).
create or replace function public.sospensioni_uova_ricalcola()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.ricalcola_uova_sospensione(old.pollaio_id, old.data_inizio, old.data_fine);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.ricalcola_uova_sospensione(new.pollaio_id, new.data_inizio, new.data_fine);
  end if;
  return null;
end;
$$;

create trigger trg_sospensioni_uova_ricalcola
  after insert or update or delete on public.sospensioni_uova
  for each row execute function public.sospensioni_uova_ricalcola();

-- Funzioni interne: niente esposizione via RPC (stesso schema di
-- handle_new_user / auto_member_on_pollaio_insert).
revoke all on function public.sospensione_uova_per(uuid, uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.uova_applica_sospensione() from public, anon, authenticated;
revoke all on function public.ricalcola_uova_sospensione(uuid, date, date) from public, anon, authenticated;
revoke all on function public.sospensioni_uova_ricalcola() from public, anon, authenticated;

-- ── RLS ───────────────────────────────────────────────────
-- Lettura a tutti i membri (anche guest): è un'informazione di sicurezza
-- alimentare, chi prende le uova dal frigo deve poterla vedere.
-- Scrittura solo admin.
alter table public.sospensioni_uova enable row level security;

create policy "sospensioni_uova_select" on public.sospensioni_uova
  for select to authenticated
  using (public.is_my_pollaio(pollaio_id));

create policy "sospensioni_uova_insert" on public.sospensioni_uova
  for insert to authenticated
  with check (
    public.is_my_pollaio(pollaio_id)
    and public.my_pollaio_role(pollaio_id) = 'admin'
  );

create policy "sospensioni_uova_update" on public.sospensioni_uova
  for update to authenticated
  using (
    public.is_my_pollaio(pollaio_id)
    and public.my_pollaio_role(pollaio_id) = 'admin'
  )
  with check (
    public.is_my_pollaio(pollaio_id)
    and public.my_pollaio_role(pollaio_id) = 'admin'
  );

create policy "sospensioni_uova_delete" on public.sospensioni_uova
  for delete to authenticated
  using (
    public.is_my_pollaio(pollaio_id)
    and public.my_pollaio_role(pollaio_id) = 'admin'
  );

-- ── DATA API GRANTS ───────────────────────────────────────
grant select, insert, update, delete on public.sospensioni_uova to authenticated;
