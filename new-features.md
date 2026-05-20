# Poliner — Piano nuove feature

> Documento di design per 5 nuove feature di Poliner, da rivedere insieme prima dell'implementazione. Italiano = lingua del progetto. Path = assoluti dal repo root `/home/roberto/personal-projects/claude-code/poliner`.

## Contesto

L'app è oggi mono-tenant (1 utente = 1 pollaio personale, hardcoded in `requirePollaio()` che prende il primo `pollai` con `user_id = auth.uid()`). Il sistema di manutenzione mostra 6 voci fisse hardcoded, generando avvisi anche su tipologie irrilevanti per l'utente. La rubrica (`contatti`) è scollegata dagli account.

Le 5 feature in scope:

1. **Manutenzione dinamica** — voci create dall'utente, con catalogo di consigli pre-compilati.
2. **Clock-in / clock-out** — apertura e chiusura giornaliera del pollaio con suggerimento orario da alba/tramonto.
3. **Multi-tenancy** — un account può appartenere a più pollai con ruolo `admin` o `guest`, con switcher.
4. **Inviti** — admin invita via email a entrare come collaboratore o visualizzatore.
5. **Richieste uova (guest)** — i guest possono richiedere uova; admin accetta/rifiuta con sottrazione scorte; merge guest↔contatto rubrica.

Tutte e 5 sono fortemente interdipendenti (ruoli, RLS, UI condivisa). Vanno progettate insieme ma possono essere implementate in fasi separate (vedi sezione "Roadmap").

---

## Decisioni di design già confermate

| Tema | Decisione |
|------|-----------|
| Manutenzione | Catalogo consigli (6 attuali) + voci custom. Onboarding parte senza voci attive: zero avvisi finché l'utente non ne crea almeno una. |
| Clock-in/out | Card home con pulsanti rapidi "Aperto"/"Chiuso", suggerimento orario da alba/tramonto Open-Meteo. Storico + grafico in pagina dedicata. |
| Multi-tenancy | Ruoli `admin` e `guest`. Skip onboarding per chi entra via invito. Profilo unico per utente (no profilo per pollaio). |
| Inviti | Token-based via email, legato all'indirizzo destinatario. Solo admin possono invitare. Scadenza inviti 7 giorni. |
| Richieste uova | Bottone "🙏 Vorrei delle uova" → bottom sheet con quantità + nota. Lista FIFO visibile a tutti i membri. Stati: in_attesa / accettata / rifiutata. Notifica push agli admin alla creazione. |
| Vincoli scorte | Accettazione richiesta + regalo spontaneo BLOCCATI se scorte < quantità. Richiesta del guest NON bloccata anche se eccede le scorte (è una wishlist). |
| Merge guest↔contatto | Quando "Enza" diventa guest, admin può linkare il contatto rubrica "Mamma" a Enza. Lo storico regali resta, il contatto viene rinominato (opzionale) e linkato. |

---

## Architettura (sintesi)

```
┌────────────────────────────────────────────────────────────┐
│ AUTH / TENANCY                                             │
│  auth.users ─┬─< pollaio_members >─┬─ pollai               │
│              │      (ruolo)        │                       │
│              └─< pollaio_inviti ───┘                       │
│              └─ profiles.pollaio_attivo_id ─> pollai       │
├────────────────────────────────────────────────────────────┤
│ DATI PER POLLAIO (esistenti, modificati nelle RLS)         │
│  pollai ─┬─< manutenzioni_voci >─< manutenzioni            │
│          ├─< log_uscite                                    │
│          ├─< contatti (+ utente_id linkato)                │
│          ├─< richieste_uova                                │
│          ├─< regali ─< uova                                │
│          └─ tutto il resto invariato                       │
├────────────────────────────────────────────────────────────┤
│ HELPER RLS                                                 │
│  is_my_pollaio(uuid) → check membership in pollaio_members │
│  my_pollaio_role(uuid) → 'admin' | 'guest' | null          │
└────────────────────────────────────────────────────────────┘
```

Tre principi base:

- **RLS centralizzata via helper**: tutte le policy chiamano `is_my_pollaio(pollaio_id)` per SELECT e (`is_my_pollaio(pollaio_id) AND my_pollaio_role(pollaio_id) = 'admin'`) per le scritture amministrative. Cambiare il modello di membership = aggiornare solo gli helper.
- **Operazioni critiche via RPC SECURITY DEFINER**: accettare un invito, accettare una richiesta uova, fare un merge contatto → tutti via RPC atomiche con lock (`FOR UPDATE`) per evitare race condition.
- **Stato scorte derivato da `uova.stato`**: la sottrazione delle scorte = `UPDATE uova SET stato='regalato', regalo_id=X WHERE id IN (top N disponibili)`. Già implementato per i regali spontanei, da riusare per le richieste accettate.

---

## 1. Manutenzione dinamica

### 1.1 Schema DB

Nuova migrazione: `supabase/migrations/0007_manutenzione_dinamica.sql`

```sql
-- ─── Tabella voci attive create dall'utente ────────────────
create table public.manutenzioni_voci (
  id uuid primary key default gen_random_uuid(),
  pollaio_id uuid not null references public.pollai(id) on delete cascade,
  nome text not null,
  dove text,                             -- libero, es. "casetta", "recinto esterno"
  icona text not null default '🧹',      -- emoji singola
  frequenza_giorni int not null check (frequenza_giorni > 0),
  note text,
  consiglio_id text,                     -- nullable, traccia origine catalogo (es. 'pulizia_casetta')
  attivo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.manutenzioni_voci(pollaio_id, attivo);
create trigger trg_manutenzioni_voci_updated before update on public.manutenzioni_voci
  for each row execute function public.set_updated_at();

-- ─── Aggiungi voce_id a manutenzioni (interventi log) ──────
alter table public.manutenzioni
  add column voce_id uuid references public.manutenzioni_voci(id) on delete cascade;
create index on public.manutenzioni(voce_id, data desc);

-- La colonna `tipo` diventa nullable temporaneamente per consentire
-- il backfill (sez. 1.2). Verrà droppata in coda alla migration.
alter table public.manutenzioni
  alter column tipo drop not null;

-- ─── Rimuovi manutenzioni_config ───────────────────────────
-- Le frequenze sono ora colonna diretta su manutenzioni_voci.frequenza_giorni.
-- Dopo aver letto la config nel backfill (sez. 1.2), eliminiamo la tabella.
drop table if exists public.manutenzioni_config;

-- ─── Dopo il backfill, voce_id deve essere not null e tipo viene rimosso ─
-- (Queste due ALTER vanno DOPO il backfill della sez. 1.2)
alter table public.manutenzioni alter column voce_id set not null;
alter table public.manutenzioni drop column tipo;
```

### 1.2 Migrazione dati esistenti

Per ogni pollaio con manutenzioni storiche, creiamo automaticamente le `manutenzioni_voci` corrispondenti ai 6 tipi del catalogo, copiando la frequenza dal config (o default), poi popoliamo `manutenzioni.voce_id`.

