-- ╔══════════════════════════════════════════════════════════╗
-- ║  POLINER — Manutenzione dinamica (Fase C)                ║
-- ║                                                          ║
-- ║  I 6 tipi hardcoded vengono sostituiti da voci create    ║
-- ║  dall'utente nella tabella manutenzioni_voci. Il         ║
-- ║  catalogo statico in lib/constants/manutenzione.ts       ║
-- ║  resta come "consigli" pre-compilati.                    ║
-- ║                                                          ║
-- ║  Tabella vuota (verificato manualmente: 0 manutenzioni,  ║
-- ║  0 config) → schema cleanup diretto, niente backfill.    ║
-- ╚══════════════════════════════════════════════════════════╝

-- ─── Tabella voci attive ───────────────────────────────────
create table if not exists public.manutenzioni_voci (
  id uuid primary key default gen_random_uuid(),
  pollaio_id uuid not null references public.pollai(id) on delete cascade,
  nome text not null,
  dove text,
  icona text not null default '🧹',
  frequenza_giorni int not null check (frequenza_giorni > 0),
  note text,
  consiglio_id text,           -- nullable, traccia origine catalogo
  attivo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists manutenzioni_voci_pollaio_idx
  on public.manutenzioni_voci(pollaio_id, attivo);

drop trigger if exists trg_manutenzioni_voci_updated on public.manutenzioni_voci;
create trigger trg_manutenzioni_voci_updated before update on public.manutenzioni_voci
  for each row execute function public.set_updated_at();

-- ─── Drop manutenzioni_config (deprecata) ──────────────────
drop table if exists public.manutenzioni_config cascade;

-- ─── Refit manutenzioni: drop tipo, add voce_id ────────────
-- La tabella è vuota: drop+add diretto, niente backfill.
alter table public.manutenzioni drop column if exists tipo;
alter table public.manutenzioni
  add column if not exists voce_id uuid
  references public.manutenzioni_voci(id) on delete cascade;
alter table public.manutenzioni alter column voce_id set not null;
create index if not exists manutenzioni_voce_idx
  on public.manutenzioni(voce_id, data desc);

-- ─── RLS su manutenzioni_voci ──────────────────────────────
alter table public.manutenzioni_voci enable row level security;

drop policy if exists "voci_select" on public.manutenzioni_voci;
drop policy if exists "voci_insert" on public.manutenzioni_voci;
drop policy if exists "voci_update" on public.manutenzioni_voci;
drop policy if exists "voci_delete" on public.manutenzioni_voci;

create policy "voci_select" on public.manutenzioni_voci for select
  using (public.is_my_pollaio(pollaio_id));
create policy "voci_insert" on public.manutenzioni_voci for insert
  with check (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');
create policy "voci_update" on public.manutenzioni_voci for update
  using (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');
create policy "voci_delete" on public.manutenzioni_voci for delete
  using (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');
