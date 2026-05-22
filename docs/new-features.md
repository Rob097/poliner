# Piano nuove features — Batch 2

> **Per agenti esecutori:** quando implementi una fase, ricordati di:
> - Convertire le date relative in date assolute al momento dell'implementazione.
> - Mantenere lo stile italiano caldo/informale già usato in app (copy, errori).
> - Preservare RLS e ruoli admin/guest. I server actions usano `requirePollaio()`.
> - Frequenti commit per fase. Una fase alla volta, attendere conferma utente prima di passare alla successiva.

---

## Contesto

L'app Poliner è in produzione e in uso reale. Dopo il primo batch (multi-tenancy, inviti, manutenzione dinamica, clock-in/out, richieste uova + merge contatto) emergono **5 nuove esigenze** raggruppate qui per priorità decrescente:

| # | Feature | Priorità | Cosa risolve |
|---|---------|----------|--------------|
| 1 | **Defunta** | ALTA | Manca un modo per segnare una gallina come defunta. Oggi si può solo "archiviare" (concetto diverso: regalata/venduta). |
| 2 | **Loader / performance navigazione** | ALTA | La navigazione tra pagine è percepita lenta. Servono prefetch più aggressivo, skeleton specifici per route, e un overlay con animazione gallina come fallback. |
| 3 | **Home Hospital** | MEDIA | Quando una gallina viene portata in casa (giorno o più) per cure, oggi non c'è modo di tracciarlo. Soluzione: estendere "Registra problema" con dati Home Hospital + vista dedicata. |
| 4 | **Pollaio pubblico** | MEDIA | L'admin vuole poter condividere una pagina vetrina del pollaio (galline, razze, uova, stats) via link, senza richiedere login. |
| 5 | **Inserimento nuove galline** | BASSA | Inserire nuovi animali in un pollaio già avviato è un processo che richiede settimane (quarantena, inserimento visivo, convivenza notturna). L'utente vuole una sezione informativa + tracking flessibile, non rigida. |