```sql
-- Per ogni pollaio, crea le voci dai tipi storicamente usati
insert into public.manutenzioni_voci (pollaio_id, nome, dove, icona, frequenza_giorni, consiglio_id)
select distinct
  m.pollaio_id,
  case m.tipo
    when 'pulizia_casetta'   then 'Pulizia casetta'
    when 'pulizia_pollaio'   then 'Pulizia pollaio'
    when 'cambio_trucciolo'  then 'Cambio trucciolo'
    when 'cambio_corteccia'  then 'Cambio corteccia'
    when 'bagno_sabbia'      then 'Sabbia per il bagno'
    when 'cambio_paglia'     then 'Cambio paglia nidi'
    else m.tipo
  end,
  case m.tipo
    when 'pulizia_casetta'   then 'Casetta interna'
    when 'pulizia_pollaio'   then 'Tutto il recinto'
    when 'cambio_trucciolo'  then 'Casetta interna'
    when 'cambio_corteccia'  then 'Pollaio esterno'
    when 'bagno_sabbia'      then 'Area bagno'
    when 'cambio_paglia'     then 'Nidi'
    else null
  end,
  case m.tipo
    when 'pulizia_casetta'   then '🧹'
    when 'pulizia_pollaio'   then '🏠'
    when 'cambio_trucciolo'  then '🪵'
    when 'cambio_corteccia'  then '🌲'
    when 'bagno_sabbia'      then '⏳'
    when 'cambio_paglia'     then '🌾'
    else '🧹'
  end,
  coalesce(c.frequenza_giorni, case m.tipo
    when 'pulizia_casetta'   then 7
    when 'pulizia_pollaio'   then 14
    when 'cambio_trucciolo'  then 7
    when 'cambio_corteccia'  then 30
    when 'bagno_sabbia'      then 14
    when 'cambio_paglia'     then 7
    else 14
  end),
  m.tipo
from public.manutenzioni m
left join public.manutenzioni_config c on c.pollaio_id = m.pollaio_id and c.tipo = m.tipo
where m.tipo is not null
on conflict do nothing;  -- nessun conflitto, ma cautela

-- Linka i record di manutenzioni esistenti alle nuove voci
update public.manutenzioni m
set voce_id = v.id
from public.manutenzioni_voci v
where m.voce_id is null
  and m.tipo is not null
  and v.consiglio_id = m.tipo
  and v.pollaio_id = m.pollaio_id;
```

### 1.3 Catalogo consigli

Il file `lib/constants/manutenzione.ts` rimane ma viene **ridefinito come catalogo di consigli statici** (non più "tipi attivi"). Stesso array di 6 elementi, ma cambia la semantica.

```typescript
// lib/constants/manutenzione.ts
export interface ConsiglioManutenzione {
  id: string;             // es. 'pulizia_casetta'
  nome: string;           // "Pulizia casetta"
  dove: string;           // "Casetta interna"
  frequenzaDefault: number;
  icona: string;
  descrizione: string;    // NUOVO: testo informativo mostrato sotto il badge
}

export const CONSIGLI_MANUTENZIONE: ConsiglioManutenzione[] = [
  { id: 'pulizia_casetta', nome: 'Pulizia casetta', dove: 'Casetta interna', frequenzaDefault: 7, icona: '🧹',
    descrizione: 'Rimuovi le deiezioni e pulisci la casetta interna.' },
  // ... + altri 5
];
```

### 1.4 Server actions

Nuovo file: `app/(app)/manutenzione/voci-actions.ts`

```typescript
// Tutte le action sono admin-only (check via RLS); ritornano { ok: true } | { ok: false, errore }
export async function creaVoce(input: {
  nome: string; dove?: string; icona?: string; frequenzaGiorni: number;
  note?: string; consiglioId?: string;
}): Promise<ActionResult>;

export async function aggiornaVoce(id: string, patch: Partial<{
  nome: string; dove: string | null; icona: string;
  frequenzaGiorni: number; note: string | null; attivo: boolean;
}>): Promise<ActionResult>;

export async function eliminaVoce(id: string): Promise<ActionResult>;

// Quando l'utente clicca un badge consiglio: pre-compila il form (lato client).
// La creazione vera e propria passa per creaVoce con consiglioId valorizzato.
```

Il vecchio file `app/(app)/manutenzione/actions.ts` (registraIntervento, eliminaIntervento) viene aggiornato per accettare `voce_id` invece di `tipo`. Le azioni `aggiornaFrequenza` e `ripristinaFrequenza` vengono rimosse (sostituite da `aggiornaVoce`).

### 1.5 UI pagina manutenzione

Refactor di `app/(app)/manutenzione/page.tsx` e `app/(app)/manutenzione/ManutenzioneClient.tsx`.

Nuova struttura visiva:

```
Header ─ "Manutenzione"
│
├─ Sezione "Le mie manutenzioni" (se ci sono voci attive)
│  ├─ VoceRow x N [icona] [nome] [stato barra colorata] [✓ Fatto oggi] [⋮ menu]
│  ├─ ...
│  └─ + Aggiungi voce custom
│
├─ Sezione "Consigli" (sempre visibile)
│  ├─ Badge consiglio x 6 (grid 2 col)
│  │  Tap → bottom sheet "Crea voce da consiglio"
│  │  con campi pre-compilati dal catalogo, l'utente
│  │  può modificare nome/dove/freq/icona/note prima di salvare
│  └─ Nota: "Tocca un consiglio per aggiungerlo. Puoi sempre personalizzarlo."
│
└─ Sezione "Ultimi interventi" (se ci sono log)
```

Per i guest, le sezioni "Le mie manutenzioni" e "Consigli" sono read-only (no pulsanti edit/add, no menu ⋮). Vedono solo lo stato.

### 1.6 Home: ricalcolo avvisi

Modifica di `app/(app)/page.tsx`:

```typescript
// Carica solo voci ATTIVE, non più i 6 tipi hardcoded
const { data: voci } = await supabase
  .from('manutenzioni_voci')
  .select('id, nome, icona, frequenza_giorni')
  .eq('pollaio_id', pollaio.id)
  .eq('attivo', true);

// Per ogni voce, prendi l'ultima manutenzione
const { data: ultime } = await supabase
  .from('manutenzioni')
  .select('voce_id, data')
  .eq('pollaio_id', pollaio.id)
  .in('voce_id', voci?.map(v => v.id) ?? [])
  .order('data', { ascending: false });

// Calcola stati (riusa lib/utils/manutenzione.ts adattato)
const stati = calcolaStatiManutenzioneFromVoci(voci ?? [], ultime ?? []);
```

Adatta `lib/utils/manutenzione.ts:calcolaStatiManutenzione()` a `calcolaStatiManutenzioneFromVoci(voci, log)`. Stessa logica (giorniDaUltimo, giorniRimanenti, stato) ma in input le voci dinamiche.

**Regola della home**: se `voci.length === 0` → nessun alert di manutenzione nella home. Sezione muta.

### 1.7 Cron notifiche manutenzione

Modifica `supabase/functions/cron-notifications/index.ts`. Sostituisci il loop su `TIPI_MANUTENZIONE` con una query su `manutenzioni_voci` (per ogni pollaio, per ogni voce attiva), e calcola scaduta/domani uguale a prima.

```typescript
// Vecchio:
// for (const tipo of TIPI_MANUTENZIONE) { ... }

// Nuovo:
const { data: voci } = await supabase
  .from('manutenzioni_voci')
  .select('id, pollaio_id, nome, icona, frequenza_giorni')
  .eq('attivo', true);

for (const v of voci ?? []) {
  // Trova ultima manutenzione di questa voce
  // Calcola rim = freq - giorniDaUltimo
  // Notifica se rim < 0 (scaduta) o rim === 1 (domani)
  // dedup_key: `voce-${v.id}-scaduta-${today}` o `voce-${v.id}-domani-${today}`
  // Notifica TUTTI gli admin del pollaio (non solo il proprietario)
}
```

Nota importante: ora il pollaio può avere più di un admin. La notifica deve essere inviata a ogni admin (loop su `pollaio_members` con `ruolo='admin'`). I guest **non** ricevono notifiche di manutenzione.

---

## 2. Clock-in / clock-out

### 2.1 Schema DB

La tabella `log_uscite` esiste già in `0001_init.sql:234-243` ed è perfetta:

```sql
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
```

Nessuna modifica DB necessaria. Lo UNIQUE su `(pollaio_id, data)` garantisce una sola riga per giornata: usiamo UPSERT.

### 2.2 Suggerimento orario alba/tramonto

Open-Meteo fornisce alba/tramonto via API `daily=sunrise,sunset`. Aggiungere a `lib/utils/meteo.ts`:

```typescript
export async function getAlbaTramonto(
  lat: number, lng: number, date: string // 'YYYY-MM-DD'
): Promise<{ alba: string | null; tramonto: string | null }> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
              `&daily=sunrise,sunset&timezone=auto&start_date=${date}&end_date=${date}`;
  const res = await fetch(url, { next: { revalidate: 3600 } }); // cache 1h
  if (!res.ok) return { alba: null, tramonto: null };
  const json = await res.json();
  return {
    alba: json.daily?.sunrise?.[0]?.slice(11, 16) ?? null,    // 'HH:MM'
    tramonto: json.daily?.sunset?.[0]?.slice(11, 16) ?? null,
  };
}
```

