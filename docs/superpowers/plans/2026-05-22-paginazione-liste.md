# Paginazione liste — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere paginazione "Mostra altri (N rimanenti)" a 25 elementi su tutte le liste dell'app, con un hook riusabile e un singolo bottone condiviso.

**Architecture:** Paginazione client-side puramente UI sopra dati già fetchati. Un hook `usePagination<T>` ritorna lo slice visibile e un bottone presentational `LoadMoreButton` mostra "Mostra altri". Pagine server-rendered (notifiche, in-memoria, rubrica/[id]) vengono affettate estraendo client component dedicati che mantengono il fetching nel server component.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind 4. Nessun framework di test nel repo: verifica per typecheck + manuale come stabilito nello spec.

**Riferimento allo spec:** [docs/superpowers/specs/2026-05-22-paginazione-liste-design.md](../specs/2026-05-22-paginazione-liste-design.md).

---

## File Structure

**Nuovi file:**
- `lib/hooks/usePagination.ts` — hook generico riusabile.
- `components/ui/LoadMoreButton.tsx` — bottone "Mostra altri (N rimanenti)".
- `app/(app)/notifiche/NotificheList.tsx` — client component estratto.
- `app/(app)/galline/in-memoria/InMemoriaList.tsx` — client component estratto.
- `app/(app)/rubrica/[id]/RegaliList.tsx` — client component estratto.