**Decisioni chiave già prese (dall'utente):**
- Inserimento: **eventi-based / timeline** (massima flessibilità, niente step obbligatori).
- Pollaio pubblico: **tutto-o-niente** (un solo toggle, niente granularità per ora).
- Defunta: **inclusa nello storico** (esclusa da liste attuali e operazioni correnti, ma visibile in stats cumulative e in una sezione "In memoria").
- Loader: **entrambi gli approcci insieme** — prefetch + overlay con SVG gallina animata.

---

## Architettura generale

- **DB**: aggiunte non-distruttive (nuove colonne `nullable`, nuove tabelle). Soft-state ovunque (niente delete fisiche).
- **RLS**: ogni nuova tabella/colonna eredita la regola di appartenenza pollaio (`is_my_pollaio(pollaio_id)`). Per le rotte pubbliche aggiungiamo policy specifiche con `pubblico_attivo = true`.
- **Routing pubblico**: nuova route group `app/(public)/...` fuori da `(app)` per skippare il layout autenticato.
- **Stili/UI**: riusiamo `BottomSheet`, `Sheet`, `Header`, `ScreenContainer`, `Section` come per le altre feature.
- **Copy**: italiano informale, frasi corte. Per la modale "defunta" frase empatica con il nome.

**Stack già presente** (riusare, non reinventare):
- `lib/supabase/queries.ts` → `requirePollaio()` (auth + ruolo + active pollaio)
- `lib/push/server.ts` → `sendPushToUser` (push notifiche, già in uso per richieste uova)
- `components/ui/*` → `BottomSheet`, `Header`, `ScreenContainer`, `Section`
- `app/(app)/galline/actions.ts` → pattern per server actions su animali

---

# Fase 1 — Defunta (ALTA)

## Obiettivo

Permettere di aggiungere una gallina già defunta (per completare lo storico) o segnare una gallina viva come defunta. Mostrare una modale empatica personalizzata sul nome. Le defunte:
- escono dalle liste correnti (`/galline`, lookup uova, FAB, "richiedi uova", ecc.)
- restano nelle statistiche cumulative del pollaio
- sono visibili in una sezione **"In memoria"** dedicata
- mantengono tutto lo storico (uova passate, eventi salute, foto)

## Schema DB

**Migration: `supabase/migrations/0016_animali_defunte.sql`**

```sql
ALTER TABLE animali
  ADD COLUMN defunta_il date,
  ADD COLUMN causa_decesso text,
  ADD COLUMN note_decesso text;

CREATE INDEX idx_animali_defunta_il ON animali(pollaio_id, defunta_il)
  WHERE defunta_il IS NOT NULL;

COMMENT ON COLUMN animali.defunta_il IS
  'Data del decesso. NULL = viva. Diverso da attivo=false (archiviazione per cessione, regalo, ecc).';
```

**Semantica:**
- `defunta_il IS NULL AND attivo = true` → gallina viva attiva (lista principale)
- `defunta_il IS NOT NULL` → defunta (sezione "In memoria")
- `attivo = false AND defunta_il IS NULL` → archiviata (cessione, ecc — categoria esistente)

## Server actions

**File: `app/(app)/galline/actions.ts`** (estendere)

```ts
export interface SegnaDefuntaInput {
  animaleId: string;
  defuntaIl: string; // YYYY-MM-DD
  causa?: string | null;
  note?: string | null;
}

export async function segnaAnimaleDefunto(input: SegnaDefuntaInput): Promise<ActionResult>;
// UPDATE animali SET defunta_il, causa_decesso, note_decesso, attivo=false WHERE id=...
// revalidatePath('/galline', '/uova', '/statistiche', '/', '/galline/in-memoria')
```

Estendere `CreateAnimaleInput` per accettare anche `defuntaIl/causa/note` opzionali (entry "gallina già defunta").

**Validazioni:**
- Lasciamo passare anche se ha `eventi_salute` in corso (l'utente sa).
- Se ha uova `disponibili`: warning soft ma proceed (le uova restano disponibili).

## UI

### 1. Tasto "Segna come defunta" nel detail gallina

**File: `app/(app)/galline/[id]/ChickenDetail.tsx`**

- Aggiungere nella tab "Profilo", accanto a "Archivia", un bottone secondario rosso scuro: **"💔 Segna come defunta"**.
- Apre `<SegnaDefuntaSheet>` (BottomSheet):
  - Campi: data decesso (default oggi), causa (textarea breve opzionale), note (opzionale)
  - Bottone "Conferma" → chiama `segnaAnimaleDefunto`
  - Dopo successo: aperta automaticamente `<MessaggioEmpaticoModal>`

### 2. Modale empatica

**Nuovo: `components/galline/MessaggioEmpaticoModal.tsx`**

Frase casuale dinamica con nome gallina. Esempi:
- *"Mi dispiace tanto per {nome}. Sarà sempre parte del tuo pollaio. 🤍"*
- *"{nome} ha avuto una bella vita con te. Custodirò il suo ricordo nello storico."*
- *"Un abbraccio. {nome} resterà nei dati e nei ricordi del pollaio."*
- *"Grazie a te {nome} è stata amata. Non andrà persa: il suo storico resta intatto."*

Layout: card centrale con icona 🤍 (o piuma SVG), nome gallina grande, frase, bottone "Chiudi". Nessun altro pulsante (modale puramente emotiva).

### 3. "Aggiungi gallina già defunta"

**File: form di creazione gallina** (`app/(app)/galline/nuovo/page.tsx` o sheet)

- Checkbox a fondo form: **"Questa gallina è già defunta"**
- Se attiva: mostra data decesso, causa (opzionale), note (opzionale)
- Submit → `createAnimale` con campi defunta_* popolati + attivo=false

### 4. Sezione "In memoria"

**Nuovo: `app/(app)/galline/in-memoria/page.tsx`**

- Lista galline con `defunta_il IS NOT NULL` del pollaio, ordinata per `defunta_il DESC`
- Card: foto in seppia/desaturata, nome, razza, data nascita → data decesso, "Vissuta X anni Y mesi"
- Click → ChickenDetail in modalità read-only (flag `isDefunta`)
- Header counter "X galline ricordate"

**Entry point**: link in fondo a `/galline` ("💔 X galline ricordate →"), oppure dentro `/menu`.

### 5. Filtri in liste e operazioni correnti

Escludere `defunta_il IS NOT NULL` da:
- `app/(app)/galline/page.tsx` (lista principale)
- Select gallina in `app/(app)/uova/nuovo/page.tsx`
- Azioni operative in ChickenDetail (trattamento "applica a tutti", muta, registra problema)
- FABMenu "Aggiungi uovo"
- Lookup `animaleMap` in `/uova/page.tsx`: **mantenere** le defunte (uova passate possono riferirle)

### 6. Statistiche

**File: `app/(app)/statistiche/page.tsx`**

- Stats cumulative pollaio: includere uova di defunte (già succede)
- Card "Galline storiche" con counter vive + defunte
- Grafico "deposizione per gallina" mostra anche defunte in colore desaturato

## File coinvolti

- **Creare**: `supabase/migrations/0016_animali_defunte.sql`, `app/(app)/galline/in-memoria/page.tsx`, `components/galline/SegnaDefuntaSheet.tsx`, `components/galline/MessaggioEmpaticoModal.tsx`
- **Modificare**: `app/(app)/galline/actions.ts`, `app/(app)/galline/[id]/ChickenDetail.tsx`, `app/(app)/galline/page.tsx`, `app/(app)/galline/nuovo/page.tsx` (e/o form di creazione esistente), `app/(app)/uova/nuovo/page.tsx`, `app/(app)/statistiche/page.tsx`

## Verifica end-to-end

1. Aggiungi nuova gallina con checkbox "già defunta" → appare in "In memoria", non in `/galline`.
2. Dal detail di una gallina viva: tasto "Segna come defunta" → modale empatica → sparisce da `/galline`.
3. Lo storico uova della defunta resta consultabile (dal detail in-memoria).
4. Le stats cumulative includono le uova della defunta.
5. "Richiedi uova" e azioni admin non offrono la defunta come gallina deponente.
6. RLS: guest può solo vedere (no segna defunta).

---

# Fase 2 — Loader & performance navigazione (ALTA)

## Obiettivo

Rendere la navigazione **quasi istantanea** quando possibile, e mostrare un overlay con gallina animata quando la transition supera ~150ms (così non lampeggia sulle nav rapide).

## Strategia in 3 livelli

### Livello 1: Skeleton specifici per route + prefetch

**Aggiungere `loading.tsx` per ogni route principale.** Oggi esiste solo per `/statistiche`. Da creare:

- `app/(app)/galline/loading.tsx`
- `app/(app)/galline/[id]/loading.tsx`
- `app/(app)/uova/loading.tsx`
- `app/(app)/manutenzione/loading.tsx`
- `app/(app)/note/loading.tsx`
- `app/(app)/scorte/loading.tsx`
- `app/(app)/spese/loading.tsx`
- `app/(app)/rubrica/loading.tsx`
- `app/(app)/uscite/loading.tsx`
- `app/(app)/meteo/loading.tsx`
- `app/(app)/menu/loading.tsx`
- `app/(app)/impostazioni/loading.tsx`
- `app/(app)/impostazioni/membri/loading.tsx`

Ogni skeleton riusa la struttura della pagina (Header + N card pulse). Pattern: `/statistiche/loading.tsx`.

**Prefetch:** in Next 14 prod `<Link>` prefetcha già. Verificare che TabBar e FABMenu usino `<Link>` (non `<a>`) — sono già OK secondo l'esplorazione.

### Livello 2: NavigationOverlay con delegated click + pathname watch

**Nuovo: `components/layout/NavigationOverlay.tsx`** (client provider)

Approccio Next 14 compatibile (no `useLinkStatus`, che è Next 15+):

```tsx
"use client";
export function NavigationOverlayProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a');
      if (!a || !a.href) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === pathname) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
      if (a.hasAttribute('download')) return;
      timerRef.current = setTimeout(() => setVisible(true), 150);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [pathname]);

  // Quando la rotta cambia (nuova pagina renderizzata), nascondi
  useEffect(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    setVisible(false);
  }, [pathname]);

  return (
    <>
      {children}
      <NavigationOverlay visible={visible} />
    </>
  );
}
```

**Wired in:** `app/(app)/layout.tsx` → wrap `<AppShell>` con `<NavigationOverlayProvider>`.

### Livello 3: Overlay grafico

**Componente NavigationOverlay (interno):**
- Container fisso `inset-0 z-[100] backdrop-blur-md bg-white/40 dark:bg-black/30`, fade-in 200ms
- Al centro: SVG gallina stilizzata (forme primitive: corpo ellisse, testa cerchio, becco triangolo, cresta path) coerente con palette app
- Animazione "beccare": testa ruota giù-su con CSS keyframe `peck` (rotate 0 → 25deg → 0, 800ms ease-in-out infinite)
- Sotto: testo random tra: *"Sto beccando…"*, *"Un attimo, mangio…"*, *"Beccata e arrivo…"*

**Tailwind config**: aggiungere keyframes + utility `animate-peck` in `tailwind.config.ts`.

## File coinvolti

- **Creare**: `components/layout/NavigationOverlay.tsx` (provider + view), 13 file `loading.tsx` come da lista sopra
- **Modificare**: `app/(app)/layout.tsx` (wrap provider), `tailwind.config.ts` (keyframe peck)

## Verifica end-to-end

1. Navigare lentamente (DevTools throttle Slow 3G) tra `/uova` → `/galline` → `/statistiche`: overlay appare dopo 150ms con gallina che becca, sparisce appena la nuova pagina è renderizzata.
2. Navigazioni rapide (dati già cached): nessun flash di overlay.
3. Click su `<a target="_blank">` o link esterni: nessun overlay.
4. Skeleton route appare correttamente prima del rendering dei dati.
5. Test reale dell'utente: percezione di reattività migliorata.

---

# Fase 3 — Home Hospital (MEDIA)

## Obiettivo

Quando una gallina viene portata in casa per cure prolungate, l'utente lo registra come parte dell'evento di salute, con date di inizio e (opzionale) fine. Vista dedicata delle galline attualmente "in casa".

## Schema DB

**Migration: `supabase/migrations/0017_eventi_home_hospital.sql`**

```sql
ALTER TABLE eventi_salute
  ADD COLUMN home_hospital boolean DEFAULT false NOT NULL,
  ADD COLUMN hh_da date,
  ADD COLUMN hh_a date;

CREATE INDEX idx_eventi_salute_hh_attivo ON eventi_salute(pollaio_id)
  WHERE home_hospital = true AND hh_a IS NULL;

COMMENT ON COLUMN eventi_salute.home_hospital IS
  'L''animale è stato spostato a casa per cure. hh_da/hh_a delimitano il periodo. hh_a NULL = ancora a casa.';
```

Niente flag separato sull'animale. La query "galline in HH" = `eventi_salute WHERE home_hospital=true AND hh_a IS NULL AND stato='in_corso'`.

## Server actions

**File: `app/(app)/galline/actions.ts`** (estendere `aggiungiEventoSalute`)

Estendere `NuovoEventoSaluteInput`:
```ts
export interface NuovoEventoSaluteInput {
  animaleId: string;
  tipo: TipoProblema;
  descrizione: string;
  // NUOVO
  homeHospital?: boolean;
  hhDa?: string | null;   // YYYY-MM-DD
  hhA?: string | null;
}
```

Aggiungere:
```ts
export async function aggiornaHomeHospital(
  eventoId: string,
  patch: { homeHospital: boolean; hhDa?: string | null; hhA?: string | null }
): Promise<ActionResult>;
```

Modificare `risolviEventoSalute`: se evento ha `home_hospital=true` e `hh_a IS NULL`, setta `hh_a = today` automaticamente.

## UI

### 1. Modale "Registra problema" estesa

**File: `app/(app)/galline/[id]/ChickenDetail.tsx`** — `RegistraProblemaSheet` (linee ~757-827)

Sotto i campi esistenti, aggiungere:
- Checkbox `🏠 Portata a casa (Home Hospital)`
- Se attiva, mostrare:
  - Data inizio (default oggi)
  - Data fine (opzionale, label "lascia vuoto se ancora a casa")

### 2. Badge HH su eventi salute in corso

Nella lista eventi salute dentro ChickenDetail, gli eventi con `home_hospital=true` mostrano badge **🏠 In casa** (dorato) con date. Click sull'evento → sheet "Aggiorna home hospital" per impostare data fine.

### 3. Card dashboard "Galline in casa"

**File: `app/(app)/page.tsx`**

Card riassuntiva (visibile solo se `count > 0`):
- Titolo: "🏠 In casa (Home Hospital)"
- Lista mini (foto + nome + data inizio + N giorni)
- Click → `/galline?filtro=home-hospital`

### 4. Filtro nella lista galline

**File: `app/(app)/galline/page.tsx`**

Chip filtro "🏠 In casa" (visibile se ≥1). Filtra galline con evento HH attivo.

## File coinvolti

- **Creare**: `supabase/migrations/0017_eventi_home_hospital.sql`
- **Modificare**: `app/(app)/galline/actions.ts`, `app/(app)/galline/[id]/ChickenDetail.tsx`, `app/(app)/page.tsx`, `app/(app)/galline/page.tsx`

## Verifica end-to-end

1. "Registra problema" con HH attivo + data inizio → salva. Evento ha badge 🏠.
2. Dashboard mostra card "In casa" con N giorni.
3. Click sul badge HH → sheet imposta data fine. Badge sparisce, card si aggiorna.
4. "Segna risolto" su evento HH senza data fine → data fine auto a oggi.
5. Filtro galline 🏠 funziona.

---

# Fase 4 — Pollaio pubblico (MEDIA)

## Obiettivo

L'admin attiva una pagina pubblica condivisibile via link (`poliner.app/p/<slug>`). Senza login, chiunque vede: nome pollaio, descrizione pubblica, foto, posizione_nome (no lat/lng), galline (foto, nome, razza, dob), uova totali, stats aggregate base.

Approccio: **tutto-o-niente**. Un solo toggle "rendi pubblico". Mostriamo sempre: nome, descrizione, foto, galline (vive), uova totali, stats base, posizione_nome. Niente: membri, contatti, scorte, spese, manutenzione, eventi salute.

## Schema DB

**Migration: `supabase/migrations/0018_pollaio_pubblico.sql`**

```sql
ALTER TABLE pollai
  ADD COLUMN pubblico_attivo boolean DEFAULT false NOT NULL,
  ADD COLUMN pubblico_slug text UNIQUE,
  ADD COLUMN descrizione_pubblica text;

ALTER TABLE pollai
  ADD CONSTRAINT pollai_pubblico_slug_format
  CHECK (pubblico_slug IS NULL OR pubblico_slug ~ '^[a-z0-9-]{3,40}$');

CREATE INDEX idx_pollai_pubblico_slug ON pollai(pubblico_slug)
  WHERE pubblico_attivo = true;

-- RLS aggiuntive (lettura pubblica)
CREATE POLICY pollai_select_public ON pollai
  FOR SELECT TO anon, authenticated
  USING (pubblico_attivo = true);

CREATE POLICY animali_select_public ON animali
  FOR SELECT TO anon, authenticated
  USING (
    pollaio_id IN (SELECT id FROM pollai WHERE pubblico_attivo = true)
    AND defunta_il IS NULL
    AND attivo = true
  );

-- Stats aggregate via RPC (no esposizione tabella uova al pubblico)
CREATE OR REPLACE FUNCTION public_pollaio_stats(p_slug text)
RETURNS TABLE(uova_totali bigint, uova_ultimo_mese bigint, galline_count bigint)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    (SELECT COUNT(*) FROM uova u JOIN pollai p ON u.pollaio_id = p.id
       WHERE p.pubblico_slug = p_slug AND p.pubblico_attivo = true),
    (SELECT COUNT(*) FROM uova u JOIN pollai p ON u.pollaio_id = p.id
       WHERE p.pubblico_slug = p_slug AND p.pubblico_attivo = true
       AND u.data_deposizione >= current_date - 30),
    (SELECT COUNT(*) FROM animali a JOIN pollai p ON a.pollaio_id = p.id
       WHERE p.pubblico_slug = p_slug AND p.pubblico_attivo = true
       AND a.attivo = true AND a.defunta_il IS NULL);
$$;

GRANT EXECUTE ON FUNCTION public_pollaio_stats(text) TO anon, authenticated;
```

**Razze**: già pubblica (catalog). Nessuna policy aggiuntiva.

## Server actions

**File: `app/(app)/impostazioni/actions.ts`** (estendere)

```ts
export async function attivaPaginaPubblica(slug: string): Promise<ActionResult>;
export async function disattivaPaginaPubblica(): Promise<ActionResult>;
export async function aggiornaDescrizionePubblica(testo: string): Promise<ActionResult>;
```

Validare slug: regex + non già in uso. Se occupato → "Slug già usato, prova un altro."

Helper:
```ts
function suggestSlugDalNome(nome: string): string {
  return nome.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}
```

## UI

### 1. Settings "Pagina pubblica"

**File: `app/(app)/impostazioni/page.tsx` (o ImpostazioniClient)** — solo per admin:
- Toggle "Pagina pubblica attiva"
- Se attiva:
  - Input slug con validazione realtime (placeholder = `suggestSlugDalNome(pollaio.nome)`)
  - Link copiabile: `https://poliner.app/p/<slug>` + bottone "Copia"
  - Textarea descrizione pubblica (max 500 char)
  - Bottone "Apri pagina pubblica" (nuovo tab)

### 2. Route pubblica

**Nuovo: `app/(public)/p/[slug]/page.tsx`** (route group `(public)` parallelo a `(app)`)

```tsx
export default async function PaginaPubblicaPollaio({ params }: { params: { slug: string } }) {
  const supabase = createPublicClient(); // anon
  const { data: pollaio } = await supabase
    .from('pollai')
    .select('id, nome, foto_url, posizione_nome, descrizione_pubblica')
    .eq('pubblico_slug', params.slug)
    .eq('pubblico_attivo', true)
    .maybeSingle();
  if (!pollaio) notFound();

  const { data: animali } = await supabase
    .from('animali')
    .select('id, nome, foto_url, razza_id, razza_custom, data_nascita, tipo, colore_piumaggio, razze(nome)')
    .eq('pollaio_id', pollaio.id)
    .eq('attivo', true)
    .is('defunta_il', null);

  const { data: stats } = await supabase.rpc('public_pollaio_stats', { p_slug: params.slug });
  return <PaginaPubblicaView pollaio={pollaio} animali={animali ?? []} stats={stats?.[0]} />;
}

export const revalidate = 300; // ISR 5min
export async function generateMetadata(...) { /* OG image, title, description */ }
```

**Layout pubblico**: `app/(public)/layout.tsx` minimale (no TabBar/FAB), header con logo Poliner + footer "Powered by Poliner".

**Anon client**: `lib/supabase/public.ts` con `createClient(URL, ANON_KEY)`.

### 3. View pagina pubblica

**File: `app/(public)/p/[slug]/PaginaPubblicaView.tsx`**

Sezioni:
- **Hero**: foto pollaio (placeholder se vuota), nome grande, posizione_nome, badge "Su Poliner"
- **Descrizione**: paragrafo `descrizione_pubblica`
- **Stats** (3 card): N galline, N uova totali, N uova ultimi 30 giorni
- **Galline**: griglia 2-3 colonne (foto + nome + razza + età)
- **Footer**: "Vuoi gestire anche tu il tuo pollaio? → poliner.app"

Mobile-first.

### 4. Proxy

**File: `middleware.ts`** — aggiungere `/p/*` alle route pubbliche (no auth redirect).

## File coinvolti

- **Creare**: `supabase/migrations/0018_pollaio_pubblico.sql`, `app/(public)/layout.tsx`, `app/(public)/p/[slug]/page.tsx`, `app/(public)/p/[slug]/PaginaPubblicaView.tsx`, `app/(public)/p/[slug]/not-found.tsx`, `lib/supabase/public.ts`
- **Modificare**: `app/(app)/impostazioni/actions.ts`, `app/(app)/impostazioni/page.tsx` (o ImpostazioniClient.tsx), `middleware.ts`

## Verifica end-to-end

1. Admin attiva pagina pubblica con slug "mio-pollaio" → riceve link copiabile.
2. Apri link in incognito → vede nome, descrizione, galline vive, stats.
3. Disattivi → link → 404 / "Pagina non disponibile".
4. RLS in incognito: query a membri/contatti/spese → vuoto / errore.
5. Slug invalido (caratteri speciali) → errore inline nella form.
6. Lighthouse SEO sulla pagina pubblica > 90.

---

# Fase 5 — Inserimento nuove galline (BASSA)

## Obiettivo

Una sezione "Inserimento" nella scheda gallina che permette di:
- **Educare** l'utente sui passi consigliati (quarantena ~30gg, presentazione visiva ~7gg, convivenza notturna) — card collapsible non obbligatorie.
- **Documentare** in modo flessibile via timeline di eventi liberi: "inizio quarantena", "fine quarantena", "presentazione visiva", "convivenza", "completato", "nota" con foto.
- **Stato derivato**: gallina è "in inserimento" se ha eventi inserimento senza un evento `completato`.

## Schema DB

**Migration: `supabase/migrations/0019_eventi_inserimento.sql`**

```sql
CREATE TYPE tipo_evento_inserimento AS ENUM (
  'quarantena_inizio',
  'quarantena_fine',
  'presentazione_visiva_inizio',
  'presentazione_visiva_fine',
  'convivenza_inizio',
  'completato',
  'nota'
);

CREATE TABLE eventi_inserimento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pollaio_id uuid NOT NULL REFERENCES pollai(id) ON DELETE CASCADE,
  animale_id uuid NOT NULL REFERENCES animali(id) ON DELETE CASCADE,
  tipo tipo_evento_inserimento NOT NULL,
  data date NOT NULL DEFAULT current_date,
  note text,
  foto_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_eventi_inserimento_animale ON eventi_inserimento(animale_id, data DESC);
CREATE INDEX idx_eventi_inserimento_pollaio ON eventi_inserimento(pollaio_id, data DESC);

ALTER TABLE eventi_inserimento ENABLE ROW LEVEL SECURITY;

CREATE POLICY ei_select ON eventi_inserimento FOR SELECT USING (is_my_pollaio(pollaio_id));
CREATE POLICY ei_insert ON eventi_inserimento FOR INSERT WITH CHECK (is_my_pollaio(pollaio_id));
CREATE POLICY ei_update ON eventi_inserimento FOR UPDATE USING (is_my_pollaio(pollaio_id));
CREATE POLICY ei_delete ON eventi_inserimento FOR DELETE USING (is_my_pollaio(pollaio_id));
```

**Stato derivato** (helper SQL opzionale):
```sql
CREATE OR REPLACE FUNCTION animale_in_inserimento(p_animale_id uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM eventi_inserimento WHERE animale_id = p_animale_id)
     AND NOT EXISTS (
       SELECT 1 FROM eventi_inserimento
       WHERE animale_id = p_animale_id AND tipo = 'completato'
     );
$$;
```

## Server actions

**File: `app/(app)/galline/actions.ts`** (estendere)

```ts
export interface NuovoEventoInserimentoInput {
  animaleId: string;
  tipo: 'quarantena_inizio' | 'quarantena_fine' | 'presentazione_visiva_inizio'
      | 'presentazione_visiva_fine' | 'convivenza_inizio' | 'completato' | 'nota';
  data?: string;            // YYYY-MM-DD, default today
  note?: string | null;
  fotoUrl?: string | null;
}

export async function aggiungiEventoInserimento(input: NuovoEventoInserimentoInput): Promise<ActionResult>;
export async function eliminaEventoInserimento(id: string, animaleId: string): Promise<ActionResult>;
```

## UI

### 1. Tab "Inserimento" nella scheda gallina

**File: `app/(app)/galline/[id]/ChickenDetail.tsx`** — aggiungere tab tra "Profilo" e "Salute".

**Contenuto:**

**A) Card educativa collapsible** (default chiusa dopo prima apertura via localStorage flag):
- Titolo: "Come inserire una nuova gallina"
- Accordion 3 step:
  1. **Quarantena (~30 giorni)**: "Tieni la nuova gallina separata per ~30 giorni e controlla che non abbia sintomi (occhi che lacrimano, starnuti, parassiti, feci anomale)."
  2. **Presentazione visiva (~1 settimana)**: "Metti le due aree affiancate con rete divisoria. Le galline si vedono ma non si toccano. Aggiungi più mangiatoie."
  3. **Convivenza**: "Inseriscila di notte mentre le altre dormono. Per i primi giorni rimettila tu nel pollaio la sera. Il pecking order si stabilisce in 1-2 settimane."
- Tip box: "💡 Non introdurre mai una gallina da sola: meglio almeno 2-3 insieme."
- Bottone "Ho capito, nascondi" → localStorage flag

**B) Timeline eventi** (ordine inverso):
- Card per evento: icona tipo + label + data relativa ("3 giorni fa") + note (se presenti) + foto (se presente)
- Mapping:
  - `quarantena_inizio` → 🔒 Quarantena iniziata
  - `quarantena_fine` → 🔓 Quarantena finita
  - `presentazione_visiva_inizio` → 👀 Presentazione visiva iniziata
  - `presentazione_visiva_fine` → 👥 Presentazione visiva finita
  - `convivenza_inizio` → 🏠 Convivenza iniziata
  - `completato` → ✅ Inserimento completato
  - `nota` → 📝 Nota