### 2.3 Server actions

Nuovo file: `app/(app)/uscite/actions.ts` (o `lib/actions/uscite.ts` per essere accessibile dalla home).

```typescript
// Upsert: inserisce/aggiorna la riga di oggi
export async function registraApertura(): Promise<ActionResult>; // ora_uscita = now()
export async function registraChiusura(): Promise<ActionResult>; // ora_rientro = now()

// Modifica manuale di un orario già registrato
export async function aggiornaOrario(
  id: string,
  patch: { oraUscita?: string | null; oraRientro?: string | null; note?: string | null }
): Promise<ActionResult>;
```

Le action sono admin-only (RLS). I guest possono solo leggere lo storico.

### 2.4 UI

**Card home** (`app/(app)/page.tsx`): nuova card sopra gli avvisi, dopo la card meteo.

```
┌─────────────────────────────────────────────┐
│ 🌅 Apertura/Chiusura                        │
│                                             │
│  Aperto alle 07:14                          │ ← stato corrente
│  Suggerito: tramonto alle 20:48             │ ← se non chiuso
│                                             │
│  [  🌙 Chiudo ora  ]                        │ ← pulsante grande contestuale
└─────────────────────────────────────────────┘
```

Stati possibili:
- Nessuna riga oggi → pulsante "🌅 Apro ora", suggerimento "Alba alle HH:MM".
- Solo `ora_uscita` → pulsante "🌙 Chiudo ora", suggerimento "Tramonto alle HH:MM".
- Entrambi → riepilogo "Aperto alle X, chiuso alle Y" + link "Vedi storico".

Bottom sheet "Modifica orari" accessibile da tap sulla riga per correzioni manuali.

**Pagina storico** (`app/(app)/uscite/page.tsx`, NUOVA):

- Lista delle ultime 30 giornate con data, ora uscita, ora rientro, eventuale note.
- Grafico (Recharts) "Orario medio settimanale" con due linee (uscita media, rientro media) sulla settimana corrente vs settimane precedenti.
- Pulsante "+" per aggiungere manualmente una riga storica.

Per i guest la pagina è read-only (no pulsante "+", no edit).

### 2.5 RLS

Aggiungi a `0008_rls_admin_role.sql` (vedi sezione multi-tenancy):

```sql
-- log_uscite: SELECT a tutti i membri, scritture solo admin
drop policy "log_uscite_select" on public.log_uscite;
drop policy "log_uscite_insert" on public.log_uscite;
drop policy "log_uscite_update" on public.log_uscite;
drop policy "log_uscite_delete" on public.log_uscite;

create policy "log_uscite_select" on public.log_uscite for select
  using (public.is_my_pollaio(pollaio_id));
create policy "log_uscite_insert" on public.log_uscite for insert
  with check (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');
create policy "log_uscite_update" on public.log_uscite for update
  using (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');
create policy "log_uscite_delete" on public.log_uscite for delete
  using (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');
```

---

## 3. Multi-tenancy

### 3.1 Schema DB

Nuova migrazione: `supabase/migrations/0008_multi_tenancy.sql`

```sql
-- ─── Membership ────────────────────────────────────────────
create table public.pollaio_members (
  pollaio_id uuid not null references public.pollai(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  ruolo text not null check (ruolo in ('admin','guest')),
  created_at timestamptz not null default now(),
  primary key (pollaio_id, user_id)
);
create index on public.pollaio_members(user_id);
create index on public.pollaio_members(pollaio_id, ruolo);

-- ─── Pollaio attivo per utente ─────────────────────────────
alter table public.profiles
  add column pollaio_attivo_id uuid references public.pollai(id) on delete set null;

-- ─── Backfill: per ogni pollaio esistente, crea membership admin ─
insert into public.pollaio_members (pollaio_id, user_id, ruolo)
select p.id, p.user_id, 'admin'
from public.pollai p
on conflict do nothing;

-- ─── Backfill: setta pollaio attivo per ogni profilo ───────
update public.profiles pr
set pollaio_attivo_id = (
  select pm.pollaio_id from public.pollaio_members pm
  where pm.user_id = pr.id
  order by pm.created_at asc
  limit 1
)
where pr.pollaio_attivo_id is null;

-- ─── Riscrittura is_my_pollaio() ───────────────────────────
create or replace function public.is_my_pollaio(p_pollaio uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists(
    select 1 from public.pollaio_members
    where pollaio_id = p_pollaio
      and user_id = auth.uid()
  );
$$;
grant execute on function public.is_my_pollaio(uuid) to authenticated;

-- ─── Helper my_pollaio_role() ──────────────────────────────
create or replace function public.my_pollaio_role(p_pollaio uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select ruolo from public.pollaio_members
  where pollaio_id = p_pollaio
    and user_id = auth.uid()
  limit 1;
$$;
grant execute on function public.my_pollaio_role(uuid) to authenticated;

-- ─── RLS su pollaio_members ────────────────────────────────
alter table public.pollaio_members enable row level security;

-- Membri possono vedere altri membri dello stesso pollaio
create policy "members_select_same_pollaio" on public.pollaio_members
  for select using (public.is_my_pollaio(pollaio_id));

-- INSERT solo via RPC SECURITY DEFINER (accept_invito, ecc.)
-- Niente policy INSERT diretta.

-- UPDATE (es. promuovere guest ad admin): solo admin
create policy "members_update_admin" on public.pollaio_members
  for update using (public.my_pollaio_role(pollaio_id) = 'admin');

-- DELETE: admin può rimuovere chiunque, ogni membro può rimuovere sé stesso (abbandona)
create policy "members_delete_admin_or_self" on public.pollaio_members
  for delete using (
    public.my_pollaio_role(pollaio_id) = 'admin'
    or user_id = auth.uid()
  );
```

### 3.2 Aggiornamento policy esistenti

Nuova migrazione: `supabase/migrations/0009_rls_admin_role.sql`

Per ogni tabella "dati operativi del pollaio" aggiorniamo le policy così:

- **SELECT**: invariato (`is_my_pollaio(pollaio_id)` — già OK perché ora membership-based).
- **INSERT/UPDATE/DELETE**: aggiungere il check `and my_pollaio_role(pollaio_id) = 'admin'`.

Tabelle interessate (scritture admin-only):
- `animali`, `pesate_animali`, `vaccinazioni`, `trattamenti`, `periodi_muta`, `salute_eventi`
- `manutenzioni`, `manutenzioni_voci`, `manutenzioni_config` (deprecato)
- `log_uscite`
- `nidi`, `uova`, `regali`, `contatti`
- `scorte_cibo`, `lista_spesa`, `spese`
- `note`, `note_promemoria`
- `pollai` (modifica nome/posizione/conservazione)
- `manutenzioni_voci` (creazione/modifica)

Tabelle "user-owned" non toccate (rimangono `auth.uid() = user_id`):
- `profiles`, `preferenze_notifiche`, `push_subscriptions`, `notifiche_inviate`

Tabelle "speciali":
- `richieste_uova`: SELECT a tutti i membri, INSERT a tutti (anche guest), UPDATE/DELETE solo admin. Vedi sez. 5.
- `pollaio_inviti`: SELECT/INSERT/UPDATE/DELETE solo admin. Vedi sez. 4.

Esempio per `manutenzioni`:

```sql
drop policy "manutenzioni_select" on public.manutenzioni;
drop policy "manutenzioni_insert" on public.manutenzioni;
drop policy "manutenzioni_update" on public.manutenzioni;
drop policy "manutenzioni_delete" on public.manutenzioni;

create policy "manutenzioni_select" on public.manutenzioni for select
  using (public.is_my_pollaio(pollaio_id));
create policy "manutenzioni_insert" on public.manutenzioni for insert
  with check (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');
create policy "manutenzioni_update" on public.manutenzioni for update
  using (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');
create policy "manutenzioni_delete" on public.manutenzioni for delete
  using (public.is_my_pollaio(pollaio_id) and public.my_pollaio_role(pollaio_id) = 'admin');
```

Da ripetere per tutte le tabelle elencate (script generabile da template).

### 3.3 Pollaio attivo e switcher

Modifica `lib/supabase/queries.ts:requirePollaio()`:

