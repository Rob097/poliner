# Primo uovo — modale di festeggiamento Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrare un modale festivo "Che giornata speciale!" quando si registra il primo uovo di una gallina, sia dal flusso single ([NuovoUovoForm](../../../app/(app)/uova/nuovo/NuovoUovoForm.tsx)) sia da quello batch ([BatchUovaForm](../../../app/(app)/uova/batch/BatchUovaForm.tsx)).

**Architecture:** Le server action `createUovo`/`createUovaBulk` calcolano una snapshot pre-insert di quali galline coinvolte hanno già almeno un uovo. Ritornano un campo opzionale `primeUova: PrimoUovo[]` con id/nome/foto delle galline che hanno appena raggiunto il loro primo uovo. Lato client, i form aprono un nuovo `PrimoUovoModal` se la lista è non vuota; il modale, quando chiuso, esegue la navigazione a `/uova` come oggi.

**Tech Stack:** Next.js 16 / React 19 / TypeScript / Tailwind 4 / Supabase. Nessuna nuova dipendenza, nessuna migrazione DB. Verifica via typecheck + manuale (l'app non ha test framework).

**Riferimento spec:** [docs/superpowers/specs/2026-05-25-primo-uovo-celebrazione-design.md](../specs/2026-05-25-primo-uovo-celebrazione-design.md).

---

## File Structure

**Nuovi file:**
- `components/uova/PrimoUovoModal.tsx` — modale festivo riusabile.

**File modificati:**
- `app/(app)/uova/actions.ts` — `createUovo` e `createUovaBulk` arricchiti con detection del primo uovo; aggiunge `PrimoUovo` type.
- `app/(app)/uova/nuovo/NuovoUovoForm.tsx` — gestisce il response `primeUova` e mostra il modale.
- `app/(app)/uova/batch/BatchUovaForm.tsx` — stessa logica.

**Convenzioni:**
- Modal base: usare `Modal` esistente con `title=""` (titolo vuoto — il festeggiamento è nel corpo).
- Animazione: `animate-bounce` (già definita in `app/globals.css` come `bounce 0.6s ease`).
- Avatar: usare `Avatar` esistente con `src={fotoUrl ?? undefined}` + fallback `emoji={defaultEmojiFor("gallina")}`.
- Pulsante: `Button` primary fullWidth size="lg".
- Typecheck: `npm run typecheck` deve passare a ogni commit.

---

## Task 1: Server actions — detection del primo uovo

**Files:**
- Modify: `app/(app)/uova/actions.ts`

### Step 1: Aggiungere il tipo `PrimoUovo`

In testa al file `app/(app)/uova/actions.ts`, vicino all'interfaccia `ActionResult` esistente (riga 7-11), aggiungere:

```ts
export interface PrimoUovo {
  animaleId: string;
  nome: string;
  fotoUrl: string | null;
}
```

### Step 2: Estendere `createUovo` con detection + fetch nome/foto

La funzione `createUovo` (righe 74-90) oggi è:

```ts
export async function createUovo(input: NuovoUovoInput): Promise<ActionResult> {
  const { supabase, pollaio } = await requireAdminPollaio();
  const { error } = await supabase.from("uova").insert({
    id: input.id,
    pollaio_id: pollaio.id,
    animale_id: input.animaleId,
    nido_id: input.nidoId,
    data_deposizione: input.dataDeposizione,
    conservazione: input.conservazione,
    note: input.note?.trim() || null,
    foto_url: input.fotoUrl,
  });
  if (error) return { ok: false, error: "Ops, non sono riuscita a registrare l'uovo." };
  revalidatePath("/uova");
  revalidatePath("/");
  return { ok: true, id: input.id };
}
```

Sostituirla con:

```ts
export async function createUovo(
  input: NuovoUovoInput,
): Promise<ActionResult & { primeUova?: PrimoUovo[] }> {
  const { supabase, pollaio } = await requireAdminPollaio();

  // Detection PRE-insert: se la gallina è specificata e non ha uova,
  // è candidata a "primo uovo".
  let isPrimo = false;
  if (input.animaleId) {
    const { count } = await supabase
      .from("uova")
      .select("id", { count: "exact", head: true })
      .eq("animale_id", input.animaleId);
    isPrimo = (count ?? 0) === 0;
  }

  const { error } = await supabase.from("uova").insert({
    id: input.id,
    pollaio_id: pollaio.id,
    animale_id: input.animaleId,
    nido_id: input.nidoId,
    data_deposizione: input.dataDeposizione,
    conservazione: input.conservazione,
    note: input.note?.trim() || null,
    foto_url: input.fotoUrl,
  });
  if (error) return { ok: false, error: "Ops, non sono riuscita a registrare l'uovo." };

  let primeUova: PrimoUovo[] | undefined;
  if (isPrimo && input.animaleId) {
    const { data: gallina } = await supabase
      .from("animali")
      .select("nome, foto_url")
      .eq("id", input.animaleId)
      .maybeSingle();
    if (gallina) {
      primeUova = [
        {
          animaleId: input.animaleId,
          nome: gallina.nome,
          fotoUrl: gallina.foto_url,
        },
      ];
    }
  }

  revalidatePath("/uova");
  revalidatePath("/");
  return { ok: true, id: input.id, primeUova };
}
```

### Step 3: Estendere `createUovaBulk` con detection per gallina

La funzione `createUovaBulk` (righe 110-150) oggi termina con:

```ts
if (rows.length === 0) {
  return { ok: false, error: "Aggiungi almeno un uovo prima di salvare." };
}

const { error } = await supabase.from("uova").insert(rows);
if (error) {
  return { ok: false, error: "Ops, non sono riuscita a registrare le uova." };
}
revalidatePath("/uova");
revalidatePath("/");
return { ok: true, creati: rows.length };
```

Sostituire l'intero blocco da `if (rows.length === 0)` in poi con:

```ts
if (rows.length === 0) {
  return { ok: false, error: "Aggiungi almeno un uovo prima di salvare." };
}

// Detection PRE-insert: trova le galline distinte non-null
// che NON hanno ancora uova nel DB.
const animaleIdsDistinct = Array.from(
  new Set(
    input.righe
      .map((r) => r.animaleId)
      .filter((id): id is string => id !== null),
  ),
);

const animaliConUova = new Set<string>();
if (animaleIdsDistinct.length > 0) {
  const { data: esistenti } = await supabase
    .from("uova")
    .select("animale_id")
    .in("animale_id", animaleIdsDistinct);
  for (const row of esistenti ?? []) {
    if (row.animale_id) animaliConUova.add(row.animale_id);
  }
}
const animaliPrime = animaleIdsDistinct.filter((id) => !animaliConUova.has(id));

const { error } = await supabase.from("uova").insert(rows);
if (error) {
  return { ok: false, error: "Ops, non sono riuscita a registrare le uova." };
}

let primeUova: PrimoUovo[] | undefined;
if (animaliPrime.length > 0) {
  const { data: galline } = await supabase
    .from("animali")
    .select("id, nome, foto_url")
    .in("id", animaliPrime);
  primeUova = (galline ?? []).map((g) => ({
    animaleId: g.id,
    nome: g.nome,
    fotoUrl: g.foto_url,
  }));
}

revalidatePath("/uova");
revalidatePath("/");
return { ok: true, creati: rows.length, primeUova };
```

Aggiornare anche la signature della funzione: il return type ora è
`Promise<ActionResult & { creati?: number; primeUova?: PrimoUovo[] }>`.

Trovare:

```ts
export async function createUovaBulk(
  input: CreaUovaBulkInput,
): Promise<ActionResult & { creati?: number }> {
```

Sostituire con:

```ts
export async function createUovaBulk(
  input: CreaUovaBulkInput,
): Promise<ActionResult & { creati?: number; primeUova?: PrimoUovo[] }> {
```

### Step 4: Typecheck

Run: `npm run typecheck`
Expected: no errors.

### Step 5: Commit

```bash
git add app/\(app\)/uova/actions.ts
git commit -m "feat(uova): detect first-egg per chicken in create actions"
```

---

## Task 2: Componente `PrimoUovoModal`

**Files:**
- Create: `components/uova/PrimoUovoModal.tsx`

### Step 1: Creare il file

Contenuto completo di `components/uova/PrimoUovoModal.tsx`:

```tsx
"use client";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { defaultEmojiFor } from "@/lib/utils/avatar";
import type { PrimoUovo } from "@/app/(app)/uova/actions";

interface Props {
  prime: PrimoUovo[];
  onClose: () => void;
}

export function PrimoUovoModal({ prime, onClose }: Props) {
  return (
    <Modal title="" onClose={onClose}>
      <div
        className="rounded-2xl px-4 py-5 text-center"
        style={{
          background:
            "linear-gradient(135deg, var(--primary-lighter), #FFE07A22)",
        }}
      >
        <div className="text-6xl animate-bounce" aria-hidden>
          🎉
        </div>
        <h2 className="font-serif text-2xl font-bold mt-3 mb-0">
          Che giornata speciale!
        </h2>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {prime.map((p) => (
          <div key={p.animaleId} className="flex items-center gap-3">
            <Avatar
              src={p.fotoUrl ?? undefined}
              emoji={!p.fotoUrl ? defaultEmojiFor("gallina") : undefined}
              name={p.nome}
              size={64}
            />
            <div>
              <div className="font-semibold text-base text-text">{p.nome}</div>
              <div className="text-sm text-(--text-secondary)">
                ha fatto il suo primo uovo! 🥚
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button fullWidth size="lg" className="mt-5" onClick={onClose}>
        Festeggiamo! 🎈
      </Button>
    </Modal>
  );
}
```

Note tecniche:
- `title=""` passato al Modal: l'header del bottom-sheet mostra solo la X di chiusura (il `<h3>` resta vuoto, il layout regge).
- Gradient applicato come `style={{ background: ... }}` (Tailwind 4 non offre utility per gradient con custom CSS variables in modo concise).
- `animate-bounce` (già in `app/globals.css`): scala 1 → 1.15 → 1 in 0.6s ease. Un singolo bounce all'apertura del modale — non infinito.
- `defaultEmojiFor("gallina")` ritorna 🐔 (vedi `lib/utils/avatar.ts`).
- `aria-hidden` sull'emoji decorativa per accessibilità.

### Step 2: Typecheck

Run: `npm run typecheck`
Expected: no errors. Il tipo `PrimoUovo` è disponibile perché è stato esportato in Task 1.

### Step 3: Commit

```bash
git add components/uova/PrimoUovoModal.tsx
git commit -m "feat(uova): add PrimoUovoModal celebration component"
```

---

## Task 3: Integrare il modale in `NuovoUovoForm` (single)

**Files:**
- Modify: `app/(app)/uova/nuovo/NuovoUovoForm.tsx`

### Step 1: Aggiornare import

In testa al file [app/(app)/uova/nuovo/NuovoUovoForm.tsx](../../../app/(app)/uova/nuovo/NuovoUovoForm.tsx), aggiungere agli import esistenti:

```ts
import { PrimoUovoModal } from "@/components/uova/PrimoUovoModal";
import { createUovo, type PrimoUovo } from "../actions";
```

NB: c'è già un import `import { createUovo } from "../actions";` (riga 23). **Sostituirlo** con la riga sopra (combina il nuovo type insieme).

### Step 2: Aggiungere state per il modale

Dentro `NuovoUovoForm`, dopo gli state esistenti (intorno alla riga 61, dopo `const [error, setError] = useState<string | null>(null);`), aggiungere:

```ts
const [primeUova, setPrimeUova] = useState<PrimoUovo[] | null>(null);
```

### Step 3: Aggiornare il branch di successo dell'`onSubmit`

Il blocco corrente (righe 82-88):

```ts
if (!res.ok) {
  setError(res.error ?? "Ops, riprova!");
  return;
}
show("✓ Ottimo! Uovo registrato 🥚");
router.push("/uova");
router.refresh();
```

Sostituire con:

```ts
if (!res.ok) {
  setError(res.error ?? "Ops, riprova!");
  return;
}
if (res.primeUova && res.primeUova.length > 0) {
  setPrimeUova(res.primeUova);
  return;
}
show("✓ Ottimo! Uovo registrato 🥚");
router.push("/uova");
router.refresh();
```

NB: nel ramo "primo uovo" NON si chiama `show()` (no doppio feedback) e NON si naviga subito. Il `finally` (righe 92-95) esegue comunque `setPending(false)` e `hideLoadingOverlay()` — corretto, l'overlay sparisce e resta solo il modale festivo.

### Step 4: Rendere il modale alla fine del JSX

Subito prima della chiusura `</ScreenContainer>` (intorno alla riga 263), aggiungere:

```tsx
{primeUova && (
  <PrimoUovoModal
    prime={primeUova}
    onClose={() => {
      router.push("/uova");
      router.refresh();
    }}
  />
)}
```

### Step 5: Typecheck

Run: `npm run typecheck`
Expected: no errors.

### Step 6: Commit

```bash
git add app/\(app\)/uova/nuovo/NuovoUovoForm.tsx
git commit -m "feat(uova): show PrimoUovoModal in single-egg form on first egg"
```

---

## Task 4: Integrare il modale in `BatchUovaForm`

**Files:**
- Modify: `app/(app)/uova/batch/BatchUovaForm.tsx`

### Step 1: Aggiornare import

In testa al file [app/(app)/uova/batch/BatchUovaForm.tsx](../../../app/(app)/uova/batch/BatchUovaForm.tsx), aggiungere agli import esistenti:

```ts
import { PrimoUovoModal } from "@/components/uova/PrimoUovoModal";
import { createUovaBulk, type PrimoUovo } from "../actions";
```

NB: c'è già un import `import { createUovaBulk } from "../actions";` (riga 21). **Sostituirlo** con la riga sopra (combina il nuovo type).

### Step 2: Aggiungere state

Dentro `BatchUovaForm`, dopo gli state esistenti (es. dopo `const [note, setNote] = useState("");`, intorno alla riga 100), aggiungere:

```ts
const [primeUova, setPrimeUova] = useState<PrimoUovo[] | null>(null);
```

NB: `useState` è già importato (riga 3).

### Step 3: Aggiornare il branch di successo dell'`onSubmit`

Il blocco corrente (intorno alle righe 142-149):

```ts
if (res.ok) {
  show(`✓ ${res.creati} uova registrate 🥚`);
  router.push("/uova");
  router.refresh();
} else {
  show(res.error ?? "Ops, riprova!");
  hideLoadingOverlay();
}
```

Sostituire con:

```ts
if (res.ok) {
  if (res.primeUova && res.primeUova.length > 0) {
    setPrimeUova(res.primeUova);
    hideLoadingOverlay();
    return;
  }
  show(`✓ ${res.creati} uova registrate 🥚`);
  router.push("/uova");
  router.refresh();
} else {
  show(res.error ?? "Ops, riprova!");
  hideLoadingOverlay();
}
```

NB: nel branch "primo uovo" chiamiamo esplicitamente `hideLoadingOverlay()` perché qui non c'è un `finally` che lo faccia (il transition ha gestione propria).

### Step 4: Rendere il modale alla fine del JSX

Trovare la chiusura `</ScreenContainer>` del componente (è la chiusura più esterna del return). Subito prima, aggiungere:

```tsx
{primeUova && (
  <PrimoUovoModal
    prime={primeUova}
    onClose={() => {
      router.push("/uova");
      router.refresh();
    }}
  />
)}
```

### Step 5: Typecheck

Run: `npm run typecheck`
Expected: no errors.

### Step 6: Commit

```bash
git add app/\(app\)/uova/batch/BatchUovaForm.tsx
git commit -m "feat(uova): show PrimoUovoModal in batch form on first egg"
```

---

## Task 5: Verifica finale + checklist manuale

- [ ] **Step 1: Typecheck completo**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 2: Dev server**

Run: `npm run dev` (in background)

- [ ] **Step 3: Checklist manuale**

| # | Scenario | Atteso |
|---|---|---|
| 1 | Gallina con uova esistenti, single | Comportamento invariato: toast + redirect a `/uova`, niente modale. |
| 2 | Gallina nuova (no uova), single | Modale "Che giornata speciale!" con nome e avatar. Click "Festeggiamo!" → redirect a `/uova`. |
| 3 | Gallina nuova, batch +1 | Stesso modale, una gallina elencata. |
| 4 | Due galline nuove, batch +1 +1 | Modale unica che elenca entrambe (in ordine). |
| 5 | Mix nel batch (una nuova + una con uova) | Modale con solo la nuova. |
| 6 | Tutto il batch con galline che hanno uova | Niente modale, comportamento invariato. |
| 7 | "Non so" come gallina (single) | Niente modale. |
| 8 | "Non so" + gallina nuova nel batch | Modale solo per la nuova. La quantità "non so" non genera celebrazioni. |
| 9 | Gallina nuova senza foto | Avatar mostra emoji 🐔 di default. |
| 10 | Gallina nuova con foto | Avatar mostra la foto. |
| 11 | Loading overlay | Dopo il submit non resta visibile dietro al modale. |
| 12 | Chiusura via X o tap-fuori | Naviga ugualmente a `/uova`. |

- [ ] **Step 4: Eventuale fix di chiusura**

Se la checklist passa pulita: nulla da committare. Altrimenti fix puntuale + commit.

---

## Note operative

- **Ordine consigliato:** Task 1 → 2 → 3 → 4 → 5. Task 1 è bloccante (esporta `PrimoUovo` usato dagli altri). Task 2 dipende da Task 1. Task 3 e 4 sono indipendenti tra loro.
- **Niente migrazioni DB**.
- **Niente test automatici** (l'app non ne ha).
- **Race condition** documentata in spec §5: accettata.
- **Performance**: una query extra per batch (`select animale_id` con `.in()`) e una query extra per single (`count` su uova della gallina). Entrambe usano indice `animale_id`. Trascurabili.