- Long-press / menu → "Elimina evento"

**C) Bottone "➕ Aggiungi evento"** → BottomSheet con select tipo + data + note + foto

**D) Banner stato corrente** in alto:
- "🏠 In inserimento da N giorni" o "✅ Inserimento completato il GG/MM/AAAA"

### 2. Lista galline — badge + filtro

**File: `app/(app)/galline/page.tsx`** — galline in inserimento mostrano badge 🏠+→ piccolo. Chip filtro "🏠 In inserimento" se almeno 1.

### 3. Dashboard (opzionale)

**File: `app/(app)/page.tsx`** — se ≥1 in inserimento, card riassuntiva "🏠 N galline in inserimento" con counter giorni nella fase corrente.

## File coinvolti

- **Creare**: `supabase/migrations/0019_eventi_inserimento.sql`, `components/galline/InserimentoTab.tsx`, `components/galline/AggiungiEventoInserimentoSheet.tsx`, `components/galline/InserimentoEducativo.tsx`
- **Modificare**: `app/(app)/galline/actions.ts`, `app/(app)/galline/[id]/ChickenDetail.tsx` (tab bar), `app/(app)/galline/page.tsx` (badge/filtro), `app/(app)/page.tsx` (card dashboard, opzionale)

## Verifica end-to-end