```typescript
export async function requirePollaio(): Promise<{
  supabase: SupabaseClient;
  user: User;
  pollaio: Pollai;
  ruolo: 'admin' | 'guest';
  pollai: Pollai[];           // lista completa per lo switcher
}> {
  const { supabase, user } = await requireUser();

  // Carica tutti i pollai dell'utente via membership
  const { data: memberships } = await supabase
    .from('pollaio_members')
    .select('ruolo, pollai:pollaio_id(*)')
    .eq('user_id', user.id);

  const pollai = (memberships ?? []).map(m => m.pollai as Pollai);

  if (pollai.length === 0) {
    // Nessun pollaio: redirige a onboarding se non c'è invito pending
    const { data: invitiPending } = await supabase
      .from('pollaio_inviti')
      .select('id')
      .eq('email', user.email)
      .is('accettato_il', null)
      .gt('scadenza', new Date().toISOString())
      .limit(1);

    if (invitiPending && invitiPending.length > 0) {
      redirect('/inviti-pending');
    }
    redirect('/onboarding');
  }

  // Trova pollaio attivo
  const { data: profile } = await supabase
    .from('profiles')
    .select('pollaio_attivo_id')
    .eq('id', user.id)
    .single();

  let attivoId = profile?.pollaio_attivo_id;
  let pollaio = pollai.find(p => p.id === attivoId);

  // Fallback: se attivoId non è più nei pollai (es. rimosso), prendi il primo
  if (!pollaio) {
    pollaio = pollai[0];
    await supabase.from('profiles').update({ pollaio_attivo_id: pollaio.id }).eq('id', user.id);
  }

  const ruolo = memberships?.find(m => (m.pollai as Pollai).id === pollaio.id)?.ruolo as 'admin' | 'guest';

  return { supabase, user, pollaio, ruolo, pollai };
}
```

Tutte le pagine che usano `requirePollaio()` ottengono ora automaticamente `ruolo` e `pollai`. Servirà fare l'update dei tipi destrutturati in ~15 file.

### 3.4 Server action switch pollaio

Nuovo file: `lib/actions/pollaio.ts`

```typescript
'use server';

export async function switchPollaio(pollaioId: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  // Verifica membership
  const { data: member } = await supabase
    .from('pollaio_members')
    .select('pollaio_id')
    .eq('pollaio_id', pollaioId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!member) return { ok: false, errore: 'Non sei membro di questo pollaio' };

  const { error } = await supabase
    .from('profiles')
    .update({ pollaio_attivo_id: pollaioId })
    .eq('id', user.id);
  if (error) return { ok: false, errore: 'Errore durante il cambio pollaio' };

  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function creaPollaio(input: { nome: string; posizione?: { lat: number; lng: number; nome: string } }): Promise<ActionResult>;
export async function abbandonaPollaio(pollaioId: string): Promise<ActionResult>;
```

### 3.5 UI switcher

Modifica `components/ui/Header.tsx` — il sottotitolo (che oggi mostra il nome del pollaio) diventa cliccabile se ci sono ≥2 pollai. Tap → apre bottom sheet con lista pollai + ruolo + pulsante "Crea nuovo pollaio".

```
┌─────────────────────────┐
│ I tuoi pollai           │
├─────────────────────────┤
│ ● Casa Roberto    admin │  ← attivo
│ ○ Pollaio Enza    guest │  ← tap per switch
│ ○ ...                   │
│                         │
│ [+ Crea nuovo pollaio]  │
└─────────────────────────┘
```

Per accessibilità: aggiungere indicatore visivo nell'Header che il pollaio attivo cambia (es. piccola etichetta "guest" se ruolo = guest).

### 3.6 Onboarding: skip se invitato

Modifica `app/onboarding/page.tsx`:

```typescript
// Prima di mostrare onboarding, controlla se c'è invito pending
const { data: inviti } = await supabase
  .from('pollaio_inviti')
  .select('id, token')
  .eq('email', user.email)
  .is('accettato_il', null)
  .gt('scadenza', new Date().toISOString())
  .limit(1);

if (inviti && inviti.length > 0) {
  redirect(`/invito/${inviti[0].token}`);
}
```

Inoltre, se l'utente arriva direttamente via `/invito/[token]` e non ha ancora un account, dopo il signup il flusso esegue `accept_invito()` e salta l'onboarding.

### 3.7 Componente PermissionGate

Helper UI per nascondere pulsanti admin-only: `components/auth/PermissionGate.tsx`

```typescript
interface Props {
  ruolo: 'admin' | 'guest';
  required: 'admin';
  children: ReactNode;
  fallback?: ReactNode;
}
export function PermissionGate({ ruolo, required, children, fallback = null }: Props) {
  if (ruolo !== required) return <>{fallback}</>;
  return <>{children}</>;
}
```

Da usare in:
- `app/(app)/galline/` (pulsanti aggiungi/modifica)
- `app/(app)/uova/` (pulsanti aggiungi/modifica, regala)
- `app/(app)/manutenzione/` (pulsanti aggiungi voce, ✓ Fatto)
- `app/(app)/scorte/` (CRUD)
- ... tutte le pagine con scritture

I guest possono comunque vedere tutto (read).

---

## 4. Inviti

### 4.1 Schema DB

Nuova migrazione: `supabase/migrations/0010_inviti.sql`

```sql
create table public.pollaio_inviti (
  id uuid primary key default gen_random_uuid(),
  pollaio_id uuid not null references public.pollai(id) on delete cascade,
  email text not null,
  ruolo text not null check (ruolo in ('admin','guest')),
  token uuid not null unique default gen_random_uuid(),
  invitato_da uuid not null references auth.users(id) on delete cascade,
  messaggio text,
  scadenza timestamptz not null default (now() + interval '7 days'),
  accettato_il timestamptz,
  created_at timestamptz not null default now()
);
create index on public.pollaio_inviti(email) where accettato_il is null;
create index on public.pollaio_inviti(pollaio_id);
create unique index on public.pollaio_inviti(pollaio_id, email)
  where accettato_il is null;  -- un solo invito attivo per (pollaio, email)

alter table public.pollaio_inviti enable row level security;

-- Admin del pollaio: full CRUD
create policy "inviti_admin_all" on public.pollaio_inviti for all
  using (public.my_pollaio_role(pollaio_id) = 'admin')
  with check (public.my_pollaio_role(pollaio_id) = 'admin');

-- L'invitato (per email) può vedere il suo invito
create policy "inviti_destinatario_select" on public.pollaio_inviti for select
  using (
    email = (select email from auth.users where id = auth.uid())
    and accettato_il is null
  );
```

### 4.2 RPC accept_invito

```sql
create or replace function public.accept_invito(p_token uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invito record;
  v_user_email text;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    return json_build_object('ok', false, 'errore', 'Non autenticato');
  end if;

  select email into v_user_email from auth.users where id = v_user_id;

  select * into v_invito
  from public.pollaio_inviti
  where token = p_token
    and accettato_il is null
    and scadenza > now()
  for update;

  if v_invito.id is null then
    return json_build_object('ok', false, 'errore', 'Invito non valido o scaduto');
  end if;

  if lower(v_invito.email) <> lower(v_user_email) then
    return json_build_object('ok', false, 'errore', 'Questo invito è per un altro indirizzo email');
  end if;

  -- Inserisce membership (idempotente se già membro)
  insert into public.pollaio_members (pollaio_id, user_id, ruolo)
  values (v_invito.pollaio_id, v_user_id, v_invito.ruolo)
  on conflict (pollaio_id, user_id) do update
    set ruolo = case
      when public.pollaio_members.ruolo = 'admin' then 'admin'  -- non degradare admin a guest
      else excluded.ruolo
    end;

  -- Marca invito come accettato
  update public.pollaio_inviti set accettato_il = now() where id = v_invito.id;

  -- Se profilo non ha pollaio attivo, settalo
  update public.profiles
    set pollaio_attivo_id = v_invito.pollaio_id
    where id = v_user_id and pollaio_attivo_id is null;

  return json_build_object('ok', true, 'pollaio_id', v_invito.pollaio_id);
end;
$$;
grant execute on function public.accept_invito(uuid) to authenticated;
```

