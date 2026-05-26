# Avvisi home — segna come letto Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere un pulsante "✓" su ogni avviso della home che lo archivia per il ciclo corrente; persistenza per-utente tramite tabella `avvisi_letti`, key di ciclo naturale per ogni tipo di avviso.

**Architecture:** Nuova tabella Supabase `avvisi_letti(user_id, pollaio_id, avviso_key, letto_il)` con RLS per-user. `lib/queries/home.ts` fetcha le key lette dell'utente e dati ausiliari (id uova in scadenza, ultimo rifornimento per scorte basse). `app/(app)/page.tsx` calcola una `avviso_key` deterministica per ogni alert, filtra le lette prima di applicare `.slice(0, 4)`. `AlertCard` diventa client component con corpo-link interno + pulsante ✓ che chiama una server action.

**Tech Stack:** Next.js 16 / React 19 / TypeScript / Tailwind 4 / Supabase. Migrazione SQL applicata via Supabase MCP. Niente test (l'app non ha framework).

**Riferimento spec:** [docs/superpowers/specs/2026-05-25-avvisi-home-letto-design.md](../specs/2026-05-25-avvisi-home-letto-design.md).

---

## File Structure

**Nuovi file:**

- `supabase/migrations/20260525120000_avvisi_letti.sql` — tabella + indici + RLS.
- `lib/actions/avvisi.ts` — server action `segnaAvvisoComeLetto`.

**File modificati:**

- `lib/supabase/database.types.ts` — rigenerato dopo migrazione (script `npm run supabase:types`).
- `lib/queries/home.ts` — aggiunge query `avvisi_letti`, query `MAX(data)` di rifornimenti per scorte basse, espone nuovi campi su `HomeData`. Cambia `uovaInScadenza: number` → `uovaInScadenzaIds: string[]`.
- `app/(app)/page.tsx` — calcola `avviso_key` per ogni alert, filtra le lette, rimuove il wrap `<Link>` esterno attorno ad `AlertCard`.
- `components/ui/AlertCard.tsx` — client component, link interno al corpo, pulsante ✓ sulla destra.

**Convenzioni:**

- Pattern ✓ button: replicare quello di [app/(app)/notifiche/NotificheList.tsx:175-191](../../../app/(app)/notifiche/NotificheList.tsx#L175-L191).
- Naming migrazioni: `YYYYMMDDHHMMSS_<descrizione>.sql`.
- Naming server actions: file in `lib/actions/<dominio>.ts` (vedi [lib/actions/uscite.ts](../../../lib/actions/uscite.ts) per esempio).
- `npm run typecheck` deve passare a ogni commit.

---

## Task 1: Applicare migrazione `avvisi_letti` + rigenerare types

**Files:**
- Create: `supabase/migrations/20260525120000_avvisi_letti.sql`
- Modify: `lib/supabase/database.types.ts` (rigenerato automaticamente)

### Step 1: Creare il file di migrazione

Contenuto completo di `supabase/migrations/20260525120000_avvisi_letti.sql`:

```sql
-- ╔══════════════════════════════════════════════════════════╗
-- ║ Tabella `avvisi_letti`: snooze per-utente degli avvisi   ║
-- ║ derivati mostrati sulla home. Una riga = una "avviso_key"║
-- ║ archiviata. Quando la key cambia (rinnovo del ciclo),    ║
-- ║ l'avviso ricompare naturalmente perché la nuova key non  ║
-- ║ è presente.                                              ║
-- ╚══════════════════════════════════════════════════════════╝

create table if not exists public.avvisi_letti (
  user_id uuid not null references auth.users(id) on delete cascade,
  pollaio_id uuid not null references public.pollai(id) on delete cascade,
  avviso_key text not null,
  letto_il timestamptz not null default now(),
  primary key (user_id, pollaio_id, avviso_key)
);

create index if not exists avvisi_letti_user_pollaio_idx
  on public.avvisi_letti(user_id, pollaio_id);

alter table public.avvisi_letti enable row level security;

drop policy if exists "avvisi_letti_select_own" on public.avvisi_letti;
create policy "avvisi_letti_select_own" on public.avvisi_letti
  for select using (auth.uid() = user_id);

drop policy if exists "avvisi_letti_insert_own" on public.avvisi_letti;
create policy "avvisi_letti_insert_own" on public.avvisi_letti
  for insert with check (auth.uid() = user_id);

drop policy if exists "avvisi_letti_delete_own" on public.avvisi_letti;
create policy "avvisi_letti_delete_own" on public.avvisi_letti
  for delete using (auth.uid() = user_id);
```

- [ ] **Step 2: Applicare la migrazione via Supabase MCP**

**ATTENZIONE — azione su database remoto.** Prima di procedere, chiedere conferma esplicita all'utente. Usare il tool `mcp__claude_ai_Supabase__apply_migration` con:

```
name: "avvisi_letti"
query: <contenuto SQL del file qui sopra>
project_id: "sispxufbdmetaszlhurk"
```

In alternativa, se l'utente preferisce applicare manualmente: chiedergli di eseguire la migrazione sul DB e confermare quando fatto.

- [ ] **Step 3: Rigenerare i types TypeScript**

Run: `npm run supabase:types`
Expected: il file `lib/supabase/database.types.ts` viene riscritto includendo la nuova tabella `avvisi_letti`. Verificare con `grep "avvisi_letti" lib/supabase/database.types.ts` che la tabella sia presente.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260525120000_avvisi_letti.sql lib/supabase/database.types.ts
git commit -m "feat(avvisi): add avvisi_letti table with per-user RLS"
```

---

## Task 2: Server action `segnaAvvisoComeLetto`

**Files:**
- Create: `lib/actions/avvisi.ts`

- [ ] **Step 1: Creare il file**

Contenuto completo di `lib/actions/avvisi.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { requirePollaio } from "@/lib/supabase/queries";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

/**
 * Marca un avviso della home come "letto" per l'utente corrente nel pollaio
 * corrente. L'avviso resta nascosto finché la sua `avviso_key` (che incorpora
 * un cycle_id naturale per il tipo di avviso) non cambia. L'INSERT è
 * idempotente grazie al primary key composto.
 */
export async function segnaAvvisoComeLetto(
  avvisoKey: string,
): Promise<ActionResult> {
  if (!avvisoKey || typeof avvisoKey !== "string") {
    return { ok: false, error: "Chiave avviso non valida" };
  }
  const { supabase, user, pollaio } = await requirePollaio();
  const { error } = await supabase.from("avvisi_letti").upsert(
    {
      user_id: user.id,
      pollaio_id: pollaio.id,
      avviso_key: avvisoKey,
    },
    { onConflict: "user_id,pollaio_id,avviso_key" },
  );
  if (error) {
    console.error("[avvisi] segnaAvvisoComeLetto:", error.message);
    return { ok: false, error: "Ops, riprova!" };
  }
  revalidatePath("/");
  return { ok: true };
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/actions/avvisi.ts
git commit -m "feat(avvisi): add segnaAvvisoComeLetto server action"
```

---

## Task 3: Estendere `lib/queries/home.ts`

**Files:**
- Modify: `lib/queries/home.ts`

L'obiettivo: aggiungere al `loadHomeData` (a) la query delle key lette per
l'utente, (b) la trasformazione di `uovaInScadenza` da count a array di id, (c)
una query secondaria per ottenere l'ultimo rifornimento di ogni scorta bassa,
così l'home page può calcolare la `avviso_key` per le scorte.

### Step 1: Estendere `ScortaBassa` con `ultimoRifornimento`

Trovare l'interfaccia `ScortaBassa` (riga 44-47):

```ts
export interface ScortaBassa {
  id: string;
  nome: string;
}
```

Cambiarla in:

```ts
export interface ScortaBassa {
  id: string;
  nome: string;
  ultimoRifornimento: string | null; // ISO date della riga più recente in scorte_rifornimenti, oppure null
}
```

### Step 2: Cambiare `uovaInScadenza: number` → `uovaInScadenzaIds: string[]` su `HomeData`

Trovare l'interfaccia `HomeData` (riga 60-69):

```ts
export interface HomeData {
  counters: HomeCounters;
  uscitaOggi: UscitaOggi | null;
  hhList: HHGallina[];
  manutenzioneStati: StatoVoce[];
  saluteAttivi: SalutateAttiva[];
  uovaInScadenza: number;
  scorteBasse: ScortaBassa[];
  promemoriaImminenti: PromemoriaImminente[];
}
```

Sostituire con:

```ts
export interface HomeData {
  counters: HomeCounters;
  uscitaOggi: UscitaOggi | null;
  hhList: HHGallina[];
  manutenzioneStati: StatoVoce[];
  saluteAttivi: SalutateAttiva[];
  uovaInScadenzaIds: string[];
  scorteBasse: ScortaBassa[];
  promemoriaImminenti: PromemoriaImminente[];
  avvisiLetti: Set<string>;
}
```

### Step 3: Aggiungere la query `avvisi_letti` nel `Promise.all`

Trovare il blocco `Promise.all([...])` (riga 86 in poi). Aggiungere come ultima
entry dell'array (dopo `homeHospitalRes`, riga ~174):

```ts
supabase
  .from("avvisi_letti")
  .select("avviso_key")
  .eq("user_id", userId)
  .eq("pollaio_id", pollaioId),
```

E aggiungere il binding alla destrutturazione (riga 86-99):

```ts
const [
  uovaDispRes,
  uovaOggiRes,
  gallineCountRes,
  galloCountRes,
  vociAttiveRes,
  manutRes,
  saluteAttiviRes,
  uovaTutte,
  scorteRes,
  promemoriaRes,
  uscitaOggiRes,
  notificheNonLetteRes,
  homeHospitalRes,
  avvisiLettiRes,
] = await Promise.all([
  // ... (queries esistenti, invariate)
  // ... (poi la nuova query qui in fondo)
]);
```

NB: questa è una modifica al singolo array di destrutturazione + parallel queries. Mantenere TUTTE le query esistenti nell'ordine attuale e aggiungere `avvisiLettiRes` come ULTIMO elemento (sia nella destrutturazione che nell'array).

### Step 4: Loggare gli errori della nuova query

Estendere il `logQueryErrors("home", { ... })` (intorno a riga 177-191) aggiungendo:

```ts
avvisiLetti: avvisiLettiRes.error,
```

### Step 5: Cambiare il calcolo di `uovaInScadenza` da count a id-array

Trovare (riga 237-244):

```ts
const uovaInScadenza = (uovaTutte.data ?? []).filter((u) => {
  const s = calcolaScadenza(
    u.data_deposizione,
    u.conservazione as Conservazione,
    conservazione,
  );
  return s.livello === "in_scadenza" || s.livello === "urgente";
}).length;
```

Sostituire con:

```ts
const uovaInScadenzaIds = (uovaTutte.data ?? [])
  .filter((u) => {
    const s = calcolaScadenza(
      u.data_deposizione,
      u.conservazione as Conservazione,
      conservazione,
    );
    return s.livello === "in_scadenza" || s.livello === "urgente";
  })
  .map((u) => u.id);
```

### Step 6: Calcolare l'ultimo rifornimento per le scorte basse

Trovare il blocco di calcolo `scorteBasse` (riga 246-253):

```ts
const scorteBasse: ScortaBassa[] = (scorteRes.data ?? [])
  .filter(
    (s) =>
      s.quantita !== null &&
      s.soglia_avviso !== null &&
      Number(s.quantita) <= Number(s.soglia_avviso),
  )
  .map((s) => ({ id: s.id, nome: s.nome }));
```

Sostituire con (prima filtra le scorte basse, poi fai UNA query a `scorte_rifornimenti` per ottenere il `MAX(data)` per ciascuna):

```ts
const scorteBasseRaw = (scorteRes.data ?? []).filter(
  (s) =>
    s.quantita !== null &&
    s.soglia_avviso !== null &&
    Number(s.quantita) <= Number(s.soglia_avviso),
);

let ultimoRifornimentoMap = new Map<string, string>();
if (scorteBasseRaw.length > 0) {
  const ids = scorteBasseRaw.map((s) => s.id);
  const { data: rifornimentiData, error: rifornimentiErr } = await supabase
    .from("scorte_rifornimenti")
    .select("scorta_id, data")
    .in("scorta_id", ids)
    .order("data", { ascending: false });
  if (rifornimentiErr) {
    console.error("[home] rifornimenti:", rifornimentiErr.message);
  }
  for (const r of rifornimentiData ?? []) {
    if (!ultimoRifornimentoMap.has(r.scorta_id)) {
      ultimoRifornimentoMap.set(r.scorta_id, r.data);
    }
  }
}

const scorteBasse: ScortaBassa[] = scorteBasseRaw.map((s) => ({
  id: s.id,
  nome: s.nome,
  ultimoRifornimento: ultimoRifornimentoMap.get(s.id) ?? null,
}));
```

NB: questa query è sequenziale (dopo il `Promise.all`), perché dipende dagli id delle scorte basse. È accettabile: nella maggior parte dei casi `scorteBasseRaw` è vuoto o ha pochi elementi → query molto leggera.

### Step 7: Calcolare `avvisiLetti` come `Set<string>`

Dopo il calcolo di `promemoriaImminenti` (riga 255-263), aggiungere:

```ts
const avvisiLetti = new Set<string>(
  (avvisiLettiRes.data ?? []).map((r) => r.avviso_key),
);
```

### Step 8: Aggiornare l'oggetto di ritorno

Trovare il `return` finale (riga 303-318):

```ts
return {
  counters: { ... },
  uscitaOggi,
  hhList,
  manutenzioneStati,
  saluteAttivi,
  uovaInScadenza,
  scorteBasse,
  promemoriaImminenti,
};
```

Sostituire con:

```ts
return {
  counters: {
    uovaDisponibili: uovaDispRes.count ?? 0,
    uovaOggi: uovaOggiRes.count ?? 0,
    galline: gallineCountRes.count ?? 0,
    galli: galloCountRes.count ?? 0,
    notificheDaLeggere: notificheNonLetteRes.count ?? 0,
  },
  uscitaOggi,
  hhList,
  manutenzioneStati,
  saluteAttivi,
  uovaInScadenzaIds,
  scorteBasse,
  promemoriaImminenti,
  avvisiLetti,
};
```

### Step 9: Typecheck

Run: `npm run typecheck`
Expected: il file `app/(app)/page.tsx` segnalerà errori perché usa
`data.uovaInScadenza` (numero) — verranno risolti in Task 4. Per ora il
typecheck di `home.ts` da solo passa, ma il typecheck globale fallisce su
page.tsx. **Procedi comunque al commit** — è un commit incrementale, il
typecheck verde arriva con Task 4.

Se preferisci typecheck verde tra Task 3 e 4, aggiungi in `home.ts` un alias
backward-compatible (es. `uovaInScadenza: uovaInScadenzaIds.length` accanto al
nuovo campo), e rimuovilo in Task 4.

### Step 10: Commit

```bash
git add lib/queries/home.ts
git commit -m "feat(avvisi): extend HomeData with avvisiLetti, uovaInScadenzaIds, scorta.ultimoRifornimento"
```

---

## Task 4: Refactor `AlertCard` — client component + bottone ✓

**Files:**
- Modify: `components/ui/AlertCard.tsx`

### Step 1: Riscrivere il componente

Sostituire l'intero contenuto di `components/ui/AlertCard.tsx` con:

```tsx
"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useTransition } from "react";
import { Card } from "./Card";
import { Button } from "./Button";
import { IconChevron } from "./icons";
import { segnaAvvisoComeLetto } from "@/lib/actions/avvisi";

interface AlertCardProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  color?: string;
  href: string;
  avvisoKey?: string;
}

export function AlertCard({
  icon,
  title,
  subtitle,
  color,
  href,
  avvisoKey,
}: AlertCardProps) {
  const [pending, startTransition] = useTransition();

  function onMarkRead(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!avvisoKey) return;
    startTransition(async () => {
      await segnaAvvisoComeLetto(avvisoKey);
    });
  }

  return (
    <Card
      className="flex items-center gap-3 p-0"
      style={{ borderLeft: `4px solid ${color ?? "var(--primary)"}` }}
    >
      <Link href={href} className="flex items-center gap-3 flex-1 min-w-0 p-3.5">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-text">{title}</div>
          {subtitle && (
            <div className="text-xs text-(--text-secondary) mt-0.5">{subtitle}</div>
          )}
        </div>
      </Link>
      {avvisoKey && (
        <Button
          type="button"
          variant="icon"
          onClick={onMarkRead}
          disabled={pending}
          aria-label="Segna come letto"
          className="text-(--primary) text-lg mr-1 shrink-0"
        >
          ✓
        </Button>
      )}
      <IconChevron size={18} color="var(--text-secondary)" />
    </Card>
  );
}
```

**Note importanti**:
- La `Card` ora ha `p-0` perché il padding viene applicato al `<Link>` interno.
- Il `<Link>` occupa tutto lo spazio del titolo/sottotitolo. Il chevron rimane fuori dal link (decorativo).
- Il bottone ✓ usa `variant="icon"` del componente `Button` esistente. `mr-1 shrink-0` per spacing prima del chevron e per non comprimere su titoli lunghi.
- Se `avvisoKey` non è passato, il bottone non si renderizza — comportamento backward-compatible per call site che potrebbero non avere una key (in pratica nel codebase c'è solo la home, ma manteniamo l'opzionalità).

### Step 2: Typecheck

Run: `npm run typecheck`
Expected: `AlertCard` ok. Il chiamante in `app/(app)/page.tsx` segnala ancora errori (passa `onClick`? no, in realtà il vecchio AlertCard aveva `onClick?` opzionale ma il call site non lo usava — il wrap era esterno con `<Link>`). Quindi probabilmente il typecheck di AlertCard non rompe page.tsx, ma a causa del `href` ora required potrebbe segnalare i casi in cui `href` manca. Verifica e procedi.

### Step 3: Commit

```bash
git add components/ui/AlertCard.tsx
git commit -m "feat(avvisi): AlertCard client component with mark-as-read button"
```

---

## Task 5: Aggiornare `app/(app)/page.tsx`

**Files:**
- Modify: `app/(app)/page.tsx`

L'obiettivo: per ogni alert, calcolare `avviso_key`, passare `href` e
`avvisoKey` come prop di `AlertCard`, filtrare gli alert letti, rimuovere il
wrap `<Link>` esterno.

### Step 1: Estendere l'interfaccia `Alert` con `avvisoKey`

Trovare l'interfaccia `Alert` (righe 17-23):

```ts
interface Alert {
  icon: string;
  title: string;
  subtitle?: string;
  color: string;
  href: string;
}
```

Sostituire con:

```ts
interface Alert {
  icon: string;
  title: string;
  subtitle?: string;
  color: string;
  href: string;
  avvisoKey: string;
}
```

### Step 2: Aggiungere una funzione di hash inline per il set di id

Subito sopra l'export `export default async function HomePage()` (riga 25), aggiungere una piccola utility djb2 deterministica:

```ts
function djb2(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}
```

### Step 3: Aggiornare ogni push di alert con la sua `avvisoKey`

Sostituire il blocco `// ── Alerts ──` (righe 33-109) con questa versione, che
aggiunge `avvisoKey` a ogni push e usa i nuovi campi di `HomeData` (`uovaInScadenzaIds`,
`scorteBasse[].ultimoRifornimento`):

```ts
// ── Alerts ──────────────────────────────────────────────
const alerts: Alert[] = [];

// Manutenzioni scadute (solo se la voce è stata almeno fatta una volta:
// evitiamo di mostrare alert per voci appena create che non hanno log)
for (const s of data.manutenzioneStati
  .filter((x) => x.stato === "scaduta" && x.ultimoIntervento !== null)
  .slice(0, 3)) {
  alerts.push({
    icon: "⚠️",
    title: `${s.voce.nome} in ritardo`,
    subtitle: `Da ${s.giorniDaUltimo} giorni`,
    color: "#E8678A",
    href: "/manutenzione",
    avvisoKey: `manut_ritardo:${s.voce.id}:${s.ultimoIntervento ?? "mai"}`,
  });
}
// Manutenzioni in scadenza
for (const s of data.manutenzioneStati
  .filter((x) => x.stato === "in_scadenza")
  .slice(0, 2)) {
  alerts.push({
    icon: "🔔",
    title: `${s.voce.nome} tra poco`,
    subtitle: `Tra ${s.giorniRimanenti} giorni`,
    color: "#FFE07A",
    href: "/manutenzione",
    avvisoKey: `manut_imminente:${s.voce.id}:${s.ultimoIntervento ?? "mai"}`,
  });
}
// Galline con problemi attivi
for (const e of data.saluteAttivi) {
  alerts.push({
    icon: "❤️‍🩹",
    title: `${e.nome} ha un problema`,
    subtitle: e.descrizione ?? e.tipo,
    color: "#E8678A",
    href: `/galline/${e.animale_id}`,
    avvisoKey: `salute:${e.id}`,
  });
}
// Uova in scadenza
if (data.uovaInScadenzaIds.length > 0) {
  const hashIds = djb2([...data.uovaInScadenzaIds].sort().join(","));
  alerts.push({
    icon: "🥚",
    title: `${data.uovaInScadenzaIds.length} uova in scadenza`,
    subtitle: "Usale o regalale presto!",
    color: "#FFE07A",
    href: "/uova",
    avvisoKey: `uova_scadenza:${hashIds}`,
  });
}
// Scorte basse
for (const s of data.scorteBasse.slice(0, 2)) {
  alerts.push({
    icon: "📦",
    title: `${s.nome} sta finendo`,
    subtitle: `Quantità sotto soglia`,
    color: "#FFE07A",
    href: "/scorte",
    avvisoKey: `scorte_basse:${s.id}:${s.ultimoRifornimento ?? "mai"}`,
  });
}
// Promemoria in arrivo (< 24h) o scaduti
const now = Date.now();
for (const p of data.promemoriaImminenti) {
  const dt = new Date(p.promemoria_data).getTime();
  const diffH = Math.round((dt - now) / (1000 * 60 * 60));
  const subtitle =
    diffH < 0
      ? `Promemoria scaduto ${Math.abs(diffH)}h fa`
      : diffH === 0
        ? "Adesso"
        : `Tra ${diffH}h`;
  alerts.push({
    icon: "🔔",
    title: p.testo.slice(0, 60) + (p.testo.length > 60 ? "..." : ""),
    subtitle,
    color: diffH < 0 ? "#E8678A" : "#E8DAFF",
    href: "/note",
    avvisoKey: `promemoria:${p.id}`,
  });
}
```

### Step 4: Filtrare gli alert letti

Subito dopo il blocco precedente (e prima del calcolo del meteo), aggiungere:

```ts
const alertsVisibili = alerts.filter((a) => !data.avvisiLetti.has(a.avvisoKey));
```

### Step 5: Aggiornare il rendering del blocco `{alerts.length > 0 && ...}`

Trovare il blocco di rendering (righe 297-313):

```tsx
{/* Alerts */}
{alerts.length > 0 && (
  <>
    <SectionTitle>Avvisi</SectionTitle>
    <div className="flex flex-col gap-2">
      {alerts.slice(0, 4).map((a, i) => (
        <Link key={i} href={a.href}>
          <AlertCard
            icon={a.icon}
            title={a.title}
            subtitle={a.subtitle}
            color={a.color}
          />
        </Link>
      ))}
    </div>
  </>
)}
```

Sostituire con (usa `alertsVisibili`, passa `href`/`avvisoKey` come prop,
rimuove il wrap esterno `<Link>`):

```tsx
{/* Alerts */}
{alertsVisibili.length > 0 && (
  <>
    <SectionTitle>Avvisi</SectionTitle>
    <div className="flex flex-col gap-2">
      {alertsVisibili.slice(0, 4).map((a) => (
        <AlertCard
          key={a.avvisoKey}
          icon={a.icon}
          title={a.title}
          subtitle={a.subtitle}
          color={a.color}
          href={a.href}
          avvisoKey={a.avvisoKey}
        />
      ))}
    </div>
  </>
)}
```

NB: l'import di `Link` resta in cima al file (è usato altrove nella home — counters, hhList, MeteoWidget). Non rimuoverlo.

### Step 6: Typecheck

Run: `npm run typecheck`
Expected: no errors. La type `Alert` ora richiede `avvisoKey`, tutti i push lo
forniscono. `HomeData` espone `avvisiLetti: Set<string>` e
`uovaInScadenzaIds: string[]`. AlertCard accetta `href` required +
`avvisoKey?`.

### Step 7: Commit

```bash
git add app/\(app\)/page.tsx
git commit -m "feat(avvisi): compute avviso_key per alert and filter read ones"
```

---

## Task 6: Verifica manuale

- [ ] **Step 1: Build / typecheck finale**

Run: `npm run typecheck`
Expected: no errors.

(Run `npm run build` salta sul Node 18 locale — non blocco la verifica
funzionale.)

- [ ] **Step 2: Avviare dev server**

Run: `npm run dev` (in background)

- [ ] **Step 3: Checklist manuale**

| # | Scenario | Atteso |
|---|---|---|
| 1 | Baseline (nessun avviso letto) | Home mostra fino a 4 avvisi come prima. Ogni avviso ha un ✓ sulla destra prima del chevron. |
| 2 | Click sul ✓ di un avviso | L'avviso sparisce immediatamente. Se erano >4, ne riappare uno nuovo. Nessun toast. |
| 3 | Refresh della pagina | L'avviso resta nascosto. |
| 4 | Click sul corpo dell'avviso (non sul ✓) | Naviga al `href` (es. `/manutenzione`, `/galline/{id}`, `/note`). |
| 5 | Rinnovo manutenzione | Snooze su "Pulizia in ritardo". Registra un intervento sulla voce. Voce torna scaduta dopo i giorni di frequenza → avviso riappare. |
| 6 | Rinnovo scorta | Snooze su "Mais sta finendo". Rifornisci la scorta. Consumala fino a tornare sotto soglia → avviso riappare. |
| 7 | Rinnovo uova | Snooze su "X uova in scadenza". Consuma o regala un uovo nel set → avviso riappare (hash cambiato). |
| 8 | Rinnovo salute | Snooze su un problema. Segna come risolto → avviso sparisce. Crea nuovo problema sulla stessa gallina → nuovo avviso. |
| 9 | Cross-utente | Due admin sullo stesso pollaio. Admin A snooza un avviso, Admin B continua a vederlo. |
| 10 | Mobile tap area | Su mobile il ✓ è raggiungibile col pollice e non si tocca per errore navigando. |

- [ ] **Step 4: Eventuale fix puntuale**

Se la checklist scopre regressioni, fix puntuale + commit. Se passa pulita, nulla da committare.

---

## Note operative

- **Ordine consigliato:** Task 1 → 2 → 3 → 4 → 5 → 6. Task 1 è bloccante per gli
  altri (i types serviranno).
- **Migrazione DB è azione su database remoto:** chiedere conferma esplicita
  all'utente prima di eseguire `apply_migration`. Se l'utente preferisce
  applicare manualmente, fornire il file SQL e attendere conferma.
- **Niente test automatici** — l'app non ne ha.
- **Backward-compat AlertCard:** il prop `avvisoKey` è opzionale. Tecnicamente
  il bottone ✓ non appare se la key non viene passata. Tutti i call site
  attuali (1, sulla home) la passano sempre.