**File modificati (applicare l'hook al posto del `.map` diretto, aggiungere il bottone sotto la lista):**
- `app/(app)/uova/UovaList.tsx`
- `app/(app)/spese/SpeseClient.tsx`
- `app/(app)/note/NoteClient.tsx`
- `app/(app)/uscite/UsciteClient.tsx`
- `app/(app)/manutenzione/ManutenzioneClient.tsx`
- `app/(app)/galline/[id]/ChickenDetail.tsx`
- `components/galline/InserimentoTab.tsx`
- `app/(app)/galline/GallineListClient.tsx`
- `app/(app)/rubrica/RubricaClient.tsx`
- `app/(app)/scorte/ScorteClient.tsx`
- `app/(app)/lista-spesa/ListaSpesaClient.tsx`
- `app/(app)/notifiche/page.tsx` (rimpiazza il rendering inline con `<NotificheList />`)
- `app/(app)/galline/in-memoria/page.tsx` (rimpiazza il rendering inline con `<InMemoriaList />`)
- `app/(app)/rubrica/[id]/page.tsx` (rimpiazza il rendering inline con `<RegaliList />`)

**Convenzioni codice da seguire:**
- File client: prima riga `"use client";`.
- Pulsanti: usare il componente `Button` esistente (`@/components/ui/Button`), variant `secondary`, `fullWidth`.
- Comandi typecheck: `npm run typecheck`.
- Dimensione pagina default: `25`, esportata come costante.

---

## Task 1: Creare l'hook `usePagination`

**Files:**
- Create: `lib/hooks/usePagination.ts`

- [ ] **Step 1: Creare il file**

Contenuto completo di `lib/hooks/usePagination.ts`:

```ts
"use client";

import { useEffect, useMemo, useState } from "react";

export const PAGE_SIZE_DEFAULT = 25;

export interface UsePaginationResult<T> {
  visible: T[];
  hasMore: boolean;
  remaining: number;
  loadMore: () => void;
  reset: () => void;
}

/**
 * Paginazione client-side sopra un array già in memoria.
 *
 * Espone i primi `pageSize * pageCount` elementi e una funzione `loadMore`
 * che incrementa `pageCount`. Quando `items` cambia identità (filtro
 * cambiato, refresh) si resetta automaticamente alla prima pagina.
 */
export function usePagination<T>(
  items: T[],
  pageSize: number = PAGE_SIZE_DEFAULT,
): UsePaginationResult<T> {
  const [pageCount, setPageCount] = useState(1);

  useEffect(() => {
    setPageCount(1);
  }, [items]);

  const visible = useMemo(
    () => items.slice(0, pageCount * pageSize),
    [items, pageCount, pageSize],
  );

  const hasMore = visible.length < items.length;
  const remaining = items.length - visible.length;

  function loadMore() {
    setPageCount((p) => p + 1);
  }

  function reset() {
    setPageCount(1);
  }

  return { visible, hasMore, remaining, loadMore, reset };
}
```

- [ ] **Step 2: Verifica typecheck**

Run: `npm run typecheck`
Expected: nessun errore.

- [ ] **Step 3: Commit**

```bash
git add lib/hooks/usePagination.ts
git commit -m "feat(pagination): add usePagination hook"
```

---

## Task 2: Creare `LoadMoreButton`

**Files:**
- Create: `components/ui/LoadMoreButton.tsx`

- [ ] **Step 1: Creare il file**

Contenuto completo di `components/ui/LoadMoreButton.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/Button";

interface LoadMoreButtonProps {
  onClick: () => void;
  remaining: number;
  className?: string;
}

export function LoadMoreButton({
  onClick,
  remaining,
  className,
}: LoadMoreButtonProps) {
  return (
    <Button
      variant="secondary"
      fullWidth
      onClick={onClick}
      className={`mt-3 ${className ?? ""}`}
    >
      Mostra altri ({remaining} rimanenti)
    </Button>
  );
}
```

- [ ] **Step 2: Verifica typecheck**

Run: `npm run typecheck`
Expected: nessun errore.

- [ ] **Step 3: Commit**

```bash
git add components/ui/LoadMoreButton.tsx
git commit -m "feat(pagination): add LoadMoreButton component"
```

---

## Task 3: Paginare Uova → Storico + Scorte raggruppate

**Files:**
- Modify: `app/(app)/uova/UovaList.tsx`

L'obiettivo: nel tab **Storico** paginare la lista piatta `uova`. Nel tab **Scorte** paginare gli elementi `disponibili` (in piatto) e ricostruire i gruppi per data sui visibili. Riepiloghi e card di alert continuano a usare i totali.

- [ ] **Step 1: Importare hook e bottone**

In testa al file, aggiungere agli import esistenti:

```ts
import { usePagination } from "@/lib/hooks/usePagination";
import { LoadMoreButton } from "@/components/ui/LoadMoreButton";
```

- [ ] **Step 2: Sostituire il rendering dello Storico**

Sostituire la funzione `Storico` (riga ~250) con questa versione:

```tsx
function Storico({
  uova,
  settings,
  isAdmin,
}: {
  uova: UovoDisplay[];
  settings: ConservazioneSettings;
  isAdmin: boolean;
}) {
  const { visible, hasMore, remaining, loadMore } = usePagination(uova);

  if (uova.length === 0) {
    return (
      <EmptyState
        icon="🥚"
        title="Nessun uovo ancora"
        subtitle="Inizia a raccogliere per costruire lo storico."
      />
    );
  }
  return (
    <>
      <div className="flex flex-col gap-1.5">
        {visible.map((u) => (
          <UovoRow key={u.id} u={u} settings={settings} variant="storico" isAdmin={isAdmin} />
        ))}
      </div>
      {hasMore && <LoadMoreButton onClick={loadMore} remaining={remaining} />}
    </>
  );
}
```

- [ ] **Step 3: Sostituire il rendering di Scorte (gruppi)**

Nel componente `Scorte`, sostituire il blocco corrente che calcola `grouped` e lo renderizza (righe ~122-215 circa) con questa logica.

Il `grouped` esistente:

```tsx
const grouped = useMemo(() => {
  const m = new Map<string, UovoDisplay[]>();
  for (const u of disponibili) {
    const k = u.dataDeposizione.slice(0, 10);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(u);
  }
  return Array.from(m.entries()).sort(([a], [b]) => b.localeCompare(a));
}, [disponibili]);
```

va sostituito con questo blocco (aggiungere paginazione sui `disponibili` e ricostruire i gruppi sui visibili):

```tsx
const {
  visible: disponibiliVisible,
  hasMore: scorteHasMore,
  remaining: scorteRemaining,
  loadMore: scorteLoadMore,
} = usePagination(disponibili);

const grouped = useMemo(() => {
  const m = new Map<string, UovoDisplay[]>();
  for (const u of disponibiliVisible) {
    const k = u.dataDeposizione.slice(0, 10);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(u);
  }
  return Array.from(m.entries()).sort(([a], [b]) => b.localeCompare(a));
}, [disponibiliVisible]);
```

Poi, alla fine del blocco che renderizza i gruppi (subito dopo il `.map` di `grouped`, prima del blocco `isAdmin`), inserire:

```tsx
{scorteHasMore && (
  <LoadMoreButton onClick={scorteLoadMore} remaining={scorteRemaining} />
)}
```

Concretamente, la sezione dopo la modifica diventa:

```tsx
{/* Empty */}
{disponibili.length === 0 ? (
  <EmptyState
    icon="🥚"
    title="Nessun uovo in scorta"
    subtitle="Quando raccoglierai un uovo, apparirà qui."
  />
) : (
  <>
    {grouped.map(([date, eggs]) => (
      <div key={date}>
        <div className="flex justify-between items-center mt-3 mb-2">
          <div className="text-[13px] font-bold text-(--text-secondary)">
            {etichettaGiornoRelativo(date)} · {formatData(date)}
          </div>
          <Badge small bg="var(--primary-lighter)" color="var(--primary)">
            {eggs.length} 🥚
          </Badge>
        </div>
        <div className="flex flex-col gap-1.5">
          {eggs.map((u) => (
            <UovoRow key={u.id} u={u} settings={settings} variant="scorta" isAdmin={isAdmin} />
          ))}
        </div>
      </div>
    ))}
    {scorteHasMore && (
      <LoadMoreButton onClick={scorteLoadMore} remaining={scorteRemaining} />
    )}
  </>
)}
```

- [ ] **Step 4: Verifica typecheck**

Run: `npm run typecheck`
Expected: nessun errore.

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/uova/UovaList.tsx
git commit -m "feat(pagination): paginate uova storico and scorte lists"
```

---

## Task 4: Paginare Spese

**Files:**
- Modify: `app/(app)/spese/SpeseClient.tsx`

- [ ] **Step 1: Aggiungere import**

In testa al file, aggiungere:

```ts
import { usePagination } from "@/lib/hooks/usePagination";
import { LoadMoreButton } from "@/components/ui/LoadMoreButton";
```

- [ ] **Step 2: Inserire l'hook**

Dentro `SpeseClient`, dopo la dichiarazione di `perCategoria` (riga ~86), aggiungere:

```ts
const {
  visible: speseVisible,
  hasMore: speseHasMore,
  remaining: speseRemaining,
  loadMore: speseLoadMore,
} = usePagination(speseFiltrate);
```

- [ ] **Step 3: Sostituire il `.map` della lista**

Sostituire questo blocco (riga ~186):

```tsx
<div className="flex flex-col gap-1.5">
  {speseFiltrate.map((s) => (
    <SpesaRow key={s.id} spesa={s} onEdit={() => setEditing(s)} />
  ))}
</div>
```

con:

```tsx
<>
  <div className="flex flex-col gap-1.5">
    {speseVisible.map((s) => (
      <SpesaRow key={s.id} spesa={s} onEdit={() => setEditing(s)} />
    ))}
  </div>
  {speseHasMore && (
    <LoadMoreButton onClick={speseLoadMore} remaining={speseRemaining} />
  )}
</>
```

- [ ] **Step 4: Verifica typecheck**

Run: `npm run typecheck`
Expected: nessun errore.

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/spese/SpeseClient.tsx
git commit -m "feat(pagination): paginate spese list"
```

---

## Task 5: Paginare Note

**Files:**
- Modify: `app/(app)/note/NoteClient.tsx`

- [ ] **Step 1: Aggiungere import**

```ts
import { usePagination } from "@/lib/hooks/usePagination";
import { LoadMoreButton } from "@/components/ui/LoadMoreButton";
```

- [ ] **Step 2: Inserire l'hook dopo `filtered`**

Subito dopo `const filtered = filtro === "tutte" ? items : items.filter(...)`, aggiungere:

```ts
const { visible, hasMore, remaining, loadMore } = usePagination(filtered);
```

- [ ] **Step 3: Sostituire il rendering della lista**

Sostituire:

```tsx
<div className="flex flex-col gap-2">
  {filtered.map((n) => (
    <NotaCard key={n.id} nota={n} onEdit={() => setEditing(n)} />
  ))}
</div>
```

con:

```tsx
<>
  <div className="flex flex-col gap-2">
    {visible.map((n) => (
      <NotaCard key={n.id} nota={n} onEdit={() => setEditing(n)} />
    ))}
  </div>
  {hasMore && <LoadMoreButton onClick={loadMore} remaining={remaining} />}
</>
```

- [ ] **Step 4: Verifica typecheck**

Run: `npm run typecheck`
Expected: nessun errore.

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/note/NoteClient.tsx
git commit -m "feat(pagination): paginate note list"
```

---

## Task 6: Paginare Uscite (storico)

**Files:**
- Modify: `app/(app)/uscite/UsciteClient.tsx`

- [ ] **Step 1: Aggiungere import**

```ts
import { usePagination } from "@/lib/hooks/usePagination";
import { LoadMoreButton } from "@/components/ui/LoadMoreButton";
```

- [ ] **Step 2: Inserire l'hook**

Dentro `UsciteClient`, dopo la riga `const hasData = chartData.some(...)`, aggiungere:

```ts
const {
  visible: logVisible,
  hasMore: logHasMore,
  remaining: logRemaining,
  loadMore: logLoadMore,
} = usePagination(log);
```

- [ ] **Step 3: Sostituire il rendering dello storico**

Nel blocco JSX intorno alla riga ~190, la modifica è chirurgica:
1. Cambiare l'iterando da `log.map((r) =>` a `logVisible.map((r) =>`. Il corpo interno della `Card` (l'avatar, le `div` con apertura/chiusura, il bottone modifica) resta **identico**.
2. Wrappare il `<div>` esistente in un fragment `<>...</>`.
3. Subito dopo il `</div>`, aggiungere il bottone `LoadMoreButton` condizionale.

Risultato finale:

```tsx
<>
  <div className="flex flex-col gap-1.5">
    {logVisible.map((r) => (
      <Card key={r.id} className="flex items-center gap-3 py-2.5 px-3.5">
        <div className="w-10 h-10 rounded-xl bg-(--primary-lighter) flex items-center justify-center text-lg shrink-0">
          {r.oraUscita && r.oraRientro ? "🐔" : r.oraUscita ? "☀️" : "🌙"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">
            {etichettaGiornoRelativo(r.data)} · {formatData(r.data)}
          </div>
          <div className="text-xs text-(--text-secondary)">
            {r.oraUscita ? `Aperto ${r.oraUscita}` : "Apertura —"}
            {r.oraRientro ? ` · Chiuso ${r.oraRientro}` : " · Chiusura —"}
          </div>
          {r.note && (
            <div className="text-xs text-(--text-secondary) italic mt-0.5">
              {r.note}
            </div>
          )}
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setEditing(r)}
            className="text-(--text-secondary) text-sm"
            aria-label="Modifica"
          >
            ✏️
          </button>
        )}
      </Card>
    ))}
  </div>
  {logHasMore && (
    <LoadMoreButton onClick={logLoadMore} remaining={logRemaining} />
  )}
</>
```

- [ ] **Step 4: Verifica typecheck**

Run: `npm run typecheck`
Expected: nessun errore.

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/uscite/UsciteClient.tsx
git commit -m "feat(pagination): paginate uscite log"
```

---

## Task 7: Paginare Manutenzione → Ultimi interventi

**Files:**
- Modify: `app/(app)/manutenzione/ManutenzioneClient.tsx`

Paginare SOLO la lista `ultimi` (log interventi). `stati` e `consigli` restano non paginate (vedi spec §4.1).

- [ ] **Step 1: Aggiungere import**

```ts
import { usePagination } from "@/lib/hooks/usePagination";
import { LoadMoreButton } from "@/components/ui/LoadMoreButton";
```

- [ ] **Step 2: Inserire l'hook prima del render**

All'inizio del componente `ManutenzioneClient`, dopo `const isAdmin = ruolo === "admin";`, aggiungere:

```ts
const {
  visible: ultimiVisible,
  hasMore: ultimiHasMore,
  remaining: ultimiRemaining,
  loadMore: ultimiLoadMore,
} = usePagination(ultimi);
```

- [ ] **Step 3: Sostituire il rendering della lista `ultimi`**

Sostituire (riga ~159):

```tsx
<div className="flex flex-col gap-1.5">
  {ultimi.map((l) => (
    <LogRow key={l.id} log={l} isAdmin={isAdmin} />
  ))}
</div>
```

con:

```tsx
<>
  <div className="flex flex-col gap-1.5">
    {ultimiVisible.map((l) => (
      <LogRow key={l.id} log={l} isAdmin={isAdmin} />
    ))}
  </div>
  {ultimiHasMore && (
    <LoadMoreButton onClick={ultimiLoadMore} remaining={ultimiRemaining} />
  )}
</>
```

- [ ] **Step 4: Verifica typecheck**

Run: `npm run typecheck`
Expected: nessun errore.

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/manutenzione/ManutenzioneClient.tsx
git commit -m "feat(pagination): paginate manutenzione log"
```

---

## Task 8: Paginare ChickenDetail → Trattamenti, Eventi salute, Periodi muta

**Files:**
- Modify: `app/(app)/galline/[id]/ChickenDetail.tsx`

Le **Ultime uova** sono già limitate a 10 server-side e non vanno paginate. Toccare solo le tre liste all'interno del `SaluteTab`.

- [ ] **Step 1: Aggiungere import**

In testa al file:

```ts
import { usePagination } from "@/lib/hooks/usePagination";
import { LoadMoreButton } from "@/components/ui/LoadMoreButton";
```

- [ ] **Step 2: Aggiungere gli hook in cima a `SaluteTab`**

Dentro la funzione `SaluteTab` (intorno a riga ~598), subito dopo `const { show } = useToast();` e `const [pending, startTransition] = useTransition();`, aggiungere:

```ts
const {
  visible: muteVisible,
  hasMore: muteHasMore,
  remaining: muteRemaining,
  loadMore: muteLoadMore,
} = usePagination(periodiMuta);

const {
  visible: eventiVisible,
  hasMore: eventiHasMore,
  remaining: eventiRemaining,
  loadMore: eventiLoadMore,
} = usePagination(eventiSalute);

const {
  visible: trattamentiVisible,
  hasMore: trattamentiHasMore,
  remaining: trattamentiRemaining,
  loadMore: trattamentiLoadMore,
} = usePagination(trattamenti);
```

- [ ] **Step 3: Sostituire il rendering di `periodiMuta`**

Sostituire (riga ~668):

```tsx
{periodiMuta.map((p) => (
  <div key={p.id} className="text-xs text-(--text-secondary)">
    {formatData(p.data_inizio)} →{" "}
    {p.data_fine ? formatData(p.data_fine) : "in corso"}
  </div>
))}
```

con:

```tsx
{muteVisible.map((p) => (
  <div key={p.id} className="text-xs text-(--text-secondary)">
    {formatData(p.data_inizio)} →{" "}
    {p.data_fine ? formatData(p.data_fine) : "in corso"}
  </div>
))}
{muteHasMore && (
  <LoadMoreButton onClick={muteLoadMore} remaining={muteRemaining} />
)}
```

- [ ] **Step 4: Sostituire il rendering di `eventiSalute`**

La modifica è chirurgica nel blocco intorno alla riga ~703:
1. Cambiare `eventiSalute.map((e) =>` in `eventiVisible.map((e) =>`. Il corpo della funzione interna (calcolo di `hhAttivo`, il render della `Card` con `Badge`, `formatData`, i bottoni "Segna come risolto" / "Aggiorna Home Hospital") resta **identico**.
2. Wrappare il `<div>` esistente in un fragment `<>...</>`.
3. Aggiungere il bottone `LoadMoreButton` subito dopo il `</div>`.

Risultato:

```tsx
<>
  <div className="flex flex-col gap-2">
    {eventiVisible.map((e) => {
      const hhAttivo = e.home_hospital && !e.hh_a;
      return (
        <Card key={e.id}>
          {/* Tutto il contenuto della Card resta invariato rispetto al codice attuale:
              header con descrizione + badge HH + badge stato,
              riga con formatData + tipoEventoLabel,
              eventuale riga "🏠 Dal ... al ...",
              bottoni "Segna come risolto" / "Aggiorna Home Hospital".
              Vedi codice esistente alle righe ~706-758. */}
        </Card>
      );
    })}
  </div>
  {eventiHasMore && (
    <LoadMoreButton onClick={eventiLoadMore} remaining={eventiRemaining} />
  )}
</>
```

NB: il commento `{/* ... */}` sopra è un placeholder PER IL PLAN, non per il codice. Quando applichi la modifica, mantieni nel JSX il corpo originale della `Card` come appare nel file esistente — l'unica cosa che cambia è il nome dell'iterando.

- [ ] **Step 5: Sostituire il rendering di `trattamenti`**

Modifica chirurgica nel blocco intorno alla riga ~787:
1. Cambiare `trattamenti.map((t) =>` in `trattamentiVisible.map((t) =>`. Il corpo della `Card` (header con tipo + data, dettagli `prodotto` / `dose` / `note`, eventuale "Prossimo trattamento", bottone "Elimina" condizionale) resta **identico**.
2. Wrappare il `<div>` esistente in un fragment.
3. Aggiungere `LoadMoreButton` subito dopo.

Il corpo della `Card` originale è il blocco di righe ~789-826 nel file esistente — non riscriverlo, semplicemente cambia l'iterando e wrappa.

- [ ] **Step 6: Verifica typecheck**

Run: `npm run typecheck`
Expected: nessun errore.

- [ ] **Step 7: Commit**

```bash
git add app/\(app\)/galline/\[id\]/ChickenDetail.tsx
git commit -m "feat(pagination): paginate chicken health timeline"
```

---

## Task 9: Paginare InserimentoTab (timeline eventi)

**Files:**
- Modify: `components/galline/InserimentoTab.tsx`

- [ ] **Step 1: Aggiungere import**

```ts
import { usePagination } from "@/lib/hooks/usePagination";
import { LoadMoreButton } from "@/components/ui/LoadMoreButton";
```

- [ ] **Step 2: Inserire l'hook**

Dentro `InserimentoTab` (riga ~37), prima del `return`, aggiungere:

```ts
const { visible, hasMore, remaining, loadMore } = usePagination(eventi);
```

- [ ] **Step 3: Sostituire il rendering della timeline**

Sostituire (riga ~125):

```tsx
<div className="flex flex-col gap-2">
  {eventi.map((e) => (
    <EventoCard
      key={e.id}
      evento={e}
      onDelete={readOnly ? undefined : () => elimina(e.id)}
      pending={pending}
    />
  ))}
</div>
```

con:

```tsx
<>
  <div className="flex flex-col gap-2">
    {visible.map((e) => (
      <EventoCard
        key={e.id}
        evento={e}
        onDelete={readOnly ? undefined : () => elimina(e.id)}
        pending={pending}
      />
    ))}
  </div>
  {hasMore && <LoadMoreButton onClick={loadMore} remaining={remaining} />}
</>
```

- [ ] **Step 4: Verifica typecheck**

Run: `npm run typecheck`
Expected: nessun errore.

- [ ] **Step 5: Commit**

```bash
git add components/galline/InserimentoTab.tsx
git commit -m "feat(pagination): paginate inserimento timeline"
```

---

## Task 10: Paginare lista Galline attive

**Files:**
- Modify: `app/(app)/galline/GallineListClient.tsx`

- [ ] **Step 1: Aggiungere import**

```ts
import { usePagination } from "@/lib/hooks/usePagination";
import { LoadMoreButton } from "@/components/ui/LoadMoreButton";
```

- [ ] **Step 2: Inserire l'hook dopo `filtered`**

Dopo il blocco `const filtered = useMemo(...)` (riga ~55-71), aggiungere:

```ts
const { visible, hasMore, remaining, loadMore } = usePagination(filtered);
```

- [ ] **Step 3: Sostituire il rendering della lista**

Sostituire (riga ~130):

```tsx
<div className="flex flex-col gap-2">
  {filtered.map((g) => (
    <GallinaRow key={g.id} g={g} />
  ))}
</div>
```

con:

```tsx
<>
  <div className="flex flex-col gap-2">
    {visible.map((g) => (
      <GallinaRow key={g.id} g={g} />
    ))}
  </div>
  {hasMore && <LoadMoreButton onClick={loadMore} remaining={remaining} />}
</>
```

- [ ] **Step 4: Verifica typecheck**

Run: `npm run typecheck`
Expected: nessun errore.

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/galline/GallineListClient.tsx
git commit -m "feat(pagination): paginate galline list"
```

---

## Task 11: Paginare Rubrica contatti

**Files:**
- Modify: `app/(app)/rubrica/RubricaClient.tsx`

- [ ] **Step 1: Aggiungere import**

```ts
import { usePagination } from "@/lib/hooks/usePagination";
import { LoadMoreButton } from "@/components/ui/LoadMoreButton";
```

- [ ] **Step 2: Inserire l'hook dopo `sorted`**

```ts
const { visible, hasMore, remaining, loadMore } = usePagination(sorted);
```

- [ ] **Step 3: Sostituire il rendering della lista**

Modifica chirurgica nel blocco intorno alla riga ~46:
1. Cambiare `sorted.map((c, i) =>` in `visible.map((c, i) =>`. Il corpo (`<Link href=... ><Card clickable><Avatar><div>...nome, relazione, totale...</div><IconChevron/></Card></Link>`) resta **identico**.
2. Wrappare il `<div className="flex flex-col gap-2">` esistente in un fragment.
3. Aggiungere `LoadMoreButton` subito dopo.

Il blocco originale del `.map` sta alle righe ~46-78 — non riscriverlo, cambia solo l'iterando e wrappa.

- [ ] **Step 4: Verifica typecheck**

Run: `npm run typecheck`
Expected: nessun errore.

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/rubrica/RubricaClient.tsx
git commit -m "feat(pagination): paginate rubrica contacts"
```

---

## Task 12: Paginare Scorte

**Files:**
- Modify: `app/(app)/scorte/ScorteClient.tsx`

- [ ] **Step 1: Aggiungere import**

```ts
import { usePagination } from "@/lib/hooks/usePagination";
import { LoadMoreButton } from "@/components/ui/LoadMoreButton";
```

- [ ] **Step 2: Inserire l'hook prima del render**

Subito dopo `const basse = items.filter(isLow);` (riga ~63), aggiungere:

```ts
const { visible, hasMore, remaining, loadMore } = usePagination(items);
```

- [ ] **Step 3: Sostituire il rendering della lista**

Sostituire (riga ~88):

```tsx
<div className="flex flex-col gap-2">
  {items.map((s) => (
    <ScortaRow
      key={s.id}
      scorta={s}
      onEdit={() => setEditing(s)}
      onRefill={() => setRefillTarget(s)}
      onConsume={() => setConsumeTarget(s)}
    />
  ))}
</div>
```

con:

```tsx
<>
  <div className="flex flex-col gap-2">
    {visible.map((s) => (
      <ScortaRow
        key={s.id}
        scorta={s}
        onEdit={() => setEditing(s)}
        onRefill={() => setRefillTarget(s)}
        onConsume={() => setConsumeTarget(s)}
      />
    ))}
  </div>
  {hasMore && <LoadMoreButton onClick={loadMore} remaining={remaining} />}
</>
```

NB: la card di alert "X scorte basse" continua a usare `basse` (basata su `items` completo), non sui visibili.

- [ ] **Step 4: Verifica typecheck**

Run: `npm run typecheck`
Expected: nessun errore.

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/scorte/ScorteClient.tsx
git commit -m "feat(pagination): paginate scorte list"
```

---

## Task 13: Paginare Lista spesa (pending + done)

**Files:**
- Modify: `app/(app)/lista-spesa/ListaSpesaClient.tsx`

Sono due liste UI distinte (`pending2` e `done`). Paginazione separata per ciascuna.

- [ ] **Step 1: Aggiungere import**

```ts
import { usePagination } from "@/lib/hooks/usePagination";
import { LoadMoreButton } from "@/components/ui/LoadMoreButton";
```

- [ ] **Step 2: Inserire gli hook**

Dopo `const done = items.filter((i) => i.comprato);` (riga ~57):

```ts
const {
  visible: pendingVisible,
  hasMore: pendingHasMore,
  remaining: pendingRemaining,
  loadMore: pendingLoadMore,
} = usePagination(pending2);

const {
  visible: doneVisible,
  hasMore: doneHasMore,
  remaining: doneRemaining,
  loadMore: doneLoadMore,
} = usePagination(done);
```

- [ ] **Step 3: Sostituire il rendering di `pending2`**

Sostituire (riga ~144):

```tsx
<div className="flex flex-col gap-1.5">
  {pending2.map((v) => (
    <VoceRow key={v.id} voce={v} disabled={pending} />
  ))}
</div>
```

con:

```tsx
<>
  <div className="flex flex-col gap-1.5">
    {pendingVisible.map((v) => (
      <VoceRow key={v.id} voce={v} disabled={pending} />
    ))}
  </div>
  {pendingHasMore && (
    <LoadMoreButton onClick={pendingLoadMore} remaining={pendingRemaining} />
  )}
</>
```

- [ ] **Step 4: Sostituire il rendering di `done`**

Sostituire (riga ~196):

```tsx
<div className="flex flex-col gap-1.5">
  {done.map((v) => (
    <VoceRow key={v.id} voce={v} disabled={pending} />
  ))}
</div>
```

con:

```tsx
<>
  <div className="flex flex-col gap-1.5">
    {doneVisible.map((v) => (
      <VoceRow key={v.id} voce={v} disabled={pending} />
    ))}
  </div>
  {doneHasMore && (
    <LoadMoreButton onClick={doneLoadMore} remaining={doneRemaining} />
  )}
</>
```

- [ ] **Step 5: Verifica typecheck**

Run: `npm run typecheck`
Expected: nessun errore.

- [ ] **Step 6: Commit**

```bash
git add app/\(app\)/lista-spesa/ListaSpesaClient.tsx
git commit -m "feat(pagination): paginate shopping list"
```

---

## Task 14: Estrarre `NotificheList` e paginare

**Files:**
- Create: `app/(app)/notifiche/NotificheList.tsx`
- Modify: `app/(app)/notifiche/page.tsx`

L'attuale `page.tsx` è un server component che renderizza inline. Lo spostiamo: i dati restano fetchati server-side, il rendering passa a un client component paginato.

- [ ] **Step 1: Creare il file `NotificheList.tsx`**

Contenuto completo di `app/(app)/notifiche/NotificheList.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadMoreButton } from "@/components/ui/LoadMoreButton";
import { usePagination } from "@/lib/hooks/usePagination";
import { etichettaGiornoRelativo, formatData } from "@/lib/utils/date";
import { segnaNotificaComeLetta, segnaTutteComeLette } from "./actions";

export interface NotificaItem {
  id: string;
  categoria: string;
  riferimento_id: string;
  inviata_il: string;
  letta_il: string | null;
}

export interface CategoriaMeta {
  label: string;
  icona: string;
  color: string;
  hrefFn?: (riferimentoId: string) => string;
}

interface Props {
  items: NotificaItem[];
  unreadCount: number;
  meta: Record<string, CategoriaMeta>;
}

export function NotificheList({ items, unreadCount, meta }: Props) {
  const { visible, hasMore, remaining, loadMore } = usePagination(items);

  const grouped = useMemo(() => {
    const m = new Map<string, NotificaItem[]>();
    for (const n of visible) {
      const key = n.inviata_il.slice(0, 10);
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(n);
    }
    return Array.from(m.entries());
  }, [visible]);

  return (
    <>
      {unreadCount > 0 && (
        <form action={segnaTutteComeLette} className="flex justify-end mb-3">
          <Button type="submit" variant="secondary" size="md" className="text-xs px-3 py-2">
            Segna tutte come lette
          </Button>
        </form>
      )}

      {grouped.map(([date, group]) => (
        <div key={date}>
          <div className="text-[13px] font-bold text-(--text-secondary) mt-4 mb-2">
            {etichettaGiornoRelativo(date)} · {formatData(date)}
          </div>
          <div className="flex flex-col gap-1.5">
            {group.map((n) => {
              const m = meta[n.categoria] ?? {
                label: n.categoria,
                icona: "🔔",
                color: "#F0EDE8",
              };
              const href = m.hrefFn?.(n.riferimento_id) ?? null;
              const isUnread = n.letta_il === null;

              return (
                <Card
                  key={n.id}
                  className="flex items-center gap-3 py-2.5 px-3.5"
                  style={{
                    background: isUnread ? "#FFF7DD" : undefined,
                    borderColor: isUnread ? "#FFE07A66" : undefined,
                  }}
                >
                  <span
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                    style={{ background: `${m.color}44` }}
                  >
                    {m.icona}
                  </span>
                  <div className="flex-1 min-w-0">
                    {href ? (
                      <Link href={href} className="block">
                        <div className="font-semibold text-sm flex items-center gap-2">
                          <span>{m.label}</span>
                          {isUnread && (
                            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-(--primary)" />
                          )}
                        </div>
                        <div className="text-xs text-(--text-secondary)">
                          {new Date(n.inviata_il).toLocaleTimeString("it-IT", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </Link>
                    ) : (
                      <>
                        <div className="font-semibold text-sm flex items-center gap-2">
                          <span>{m.label}</span>
                          {isUnread && (
                            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-(--primary)" />
                          )}
                        </div>
                        <div className="text-xs text-(--text-secondary)">
                          {new Date(n.inviata_il).toLocaleTimeString("it-IT", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </>
                    )}
                  </div>
                  {isUnread ? (
                    <form action={segnaNotificaComeLetta} className="shrink-0">
                      <input type="hidden" name="id" value={n.id} />
                      <Button
                        type="submit"
                        variant="icon"
                        aria-label="Segna come letta"
                        className="text-(--primary) text-lg"
                      >
                        ✓
                      </Button>
                    </form>
                  ) : (
                    <span className="text-xs font-semibold text-(--text-secondary) shrink-0">
                      Letta
                    </span>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {hasMore && <LoadMoreButton onClick={loadMore} remaining={remaining} />}

      {!hasMore && items.length > 0 && (
        <p className="text-center text-xs text-(--text-secondary) mt-6 italic">
          Mostriamo solo gli ultimi {items.length} avvisi degli ultimi 30 giorni.
        </p>
      )}
    </>
  );
}
```

- [ ] **Step 2: Sostituire il contenuto di `app/(app)/notifiche/page.tsx`**

Nuovo contenuto completo:

```tsx
import { requireAdminPollaio, requireUser } from "@/lib/supabase/queries";
import { Header } from "@/components/ui/Header";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { NotificheList, type NotificaItem, type CategoriaMeta } from "./NotificheList";

export const dynamic = "force-dynamic";

const META: Record<string, CategoriaMeta> = {
  promemoria: {
    label: "Promemoria",
    icona: "🔔",
    color: "#E8DAFF",
    hrefFn: () => "/note",
  },
  uova_scadenza: {
    label: "Uova in scadenza",
    icona: "🥚",
    color: "#FFE07A",
    hrefFn: () => "/uova",
  },
  manutenzione: {
    label: "Manutenzione",
    icona: "🧹",
    color: "#B5D4B5",
    hrefFn: () => "/manutenzione",
  },
  trattamenti: {
    label: "Trattamento",
    icona: "💊",
    color: "#FFD6E0",
    hrefFn: () => "/galline",
  },
  scorte: {
    label: "Scorte basse",
    icona: "📦",
    color: "#FFE4D0",
    hrefFn: () => "/scorte",
  },
  meteo: {
    label: "Meteo",
    icona: "⛅",
    color: "#D9EEF8",
    hrefFn: () => "/meteo",
  },
  chiusura_pollaio: {
    label: "Chiusura pollaio",
    icona: "🌙",
    color: "#E6E0FF",
    hrefFn: () => "/",
  },
  fine_produzione: {
    label: "Fine produzione",
    icona: "🐔",
    color: "#FFF0D6",
    hrefFn: () => "/galline",
  },
  muta_lunga: {
    label: "Muta lunga",
    icona: "🪶",
    color: "#F0EDE8",
    hrefFn: (riferimentoId: string) => `/galline/${riferimentoId.split("-")[0]}`,
  },
};

export default async function NotifichePage() {
  await requireAdminPollaio();
  const { supabase, user } = await requireUser();

  const { data } = await supabase
    .from("notifiche_inviate")
    .select("id, categoria, riferimento_id, inviata_il, letta_il")
    .eq("user_id", user.id)
    .order("inviata_il", { ascending: false })
    .limit(80);

  const items: NotificaItem[] = (data as unknown as NotificaItem[]) ?? [];
  const unreadCount = items.filter((item) => item.letta_il === null).length;

  return (
    <ScreenContainer
      header={(
        <Header
          title="Notifiche"
          subtitle={
            items.length > 0
              ? unreadCount > 0
                ? `${unreadCount} da leggere · ultimi ${items.length} avvisi`
                : `Ultimi ${items.length} avvisi inviati`
              : "Storico avvisi"
          }
        />
      )}
    >
      {items.length === 0 ? (
        <EmptyState
          icon="🔔"
          title="Nessuna notifica ancora"
          subtitle="Le notifiche inviate appariranno qui."
        />
      ) : (
        <NotificheList items={items} unreadCount={unreadCount} meta={META} />
      )}
    </ScreenContainer>
  );
}
```

- [ ] **Step 3: Verifica typecheck**

Run: `npm run typecheck`
Expected: nessun errore.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/notifiche/NotificheList.tsx app/\(app\)/notifiche/page.tsx
git commit -m "feat(pagination): extract NotificheList client component with pagination"
```

---

## Task 15: Estrarre `InMemoriaList` e paginare

**Files:**
- Create: `app/(app)/galline/in-memoria/InMemoriaList.tsx`
- Modify: `app/(app)/galline/in-memoria/page.tsx`

- [ ] **Step 1: Creare `InMemoriaList.tsx`**

Contenuto completo di `app/(app)/galline/in-memoria/InMemoriaList.tsx`:

```tsx
"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { LoadMoreButton } from "@/components/ui/LoadMoreButton";
import { usePagination } from "@/lib/hooks/usePagination";
import { avatarBgFor, defaultEmojiFor } from "@/lib/utils/avatar";
import { calcolaEta } from "@/lib/utils/eta";
import { trovaRazza } from "@/lib/data/razze";
import { formatDataLunga } from "@/lib/utils/date";

export interface InMemoriaItem {
  id: string;
  nome: string;
  tipo: string;
  razza_id: string | null;
  razza_custom: string | null;
  data_nascita: string | null;
  foto_url: string | null;
  defunta_il: string | null;
  causa_decesso: string | null;
}

export function InMemoriaList({ items }: { items: InMemoriaItem[] }) {
  const { visible, hasMore, remaining, loadMore } = usePagination(items);

  return (
    <>
      <div className="flex flex-col gap-2">
        {visible.map((a) => {
          const tipo = a.tipo as "gallina" | "gallo";
          const razza = trovaRazza(a.razza_id);
          const razzaNome = razza?.nome ?? a.razza_custom ?? "Razza non specificata";
          const vissuta = a.data_nascita && a.defunta_il
            ? calcolaEta(a.data_nascita, new Date(a.defunta_il))
            : null;
          return (
            <Link key={a.id} href={`/galline/${a.id}`} className="block">
              <Card className="flex items-center gap-3">
                <div style={{ filter: "grayscale(0.6)" }}>
                  <Avatar
                    size={52}
                    src={a.foto_url ?? undefined}
                    emoji={!a.foto_url ? defaultEmojiFor(tipo) : undefined}
                    bg={avatarBgFor(a.id)}
                    name={a.nome}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[15px] flex items-center gap-1.5">
                    <span aria-hidden>💔</span>
                    <span className="truncate">{a.nome}</span>
                  </div>
                  <div className="text-xs text-(--text-secondary) truncate">
                    {razzaNome}
                  </div>
                  <div className="text-xs text-(--text-secondary) mt-0.5">
                    {a.defunta_il ? `Defunta ${formatDataLunga(a.defunta_il)}` : ""}
                    {vissuta ? ` · Vissuta ${vissuta}` : ""}
                  </div>
                  {a.causa_decesso && (
                    <div className="text-xs text-(--text-secondary) mt-0.5 italic truncate">
                      {a.causa_decesso}
                    </div>
                  )}
                </div>
                <span className="text-(--text-secondary)" aria-hidden>›</span>
              </Card>
            </Link>
          );
        })}
      </div>
      {hasMore && <LoadMoreButton onClick={loadMore} remaining={remaining} />}
    </>
  );
}
```

- [ ] **Step 2: Sostituire il contenuto di `app/(app)/galline/in-memoria/page.tsx`**

Nuovo contenuto completo:

```tsx
import { requireAdminPollaio } from "@/lib/supabase/queries";
import { Header } from "@/components/ui/Header";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { InMemoriaList, type InMemoriaItem } from "./InMemoriaList";

export const dynamic = "force-dynamic";

export default async function GallineInMemoriaPage() {
  const { supabase, pollaio } = await requireAdminPollaio();

  const { data: animali } = await supabase
    .from("animali")
    .select(
      "id, nome, tipo, razza_id, razza_custom, data_nascita, foto_url, defunta_il, causa_decesso",
    )
    .eq("pollaio_id", pollaio.id)
    .not("defunta_il", "is", null)
    .order("defunta_il", { ascending: false });

  const lista: InMemoriaItem[] = (animali ?? []) as InMemoriaItem[];

  return (
    <ScreenContainer
      header={(
        <Header
          title="In memoria"
          subtitle={`${lista.length} ${lista.length === 1 ? "ricordata" : "ricordate"}`}
        />
      )}
    >
      {lista.length === 0 ? (
        <EmptyState
          icon="🤍"
          title="Nessuna in memoria"
          subtitle="Le galline che hai segnato come defunte appariranno qui, con tutto il loro storico."
        />
      ) : (
        <InMemoriaList items={lista} />
      )}
    </ScreenContainer>
  );
}
```

- [ ] **Step 3: Verifica typecheck**

Run: `npm run typecheck`
Expected: nessun errore.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/galline/in-memoria/InMemoriaList.tsx app/\(app\)/galline/in-memoria/page.tsx
git commit -m "feat(pagination): extract InMemoriaList client component with pagination"
```

---

## Task 16: Estrarre `RegaliList` e paginare

**Files:**
- Create: `app/(app)/rubrica/[id]/RegaliList.tsx`
- Modify: `app/(app)/rubrica/[id]/page.tsx`

- [ ] **Step 1: Creare `RegaliList.tsx`**

Contenuto completo di `app/(app)/rubrica/[id]/RegaliList.tsx`:

```tsx
"use client";

import { Card } from "@/components/ui/Card";
import { LoadMoreButton } from "@/components/ui/LoadMoreButton";
import { usePagination } from "@/lib/hooks/usePagination";
import { formatDataLunga } from "@/lib/utils/date";

export interface RegaloItem {
  id: string;
  quantita: number;
  data: string;
  note: string | null;
}

export function RegaliList({ items }: { items: RegaloItem[] }) {
  const { visible, hasMore, remaining, loadMore } = usePagination(items);

  return (
    <>
      <div className="flex flex-col gap-1.5">
        {visible.map((r) => (
          <Card key={r.id} className="flex items-center gap-3 py-2.5 px-3.5">
            <span className="text-xl">🎁</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">
                {r.quantita} uova
              </div>
              <div className="text-xs text-(--text-secondary)">
                {formatDataLunga(r.data)}
                {r.note ? ` · ${r.note}` : ""}
              </div>
            </div>
          </Card>
        ))}
      </div>
      {hasMore && <LoadMoreButton onClick={loadMore} remaining={remaining} />}
    </>
  );
}
```

- [ ] **Step 2: Modificare `app/(app)/rubrica/[id]/page.tsx`**

In testa al file, aggiungere l'import:

```ts
import { RegaliList, type RegaloItem } from "./RegaliList";
```

Sostituire il blocco di rendering dei regali (riga ~104-128):

```tsx
<SectionTitle>Storico regali</SectionTitle>
{!regali || regali.length === 0 ? (
  <EmptyState
    icon="🎁"
    title="Nessun regalo ancora"
    subtitle="I regali fatti a questa persona appariranno qui."
  />
) : (
  <div className="flex flex-col gap-1.5">
    {regali.map((r) => (
      <Card key={r.id} className="flex items-center gap-3 py-2.5 px-3.5">
        …
      </Card>
    ))}
  </div>
)}
```

con:

```tsx
<SectionTitle>Storico regali</SectionTitle>
{!regali || regali.length === 0 ? (
  <EmptyState
    icon="🎁"
    title="Nessun regalo ancora"
    subtitle="I regali fatti a questa persona appariranno qui."
  />
) : (
  <RegaliList items={(regali ?? []) as RegaloItem[]} />
)}
```

Rimuovere l'import inutilizzato di `Card` se non più referenziato in `page.tsx` (verrà flaggato dal typecheck/lint).

- [ ] **Step 3: Verifica typecheck**

Run: `npm run typecheck`
Expected: nessun errore.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/rubrica/\[id\]/RegaliList.tsx app/\(app\)/rubrica/\[id\]/page.tsx
git commit -m "feat(pagination): extract RegaliList client component with pagination"
```

---

## Task 17: Verifica finale build + checklist manuale

- [ ] **Step 1: Build di produzione**

Run: `npm run build`
Expected: build completa senza errori. Eventuali warning su `Card` inutilizzato in `rubrica/[id]/page.tsx` o simili vanno risolti rimuovendo gli import.

- [ ] **Step 2: Avviare il dev server**

Run: `npm run dev` (in background o in altro terminale)

- [ ] **Step 3: Checklist manuale**

In un account con dati di test (o popolato per la verifica), controllare ciascun scenario:

| Scenario | Cosa verificare |
|---|---|
| Lista corta (<25 elementi) | Nessun bottone "Mostra altri" visibile |
| Lista lunga (>25) | Vedi 25 elementi + bottone "Mostra altri (N rimanenti)" |
| Click "Mostra altri" | Altri 25 si aggiungono in coda, senza salti di scroll |
| Uova Storico ↔ Scorte | Cambio tab → resetta a 25 nel nuovo subset |
| Note: cambio filtro tag | Pagina si resetta a 25 |
| Galline: cambio filtro home-hospital | Reset a 25 |
| Spese: cambio periodo (mese/3 mesi/anno/tutto) | Reset a 25 |
| Uova Scorte: gruppi per data | Caricando altri elementi i gruppi si completano o ne appaiono di nuovi |
| Notifiche: gruppi per data | Idem |
| Notifiche: caricato tutto | Compare il messaggio "Mostriamo solo gli ultimi N avvisi degli ultimi 30 giorni" |
| Uova Scorte: riepilogo 3 colonne (X / Y / Z) | Sempre coerente coi totali, non con i visibili |
| Spese: "Totale spese / Costo per uovo" e "Per categoria" | Sempre coerenti coi totali del periodo |
| Statistiche e grafici (uscite chart, ecc.) | Invariate (usano dataset completo) |

- [ ] **Step 4: (Opzionale) Commit di chiusura**

Se la checklist passa pulita senza ulteriori modifiche, niente da committare. Se ci sono fix minori (es. import inutilizzati), committare in chiusura:

```bash
git add -p
git commit -m "chore(pagination): cleanup unused imports"
```

---

## Note operative

- **Ordine consigliato di esecuzione:** Task 1 e 2 prima (foundation), poi i restanti in qualsiasi ordine — sono indipendenti tra loro. Più senso: prima i task che impattano l'utente (Task 3 = uova, è il caso citato dall'utente).
- **Commit frequenti:** ogni task è autoconsistente e committabile. Niente PR mostro.
- **Niente test automatici** perché il progetto non ne ha (vedi spec §6). La verifica è quella della checklist al Task 17.
- **Naming destrutturato:** quando un componente ha più liste paginate (es. ChickenDetail, Lista spesa), uso prefissi (`muteVisible`, `eventiVisible`, ...) per evitare collisioni e tenere il codice leggibile.
