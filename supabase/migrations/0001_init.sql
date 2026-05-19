-- ╔══════════════════════════════════════════════════════════╗
-- ║  POLINER — Schema iniziale                              ║
-- ╚══════════════════════════════════════════════════════════╝

-- ── EXTENSIONS ────────────────────────────────────────────
create extension if not exists "pgcrypto";  -- gen_random_uuid

-- ── HELPER updated_at ─────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── PROFILI ───────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- ── PREFERENZE NOTIFICHE ──────────────────────────────────
create table public.preferenze_notifiche (
  user_id uuid primary key references auth.users(id) on delete cascade,
  globale_attivo boolean not null default true,
  push_attivo boolean not null default true,
  email_attivo boolean not null default true,
  ora_notifiche_meteo time not null default '20:00',
  non_disturbare_inizio time,
  non_disturbare_fine time,
  categorie jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_pref_notifiche_updated before update on public.preferenze_notifiche
  for each row execute function public.set_updated_at();

-- ── PUSH SUBSCRIPTIONS ────────────────────────────────────
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index on public.push_subscriptions(user_id);

-- ── TRIGGER: auto-crea profilo + preferenze alla registrazione
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, split_part(new.email, '@', 1));
  insert into public.preferenze_notifiche (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── POLLAI ────────────────────────────────────────────────
create table public.pollai (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  posizione_lat numeric(9,6),
  posizione_lng numeric(9,6),
  posizione_nome text,
  foto_url text,
  conservazione_ambiente_giorni int not null default 20,
  conservazione_frigo_giorni int not null default 28,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.pollai(user_id);
create trigger trg_pollai_updated before update on public.pollai
  for each row execute function public.set_updated_at();

-- ── ANIMALI ───────────────────────────────────────────────
create table public.animali (
  id uuid primary key default gen_random_uuid(),
  pollaio_id uuid not null references public.pollai(id) on delete cascade,
  nome text not null,
  tipo text not null check (tipo in ('gallina','gallo')),
  razza_id text,
  razza_custom text,
  data_nascita date,
  eta_approssimativa_mesi int,
  colore_piumaggio text,
  foto_url text,
  note text,
  attivo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.animali(pollaio_id, attivo);
create trigger trg_animali_updated before update on public.animali
  for each row execute function public.set_updated_at();

-- ── NIDI ──────────────────────────────────────────────────
create table public.nidi (
  id uuid primary key default gen_random_uuid(),
  pollaio_id uuid not null references public.pollai(id) on delete cascade,
  nome text not null,
  note text,
  ordine int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.nidi(pollaio_id);

-- ── CONTATTI ──────────────────────────────────────────────
create table public.contatti (
  id uuid primary key default gen_random_uuid(),
  pollaio_id uuid not null references public.pollai(id) on delete cascade,
  nome text not null,
  relazione text,
  telefono text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.contatti(pollaio_id);
create trigger trg_contatti_updated before update on public.contatti
  for each row execute function public.set_updated_at();

-- ── REGALI ────────────────────────────────────────────────
create table public.regali (
  id uuid primary key default gen_random_uuid(),
  pollaio_id uuid not null references public.pollai(id) on delete cascade,
  contatto_id uuid references public.contatti(id) on delete set null,
  quantita int not null check (quantita > 0),
  data timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now()
);
create index on public.regali(pollaio_id, data desc);
create index on public.regali(contatto_id);

-- ── UOVA ──────────────────────────────────────────────────
create table public.uova (
  id uuid primary key default gen_random_uuid(),
  pollaio_id uuid not null references public.pollai(id) on delete cascade,
  animale_id uuid references public.animali(id) on delete set null,
  nido_id uuid references public.nidi(id) on delete set null,
  data_deposizione timestamptz not null default now(),
  foto_url text,
  note text,
  stato text not null default 'disponibile'
    check (stato in ('disponibile','consumato','regalato')),
  conservazione text not null default 'ambiente'
    check (conservazione in ('ambiente','frigo')),
  regalo_id uuid references public.regali(id) on delete set null,
  data_consumato timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.uova(pollaio_id, data_deposizione desc);
create index on public.uova(pollaio_id, stato);
create index on public.uova(animale_id);
create index on public.uova(nido_id);
create index on public.uova(regalo_id);
create trigger trg_uova_updated before update on public.uova
  for each row execute function public.set_updated_at();

-- ── EVENTI SALUTE ─────────────────────────────────────────
create table public.eventi_salute (
  id uuid primary key default gen_random_uuid(),
  pollaio_id uuid not null references public.pollai(id) on delete cascade,
  animale_id uuid not null references public.animali(id) on delete cascade,
  data timestamptz not null default now(),
  tipo text not null check (tipo in
    ('ferita','malattia','comportamento','parassiti','guscio','altro')),
  descrizione text,
  foto_url text,
  stato text not null default 'in_corso' check (stato in ('in_corso','risolto')),
  data_risoluzione timestamptz,
  note_followup text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.eventi_salute(pollaio_id, stato);
create index on public.eventi_salute(animale_id);
create trigger trg_eventi_salute_updated before update on public.eventi_salute
  for each row execute function public.set_updated_at();

-- ── TRATTAMENTI ───────────────────────────────────────────
create table public.trattamenti (
  id uuid primary key default gen_random_uuid(),
  pollaio_id uuid not null references public.pollai(id) on delete cascade,
  animale_id uuid references public.animali(id) on delete set null,
  applica_a_tutti boolean not null default false,
  data timestamptz not null default now(),
  tipo text not null,
  prodotto text,
  dose text,
  note text,
  prossima_data timestamptz,
  notifica_inviata boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.trattamenti(pollaio_id, prossima_data);
create index on public.trattamenti(animale_id);

-- ── PERIODI MUTA ──────────────────────────────────────────
create table public.periodi_muta (
  id uuid primary key default gen_random_uuid(),
  pollaio_id uuid not null references public.pollai(id) on delete cascade,
  animale_id uuid not null references public.animali(id) on delete cascade,
  data_inizio date not null,
  data_fine date,
  note text,
  created_at timestamptz not null default now()
);
create index on public.periodi_muta(animale_id, data_inizio desc);

-- ── LOG USCITE ────────────────────────────────────────────
create table public.log_uscite (
  id uuid primary key default gen_random_uuid(),
  pollaio_id uuid not null references public.pollai(id) on delete cascade,
  data date not null,
  ora_uscita time,
  ora_rientro time,
  note text,
  created_at timestamptz not null default now(),
  unique (pollaio_id, data)
);

-- ── MANUTENZIONI ──────────────────────────────────────────
create table public.manutenzioni (
  id uuid primary key default gen_random_uuid(),
  pollaio_id uuid not null references public.pollai(id) on delete cascade,
  tipo text not null,
  data timestamptz not null default now(),
  note text,
  foto_url text,
  created_at timestamptz not null default now()
);
create index on public.manutenzioni(pollaio_id, tipo, data desc);

create table public.manutenzioni_config (
  pollaio_id uuid not null references public.pollai(id) on delete cascade,
  tipo text not null,
  frequenza_giorni int not null,
  primary key (pollaio_id, tipo)
);

-- ── METEO STORICO ─────────────────────────────────────────
create table public.meteo_storico (
  id uuid primary key default gen_random_uuid(),
  pollaio_id uuid not null references public.pollai(id) on delete cascade,
  data date not null,
  temp_min numeric(4,1),
  temp_max numeric(4,1),
  precipitazioni_mm numeric(5,1),
  ore_sole numeric(3,1),
  condizione text,
  vento_max_kmh numeric(5,1),
  created_at timestamptz not null default now(),
  unique (pollaio_id, data)
);

-- ── SPESE ─────────────────────────────────────────────────
create table public.spese (
  id uuid primary key default gen_random_uuid(),
  pollaio_id uuid not null references public.pollai(id) on delete cascade,
  data date not null,
  importo_euro numeric(10,2) not null,
  descrizione text not null,
  categoria text,
  note text,
  created_at timestamptz not null default now()
);
create index on public.spese(pollaio_id, data desc);

-- ── NOTE ──────────────────────────────────────────────────
create table public.note (
  id uuid primary key default gen_random_uuid(),
  pollaio_id uuid not null references public.pollai(id) on delete cascade,
  testo text not null,
  data timestamptz not null default now(),
  tag text,
  foto_url text,
  promemoria_data timestamptz,
  promemoria_canale text check (promemoria_canale in ('push','email','entrambi')),
  promemoria_inviato boolean not null default false,
  archiviata boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.note(pollaio_id, archiviata, data desc);
create index on public.note(promemoria_data)
  where promemoria_data is not null and promemoria_inviato = false;
create trigger trg_note_updated before update on public.note
  for each row execute function public.set_updated_at();

-- ── LISTA SPESA ───────────────────────────────────────────
create table public.lista_spesa (
  id uuid primary key default gen_random_uuid(),
  pollaio_id uuid not null references public.pollai(id) on delete cascade,
  testo text not null,
  categoria text check (categoria in ('cibo','lettiera','medicinali','altro')),
  quantita text,
  comprato boolean not null default false,
  data_acquisto timestamptz,
  created_at timestamptz not null default now()
);
create index on public.lista_spesa(pollaio_id, comprato);

-- ── SCORTE CIBO ───────────────────────────────────────────
create table public.scorte_cibo (
  id uuid primary key default gen_random_uuid(),
  pollaio_id uuid not null references public.pollai(id) on delete cascade,
  nome text not null,
  quantita numeric(10,2),
  unita text,
  soglia_avviso numeric(10,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.scorte_cibo(pollaio_id);
create trigger trg_scorte_cibo_updated before update on public.scorte_cibo
  for each row execute function public.set_updated_at();

create table public.scorte_rifornimenti (
  id uuid primary key default gen_random_uuid(),
  scorta_id uuid not null references public.scorte_cibo(id) on delete cascade,
  data timestamptz not null default now(),
  quantita_aggiunta numeric(10,2) not null,
  note text,
  created_at timestamptz not null default now()
);
create index on public.scorte_rifornimenti(scorta_id, data desc);