### 4.3 Server actions inviti

Nuovo file: `lib/actions/inviti.ts`

```typescript
'use server';

export async function creaInviti(input: {
  pollaioId: string;
  emails: string[];        // 1..N email
  ruolo: 'admin' | 'guest';
  messaggio?: string;
}): Promise<{ ok: true; inviati: string[]; falliti: { email: string; motivo: string }[] }
       | { ok: false; errore: string }>;

export async function revocaInvito(invitoId: string): Promise<ActionResult>;

// Accetta invito loggato (chiama RPC)
export async function accettaInvito(token: string): Promise<{
  ok: boolean; errore?: string; pollaioId?: string;
}>;
```

`creaInviti` per ogni email:
1. Verifica admin del pollaio (RLS).
2. Verifica che l'email non sia già membro: se sì → fallito con motivo "già membro".
3. Insert in `pollaio_inviti` (UNIQUE index gestisce duplicati).
4. Invoca edge function `send-email` con template "invito".

### 4.4 Edge function send-email: template invito

Modifica `supabase/functions/send-email/index.ts` — aggiungere un caso `template === 'invito'`:

```typescript
if (body.template === 'invito') {
  const { invitanteNome, pollaioNome, ruolo, link, messaggio } = body.data;
  const ruoloLabel = ruolo === 'admin' ? 'collaborare' : 'guardare cosa succede';

  subject = `${invitanteNome} ti ha invitato a ${ruoloLabel} nel pollaio "${pollaioNome}"`;
  html = `
    <div style="font-family: 'Nunito', sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #E8678A;">🐔 Ciao!</h2>
      <p><b>${invitanteNome}</b> ti invita ${ruolo === 'admin' ? 'a collaborare' : 'a guardare'} nel pollaio <b>${pollaioNome}</b>.</p>
      ${messaggio ? `<blockquote style="color: #2E2924; border-left: 3px solid #E8678A; padding-left: 12px;">${escapeHtml(messaggio)}</blockquote>` : ''}
      <p style="margin: 24px 0;">
        <a href="${link}" style="background: #E8678A; color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: bold;">Accetta invito</a>
      </p>
      <p style="font-size: 12px; color: #9E968C;">Link valido 7 giorni. Se non conosci ${invitanteNome}, ignora pure questa email.</p>
    </div>
  `;
}
```

### 4.5 Pagina /invito/[token]

Nuovo file: `app/invito/[token]/page.tsx`

Logica:

```
1. Server: leggi invito da DB (anonimo, via select pubblico controllato).
   Per leggerlo senza essere loggati, serve un endpoint server-side
   con service role oppure una view pubblica con dati minimali (solo
   email destinatario, nome pollaio, nome invitante, ruolo, scadenza).
   → soluzione: server action `getInvitoPublic(token)` che usa supabase
     admin (service_role) per leggere SOLO i campi pubblici.
2. Se invito scaduto/inesistente → mostra messaggio amichevole.
3. Se utente non loggato:
   - Mostra "Registrati per accettare l'invito di X al pollaio Y"
   - Form signup con email pre-compilata e disabilitata
   - Dopo signup → eseguire accept_invito RPC e redirect a /
4. Se utente loggato:
   - Se email loggata = email invito: chiede conferma e accetta
   - Se email loggata ≠ email invito: messaggio "questo invito è per
     un altro account, esci e riprova"
```

### 4.6 UI sezione "Membri & Inviti"

Nuovo file: `app/(app)/impostazioni/membri/page.tsx`

```
Header ─ "Membri & Inviti"
│
├─ Sezione "Membri attivi"
│  ├─ Roberto (tu)     admin    [⋮]
│  ├─ Enza             guest    [⋮ Promuovi / Rimuovi]
│  └─ ...
│
├─ Sezione "Inviti in sospeso"
│  ├─ mamma@ex.com     guest    Scade tra 5 gg    [Revoca]
│  └─ ...
│
└─ Pulsante "+ Invita persone"
   → BottomSheet con campi:
     - Email (multipla, separate da virgola/spazio/invio)
     - Ruolo (radio: Collaboratore / Visualizzatore)
     - Messaggio (opzionale)
     - Pulsante "Invia inviti"
```

Visibile **solo** ad admin. Per i guest, in `/impostazioni` la voce "Membri & Inviti" non appare.

---

## 5. Richieste uova + merge contatto

### 5.1 Schema DB

Nuova migrazione: `supabase/migrations/0011_richieste_uova.sql`

```sql
create table public.richieste_uova (
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
create index on public.richieste_uova(pollaio_id, stato, created_at);

alter table public.richieste_uova enable row level security;

-- SELECT: tutti i membri vedono le richieste del loro pollaio (FIFO list)
create policy "richieste_select_members" on public.richieste_uova for select
  using (public.is_my_pollaio(pollaio_id));

-- INSERT: ogni membro può creare una richiesta (anche guest)
create policy "richieste_insert_members" on public.richieste_uova for insert
  with check (
    public.is_my_pollaio(pollaio_id)
    and richiedente_user_id = auth.uid()
  );

-- UPDATE: solo admin (cambio stato)
create policy "richieste_update_admin" on public.richieste_uova for update
  using (public.my_pollaio_role(pollaio_id) = 'admin');

-- DELETE: admin oppure il richiedente stesso (per annullare prima dell'evasione)
create policy "richieste_delete" on public.richieste_uova for delete
  using (
    public.my_pollaio_role(pollaio_id) = 'admin'
    or (richiedente_user_id = auth.uid() and stato = 'in_attesa')
  );
```

### 5.2 Merge guest↔contatto: schema

Nuova migrazione: `supabase/migrations/0012_contatti_utente.sql`

```sql
alter table public.contatti
  add column utente_id uuid references auth.users(id) on delete set null;

-- Un contatto può essere linkato a un solo utente per pollaio
create unique index on public.contatti(pollaio_id, utente_id)
  where utente_id is not null;
```

### 5.3 RPC accetta richiesta uova (atomica con lock scorte)

```sql
create or replace function public.accetta_richiesta_uova(p_richiesta uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_richiesta record;
  v_user_id uuid := auth.uid();
  v_disponibili int;
  v_contatto_id uuid;
  v_regalo_id uuid;
  v_richiedente_nome text;
begin
  -- Verifica esistenza richiesta + admin role + lock
  select r.*, p.id as p_id into v_richiesta
  from public.richieste_uova r
  join public.pollai p on p.id = r.pollaio_id
  where r.id = p_richiesta and r.stato = 'in_attesa'
  for update;

  if v_richiesta.id is null then
    return json_build_object('ok', false, 'errore', 'Richiesta non trovata o già evasa');
  end if;

  if public.my_pollaio_role(v_richiesta.pollaio_id) <> 'admin' then
    return json_build_object('ok', false, 'errore', 'Solo gli admin possono accettare richieste');
  end if;

  -- Conta uova disponibili con lock
  select count(*) into v_disponibili
  from public.uova
  where pollaio_id = v_richiesta.pollaio_id
    and stato = 'disponibile'
  for update;

  if v_disponibili < v_richiesta.quantita then
    return json_build_object(
      'ok', false,
      'errore', format('Scorte insufficienti: hai %s uova ma ne servono %s', v_disponibili, v_richiesta.quantita)
    );
  end if;

  -- Trova/crea contatto per il richiedente
  select id into v_contatto_id
  from public.contatti
  where pollaio_id = v_richiesta.pollaio_id and utente_id = v_richiesta.richiedente_user_id
  limit 1;

  if v_contatto_id is null then
    -- Crea contatto auto dal display_name dell'utente
    select display_name into v_richiedente_nome from public.profiles where id = v_richiesta.richiedente_user_id;
    insert into public.contatti (pollaio_id, nome, relazione, utente_id)
    values (v_richiesta.pollaio_id, coalesce(v_richiedente_nome, 'Membro guest'), 'Membro del pollaio', v_richiesta.richiedente_user_id)
    returning id into v_contatto_id;
  end if;

  -- Crea record regalo
  insert into public.regali (pollaio_id, contatto_id, quantita, note)
  values (v_richiesta.pollaio_id, v_contatto_id, v_richiesta.quantita, 'Da richiesta uova')
  returning id into v_regalo_id;

  -- Marca le prime N uova disponibili come regalate
  update public.uova
  set stato = 'regalato', regalo_id = v_regalo_id
  where id in (
    select id from public.uova
    where pollaio_id = v_richiesta.pollaio_id and stato = 'disponibile'
    order by data_deposizione asc
    limit v_richiesta.quantita
  );

  -- Marca richiesta come accettata
  update public.richieste_uova
  set stato = 'accettata', evasa_da = v_user_id, evasa_il = now(), regalo_id = v_regalo_id
  where id = p_richiesta;

  return json_build_object('ok', true, 'regalo_id', v_regalo_id);
end;
$$;
grant execute on function public.accetta_richiesta_uova(uuid) to authenticated;
```