1. Da gallina nuova: tab "Inserimento" → card educativa visibile.
2. Aggiungi "Quarantena iniziata" oggi → banner "🏠 In inserimento da 0 giorni", badge in lista galline.
3. Aggiungi vari eventi (quarantena fine, visiva, ecc) → timeline cresce.
4. Aggiungi nota libera con foto → appare in timeline.
5. Aggiungi evento "completato" → banner cambia, badge sparisce.
6. RLS: guest può vedere/editare (uso collaborativo).

---

# Sequenza implementazione consigliata

Procediamo una fase alla volta. Dopo ogni fase: build verde, test manuale dell'utente, conferma esplicita → si passa alla successiva.

1. **Fase 1 — Defunta** (priorità ALTA, introduce il filtro "vive vs defunte" usato dopo)
2. **Fase 2 — Loader & performance** (ALTA, indipendente, miglioria trasversale)
3. **Fase 3 — Home Hospital** (MEDIA, piccola estensione di `eventi_salute`)
4. **Fase 4 — Pollaio pubblico** (MEDIA, isolato in nuova route group)
5. **Fase 5 — Inserimento** (BASSA, ricca ma autonoma)

---

# Note tecniche trasversali

- **TypeScript strict**: aggiornare tipi per ogni nuova colonna.
- **PWA cache**: dopo migrazioni, bump cache version per evitare versioni stale del manifest / route pubblica.
- **Italiano informale**: tutte le copy nuove (modali, frasi empatiche, suggerimenti inserimento, frasi loader) devono mantenere il tono dell'app.
- **Foto**: per `eventi_inserimento.foto_url` riusare bucket Supabase Storage e pattern di upload di `animali.foto_url` e `eventi_salute.foto_url`.
- **Revalidate paths**: ogni server action invocare `revalidatePath` per le rotte impattate (es. defunta → `/galline`, `/`, `/uova`, `/statistiche`, `/galline/in-memoria`).
- **Migrazioni**: applicare via MCP Supabase con `apply_migration`, numerazione progressiva da 0016 a 0019.
- **Indipendenza**: le 5 fasi sono progettate per essere indipendenti tra loro (a parte la convenzione `defunta_il IS NULL` che entra nelle policy pubbliche della Fase 4). Si possono implementare anche in ordine diverso se serve.

---

# Riferimenti (research online)

Domain knowledge su inserimento galline:
- [Come introdurre nuove galline in un gruppo già formato — Omlet](https://blog.omlet.us/2020/04/27/how-to-introduce-new-chickens-to-your-flock/)
- [Inserire una nuova gallina nel pollaio: la guida completa — Un Orso in Campagna](https://www.unorsoincampagna.com/inserire-una-nuova-gallina-nel-pollaio/)
- [Come inserire nuove galline in un pollaio già esistente — tuttosullegalline.it](https://www.tuttosullegalline.it/pollaio-per-galline/come-inserire-nuove-galline-in-pollaio/)
- [Ordine di beccata — tuttosullegalline.it](https://www.tuttosullegalline.it/pollaio-per-galline/ordine-di-beccata/)
- [How to Safely Introduce New Chickens to Flock — Purina](https://www.purinamills.com/chicken-feed/education/detail/how-to-introduce-new-chickens-to-your-flock)