### 5.4 RPC rifiuta richiesta uova

```sql
create or replace function public.rifiuta_richiesta_uova(p_richiesta uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pollaio_id uuid;
begin
  select pollaio_id into v_pollaio_id from public.richieste_uova where id = p_richiesta and stato = 'in_attesa';
  if v_pollaio_id is null then
    return json_build_object('ok', false, 'errore', 'Richiesta non trovata o già evasa');
  end if;
  if public.my_pollaio_role(v_pollaio_id) <> 'admin' then
    return json_build_object('ok', false, 'errore', 'Solo gli admin possono rifiutare richieste');
  end if;

  update public.richieste_uova
  set stato = 'rifiutata', evasa_da = auth.uid(), evasa_il = now()
  where id = p_richiesta;

  return json_build_object('ok', true);
end;
$$;
grant execute on function public.rifiuta_richiesta_uova(uuid) to authenticated;
```

### 5.5 RPC merge contatto con utente

```sql
create or replace function public.merge_contatto_con_utente(
  p_contatto uuid,
  p_utente uuid,
  p_rinomina text default null  -- se null, mantiene nome contatto attuale
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
  -- Verifica contatto esistente + admin
  select pollaio_id into v_pollaio_id from public.contatti where id = p_contatto;
  if v_pollaio_id is null then
    return json_build_object('ok', false, 'errore', 'Contatto non trovato');
  end if;
  if public.my_pollaio_role(v_pollaio_id) <> 'admin' then
    return json_build_object('ok', false, 'errore', 'Solo gli admin possono linkare contatti');
  end if;

  -- Verifica che l'utente target sia membro del pollaio
  if not exists (
    select 1 from public.pollaio_members
    where pollaio_id = v_pollaio_id and user_id = p_utente
  ) then
    return json_build_object('ok', false, 'errore', 'L\'utente non è membro del pollaio');
  end if;

  -- Se esiste già un altro contatto linkato all'utente, mergialo nel target
  select id into v_other_contatto_id
  from public.contatti
  where pollaio_id = v_pollaio_id and utente_id = p_utente and id <> p_contatto
  limit 1;

  if v_other_contatto_id is not null then
    -- Trasferisci regali dall'altro contatto a p_contatto
    update public.regali set contatto_id = p_contatto where contatto_id = v_other_contatto_id;
    -- Elimina contatto orfano
    delete from public.contatti where id = v_other_contatto_id;
  end if;

  -- Linka e (opz.) rinomina
  update public.contatti
  set utente_id = p_utente,
      nome = coalesce(p_rinomina, nome),
      updated_at = now()
  where id = p_contatto;

  return json_build_object('ok', true);
end;
$$;
grant execute on function public.merge_contatto_con_utente(uuid, uuid, text) to authenticated;
```

### 5.6 Server actions

Nuovo file: `lib/actions/richieste.ts`

```typescript
'use server';

export async function creaRichiestaUova(input: {
  quantita: number;     // > 0
  nota?: string;
}): Promise<ActionResult>;
// Lato server: insert + chiamata immediata a edge function send-push
// con notifica "🙏 [Nome guest] ha chiesto N uova" a TUTTI gli admin del pollaio.
// Inserisce anche in notifiche_inviate (per /notifiche).

export async function accettaRichiestaUova(richiestaId: string): Promise<ActionResult>;
// Chiama RPC accetta_richiesta_uova. Se ok: revalidate /uova e /

export async function rifiutaRichiestaUova(richiestaId: string): Promise<ActionResult>;
// Chiama RPC rifiuta_richiesta_uova

export async function annullaMiaRichiesta(richiestaId: string): Promise<ActionResult>;
// Per il richiedente, elimina la sua richiesta se ancora in_attesa
```

Nuovo file: `lib/actions/contatti.ts` (estensione)

```typescript
export async function linkContattoUtente(input: {
  contattoId: string;
  utenteId: string;
  rinomina?: string;
}): Promise<ActionResult>;
// Chiama RPC merge_contatto_con_utente
```

### 5.7 Vincoli sul regalo spontaneo dell'admin

Modifica `app/(app)/uova/actions.ts:regalaUova()` (azione esistente, va trovata):

Prima di inserire il regalo e marcare uova come regalate, contare le disponibili:

```typescript
const { count: disponibili } = await supabase
  .from('uova')
  .select('*', { count: 'exact', head: true })
  .eq('pollaio_id', pollaio.id)
  .eq('stato', 'disponibile');

if ((disponibili ?? 0) < quantita) {
  return { ok: false, errore: `Scorte insufficienti: hai ${disponibili} uova ma ne stai regalando ${quantita}` };
}
```

Idealmente questa logica va spostata in una RPC `regala_uova_a_contatto(p_contatto, p_quantita, p_nota, p_data)` per evitare race condition (analoga a `accetta_richiesta_uova`).

### 5.8 UI richieste uova

Modifica `app/(app)/uova/page.tsx`:

```
Header ─ "Uova"
│
├─ Card statistiche (esistente)
│
├─ Sezione "Richieste in attesa"   ← NUOVA
│  ├─ 🙏 Enza chiede 6 uova         "per la torta"      [✓ Accetta] [✗ Rifiuta]   ← solo admin
│  ├─ 🙏 Mario chiede 4 uova        ""                  in attesa                 ← guest vedono read-only
│  └─ ...
│
├─ Sezione "Inventario uova" (esistente)
│
└─ FAB azioni:
   - Per admin: "Aggiungi raccolta" + "Regala uova"
   - Per guest: "🙏 Vorrei delle uova" → BottomSheet con quantità + nota
```

Nuovo componente: `components/uova/RichiediBottomSheet.tsx`

```typescript
interface Props { onClose: () => void; }
// Form con:
// - Quantità (input number, default 1, min 1, max ragionevole es. 50)
// - Nota (textarea opzionale, max 200 char)
// - Pulsante "Invia richiesta"
// Mostra info: "Disponibili adesso: N uova" (non blocco, solo info)
```

Per gli admin il bottone "Regala uova" apre il modal esistente di regalo (immutato a parte la nuova validazione scorte).

### 5.9 Notifica push admin per nuova richiesta

Nel server action `creaRichiestaUova`:

```typescript
// Trova admin del pollaio
const { data: admins } = await supabase
  .from('pollaio_members')
  .select('user_id')
  .eq('pollaio_id', pollaio.id)
  .eq('ruolo', 'admin');

// Dispatch push a ognuno tramite edge function send-push
for (const a of admins ?? []) {
  await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: a.user_id,
      title: '🙏 Nuova richiesta uova',
      body: `${user.display_name ?? 'Un membro'} ha chiesto ${quantita} uova`,
      url: '/uova',
    }),
  });

  // Log in notifiche_inviate per la pagina /notifiche
  await supabase.from('notifiche_inviate').insert({
    user_id: a.user_id,
    categoria: 'richiesta_uova',
    riferimento_id: nuovaRichiestaId,
    inviata_il: new Date().toISOString(),
  });
}
```

Aggiungere `'richiesta_uova'` alle categorie in `lib/constants/notifiche.ts` (icona 🙏, label "Richieste uova").

### 5.10 UI merge contatto

In `app/(app)/impostazioni/membri/page.tsx`, per ogni membro guest (admin-only view):

```
─ Enza        guest    [⋮ Promuovi / Rimuovi / Collega contatto]
```

Il menu "Collega contatto" apre BottomSheet:

```
┌─────────────────────────────────────┐
│ Collega Enza a un contatto          │
├─────────────────────────────────────┤
│ Seleziona un contatto della rubrica │
│ che corrisponde a Enza:             │
│                                     │
│ ○ Mamma  (Mamma)                    │
│ ○ Lucia  (Vicina)                   │
│ ○ ...                               │
│                                     │
│ ☐ Rinomina il contatto in "Enza"    │
│                                     │
│   [Annulla]      [Collega]          │
└─────────────────────────────────────┘
```

Mostra solo i contatti del pollaio con `utente_id IS NULL`.

---

## 6. Migration plan

Ordine di applicazione (idempotente, da rieseguibile):

| File | Contenuto |
|------|-----------|
| `0007_manutenzione_dinamica.sql` | Tabella `manutenzioni_voci`, ALTER `manutenzioni.voce_id`, ALTER `manutenzioni.tipo` nullable, backfill voci + linka log |
| `0008_multi_tenancy.sql` | Tabella `pollaio_members`, ALTER `profiles.pollaio_attivo_id`, backfill, rewrite `is_my_pollaio()`, nuovo `my_pollaio_role()`, RLS su `pollaio_members` |
| `0009_rls_admin_role.sql` | Drop/recreate policy di TUTTE le tabelle "dati operativi" per aggiungere il check `my_pollaio_role() = 'admin'` su INSERT/UPDATE/DELETE |
| `0010_inviti.sql` | Tabella `pollaio_inviti`, RLS, RPC `accept_invito(uuid)` |
| `0011_richieste_uova.sql` | Tabella `richieste_uova`, RLS, RPC `accetta_richiesta_uova(uuid)`, `rifiuta_richiesta_uova(uuid)` |
| `0012_contatti_utente.sql` | ALTER `contatti.utente_id`, RPC `merge_contatto_con_utente(uuid, uuid, text)` |

Tutte applicate via MCP Supabase con `apply_migration` (idempotenti, con `create ... if not exists`, `drop policy if exists`, ecc.).

---

## 7. Roadmap di implementazione (fasi)

Suggerimento per spezzare in fasi che producono software testabile a ogni step. Ogni fase = una serie di commit con `npm run typecheck` + `npm run build` verdi alla fine.

### Fase A — Multi-tenancy core (la base per il resto)
1. Migration `0008_multi_tenancy.sql` + `0009_rls_admin_role.sql` (applicate via MCP).
2. Aggiornare `lib/supabase/queries.ts:requirePollaio()` per il nuovo modello (con `ruolo` e `pollai[]`).
3. Aggiornare tutti i componenti che destrutturano da `requirePollaio()` (verifica via grep: `requirePollaio()`).
4. Componente `PermissionGate` + hide pulsanti admin nelle pagine principali.
5. Switcher pollaio in `Header` (bottom sheet).
6. Server action `switchPollaio`, `creaPollaio`, `abbandonaPollaio`.
7. Pagina `/impostazioni/membri` (lista membri, ancora senza inviti).
8. Test end-to-end: utente esistente → vede il suo pollaio normalmente. Crea un secondo pollaio via "Crea nuovo" e switcha tra i due.

### Fase B — Inviti (riempie la pagina membri)
1. Migration `0010_inviti.sql`.
2. Estendere edge function `send-email` con template `'invito'`.
3. Server actions `creaInviti`, `revocaInvito`, `accettaInvito`.
4. Bottom sheet "Invita persone" in `/impostazioni/membri`.
5. Pagina `/invito/[token]` (signup/login flow).
6. Skip-onboarding logic in `/onboarding` (redirect a `/invito/[token]` se invito pending).
7. Test: admin invita guest → guest riceve email → si registra → entra nel pollaio.

### Fase C — Manutenzione dinamica
1. Migration `0007_manutenzione_dinamica.sql` (con backfill voci).
2. Refactor `lib/constants/manutenzione.ts` → catalogo consigli.
3. Server actions `voci-actions.ts` (CRUD voci).
4. Refactor `app/(app)/manutenzione/page.tsx` e `ManutenzioneClient.tsx`.
5. Update home avvisi (usa voci dinamiche).
6. Update `cron-notifications` edge function (loop su voci dinamiche, multi-admin).
7. Test: nuovo utente → 0 alert home. Crea voce da consiglio → alert appare quando scaduta.

### Fase D — Clock-in/out
1. Aggiungere `getAlbaTramonto()` a `lib/utils/meteo.ts`.
2. Server actions `lib/actions/uscite.ts`.
3. Card home con stato + pulsante contestuale + suggerimento orario.
4. Pagina `/uscite` con storico + grafico Recharts.
5. Test: home → "Apro ora" registra hh:mm corrente. Vedi storico settimana corrente.

### Fase E — Richieste uova + merge contatti
1. Migration `0011_richieste_uova.sql` + `0012_contatti_utente.sql`.
2. Server actions `lib/actions/richieste.ts` + dispatch push agli admin.
3. Aggiornare `regalaUova` esistente con check scorte (o spostare in RPC).
4. Sezione richieste in `app/(app)/uova/page.tsx`.
5. Bottom sheet "Vorrei delle uova".
6. UI link contatto in `/impostazioni/membri`.
7. Aggiungere `'richiesta_uova'` alle categorie notifiche.
8. Test end-to-end: guest crea richiesta → admin riceve push → accetta → uova diventano regalate → contatto Mamma viene mergiato in Enza.

---

## 8. Edge cases da gestire

| # | Caso | Comportamento atteso |
|---|------|---------------------|
| 1 | Ultimo admin lascia il pollaio | RPC `abbandona_pollaio` blocca: "Sei l'unico admin, promuovi qualcuno o elimina il pollaio". |
| 2 | Admin si rimuove da solo (DELETE membership) | RLS lo permette, ma RPC custom controlla l'invariante "≥1 admin per pollaio". |
| 3 | Invito a email già membro | `creaInviti` ritorna in `falliti` con motivo "Già membro". |
| 4 | Invito scaduto | Pagina `/invito/[token]` mostra "Invito scaduto, chiedi un nuovo invito". |
| 5 | Invito accettato con email diversa | RPC blocca con "Questo invito è per un altro indirizzo". |
| 6 | Stesso utente invitato 2 volte allo stesso pollaio | UNIQUE index `(pollaio_id, email) where accettato_il is null` impedisce duplicati. Si può estendere l'invito esistente. |
| 7 | Race su accettazione richiesta uova | RPC con `FOR UPDATE` su scorte garantisce atomicità. Secondo admin vede "richiesta già evasa". |
| 8 | Guest chiede più uova di quante disponibili | OK, richiesta creata con stato `in_attesa`. Solo l'accettazione blocca. |
| 9 | Admin regala più uova di quante disponibili | Server action blocca con messaggio amichevole. |
| 10 | Eliminazione pollaio | CASCADE su members, inviti, richieste, manutenzioni_voci, regali, ecc. Già garantito da FK on delete cascade. |
| 11 | Pollaio attivo non più accessibile (admin l'ha rimosso) | `requirePollaio()` fallback: prende il primo membership disponibile, aggiorna `profiles.pollaio_attivo_id`. |
| 12 | Merge: contatto già linkato a un utente | RPC trasferisce regali da contatto orfano a target, elimina orfano (sez. 5.5). |
| 13 | Onboarding senza inviti pending → 0 pollai | Redirect a `/onboarding` (flusso esistente). |
| 14 | Voce manutenzione "eliminata" mentre ci sono log | **Solo soft delete**: il menu ⋮ ha "Disattiva" che setta `attivo=false`. La voce sparisce da liste e avvisi ma lo storico log resta consultabile (es. in una sotto-pagina "Voci disattivate"). Per cancellare definitivamente si usa direttamente il DB. |
| 15 | Push notifica richiesta uova: admin senza subscription push | Skip silenzioso, comunque inserito in `notifiche_inviate` per visualizzazione in `/notifiche`. |

---

## 9. File da creare / modificare (riepilogo)

### Nuovi file

```
supabase/migrations/0007_manutenzione_dinamica.sql
supabase/migrations/0008_multi_tenancy.sql
supabase/migrations/0009_rls_admin_role.sql
supabase/migrations/0010_inviti.sql
supabase/migrations/0011_richieste_uova.sql
supabase/migrations/0012_contatti_utente.sql

app/(app)/manutenzione/voci-actions.ts
app/(app)/uscite/page.tsx
app/(app)/uscite/UsciteClient.tsx
app/(app)/uscite/actions.ts
app/(app)/impostazioni/membri/page.tsx
app/(app)/impostazioni/membri/MembriClient.tsx
app/invito/[token]/page.tsx
app/inviti-pending/page.tsx                  # opzionale, lista inviti se utente loggato

lib/actions/pollaio.ts
lib/actions/inviti.ts
lib/actions/richieste.ts
lib/actions/uscite.ts                        # alias o re-export di app/(app)/uscite/actions.ts

components/auth/PermissionGate.tsx
components/layout/PollaioSwitcher.tsx        # bottom sheet
components/uova/RichiediBottomSheet.tsx
components/uova/RichiestaCard.tsx
components/membri/MembroCard.tsx
components/membri/InvitaBottomSheet.tsx
components/membri/LinkContattoBottomSheet.tsx
components/home/AperturaChiusuraCard.tsx
components/manutenzione/VoceForm.tsx          # form crea/modifica voce (anche da consiglio)
components/manutenzione/ConsigliBadges.tsx
```

### File modificati

```
lib/supabase/queries.ts                       # requirePollaio aggiornato
lib/utils/manutenzione.ts                     # calcolaStatiManutenzioneFromVoci
lib/utils/meteo.ts                            # getAlbaTramonto
lib/constants/manutenzione.ts                 # ora "consigli" non più "tipi"
lib/constants/notifiche.ts                    # +categoria 'richiesta_uova'

components/ui/Header.tsx                      # subtitle cliccabile + Switcher

app/(app)/page.tsx                            # card clock-in/out + ricalcolo avvisi dinamici
app/(app)/manutenzione/page.tsx               # rewrite con voci dinamiche
app/(app)/manutenzione/ManutenzioneClient.tsx # rewrite
app/(app)/manutenzione/actions.ts             # rimosso aggiornaFrequenza/ripristina; registraIntervento usa voce_id
app/(app)/uova/page.tsx                       # sezione richieste
app/(app)/uova/actions.ts                     # validation scorte su regalo
app/(app)/impostazioni/page.tsx               # voce "Membri & Inviti" (solo admin)
app/onboarding/page.tsx                       # skip se invito pending

supabase/functions/send-email/index.ts        # template 'invito'
supabase/functions/cron-notifications/index.ts# loop su voci, multi-admin

lib/actions/contatti.ts                       # linkContattoUtente (o estensione di file esistente)
```

---

## 10. Verifica end-to-end

Per ciascuna feature, scenario di test manuale:

### Multi-tenancy
```
1. Login con utente A. /impostazioni → "Membri" (solo lui, admin).
2. Crea secondo pollaio dall'switcher. Verifica che si possa switchare.
3. Verifica RLS: /uova mostra solo le uova del pollaio attivo.
```

### Inviti
```
1. Admin A → /impostazioni/membri → "+ Invita" → email di un utente B (test, controlla
   inbox o Resend logs).
2. Apri link da email su browser anonimo.
3. Registra utente B con stessa email.
4. Verifica redirect a / con pollaio attivo = pollaio di A, ruolo guest.
5. Verifica che B veda pollaio (read-only) ma non possa creare uova/galline.
```

### Manutenzione
```
1. Nuovo utente (post-onboarding): /manutenzione → 0 voci attive, 6 badge consiglio.
2. Tap su "Pulizia casetta" → bottom sheet form pre-compilato → salva.
3. Voce appare in "Le mie manutenzioni" e in home come scaduta (mai fatta).
4. Tap "✓ Fatto oggi" → home alert sparisce.
5. Crea voce custom "Spazza il pollaio" con frequenza 3 gg.
6. Verifica scaduta dopo 3 gg + 1 (manipolando data per test, o aspettando).
```

### Clock-in/out
```
1. Home: card mostra "🌅 Apro ora" + suggerimento "Alba alle HH:MM".
2. Tap "Apro ora": stato cambia a "Aperto alle now()" + pulsante diventa "🌙 Chiudo ora".
3. Tap "Chiudo ora": stato "Aperto X, chiuso Y" + link "Storico".
4. /uscite: vede ultima riga + grafico vuoto (servono almeno 7 giornate per essere significativo).
5. Modifica orario manuale → si aggiorna nella tabella.
6. Guest dello stesso pollaio: vede storico ma pulsanti disabilitati.
```

### Richieste uova
```
1. Utente B (guest) su /uova: bottone "🙏 Vorrei delle uova".
2. Bottom sheet con quantità=4 → invia.
3. Utente A (admin) riceve push "🙏 B ha chiesto 4 uova".
4. /uova di A mostra richiesta in lista.
5. Scenario 1: scorte ≥ 4 → "Accetta" → 4 uova diventano "regalato", scorte calano,
   richiesta = "accettata", riga di regalo creata, /uova di B aggiornata.
6. Scenario 2: scorte < 4 → "Accetta" → errore amichevole "Scorte insufficienti".
7. Scenario 3: "Rifiuta" → richiesta = "rifiutata", scorte invariate.
```

### Merge contatto
```
1. Prima dell'invito, admin ha contatto "Mamma" con 3 regali storici.
2. Invita "enza@email.com" come guest. Enza accetta.
3. /impostazioni/membri → ⋮ accanto a Enza → "Collega contatto".
4. Seleziona "Mamma" + check "Rinomina in Enza" → conferma.
5. /uova → contatti dei regali: lo storico mostra "Enza" (era Mamma).
6. Rubrica /contatti: solo "Enza", non più "Mamma".
7. Successive accettazioni di richieste uova di Enza → linkano allo stesso contatto.
```

---

## 11. Domande aperte (chiuse)

1. **Eliminazione voce manutenzione con storico**: ✅ **Solo soft delete** (`attivo=false`). Per cancellare hard si va via DB.
2. **Header switcher**: ✅ Bottom sheet (coerente con il design del resto).
3. **Notifiche manutenzione per guest**: ✅ **NO**: solo agli admin del pollaio.
4. **Limite invitati**: ✅ Nessun limite.
5. **Email guest registrato con email diversa**: ✅ Pagina invito mostra "Questo invito è per X, esci e registra il nuovo account con questa email" + pulsante "Esci".
6. **Animazione UI dopo accettazione invito**: ✅ Pagina di welcome `/benvenuto?pollaio=ID` con animazione breve (~2s) "🎉 Benvenuta/o nel pollaio X" → redirect a `/`. Mostrata anche dopo `creaPollaio()` di un secondo pollaio per coerenza.
7. **Stato `regali` quando richiesta rifiutata**: ✅ Nessun regalo creato, scorte invariate.
8. **Storico clock-in/out cancellabile**: ✅ Solo admin può eliminare/modificare. Guest read-only.

---

## 12. Note di sicurezza

- **Inviti**: il link è un UUID random (entropia 122 bit). Difficile da brute-forzare. Scadenza 7 gg + UNIQUE index limitano l'esposizione. La validazione email = email destinatario aggiunge un layer (mitiga link forwarding malevolo).
- **Tutte le scritture critiche** (accept_invito, accetta_richiesta_uova, merge_contatto_con_utente) sono in RPC SECURITY DEFINER con `search_path = public` esplicito e check espliciti su `auth.uid()` + `my_pollaio_role()`. Non si può bypassare via SQL diretto.
- **RPC concorrenti**: tutte usano `FOR UPDATE` sui record critici per evitare race condition.
- **`is_my_pollaio()` e `my_pollaio_role()`** sono `SECURITY DEFINER` + `STABLE`: il pianificatore può cacharne il risultato in una stessa query, ma rivalutarne il valore tra query diverse.
- **Edge function `send-email` con template `invito`**: validare che il chiamante sia admin del pollaio (chiamata fatta da server action interna, già autenticata) — non esporre un endpoint pubblico.

---

> Fine documento. Prossimo step proposto: discutere insieme le 8 domande aperte (sez. 11), poi partire con la **Fase A** (multi-tenancy core), che è il prerequisito di tutto il resto.
