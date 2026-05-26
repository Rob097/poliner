# Note — Archivia/Elimina + filtro "Archiviate" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Esporre Archivia/Elimina come azioni first-class su ogni nota (menu "•••" sulla card, pattern coerente con `UovaList`), e aggiungere un filtro "Archiviate" condizionale per consultare e ripristinare le note archiviate.

**Architecture:** La query server fetcha tutte le note (compresi archiviati); il client component partiziona internamente. Il filtro `Filtro` viene esteso a `"tutte" | TagNota | "archiviate"`. La `NotaCard` riceve un flag `isArchiveView` che cambia il label "Archivia" → "Ripristina". Le server actions esistenti (`archiviaNota(id, boolean)`, `deleteNota(id)`) non vengono modificate.

**Tech Stack:** Next.js 16 / React 19 / TypeScript / Tailwind 4 / Supabase. Nessun framework di test (verifica via typecheck + manuale).

**Riferimento spec:** [docs/superpowers/specs/2026-05-25-note-archivia-elimina-design.md](../specs/2026-05-25-note-archivia-elimina-design.md).

---

## File Structure

**File modificati:**

- `app/(app)/note/page.tsx` — rimuove il filtro `archiviata=false`, aggiunge `archiviata` al mapping `NotaItem`, calcola conteggio non archiviati per il sottotitolo.
- `app/(app)/note/NoteClient.tsx` — estende il tipo `Filtro`, aggiunge il chip condizionale "Archiviate", aggiorna conteggi, gestisce la vista archiviate, riscrive `NotaCard` con menu "•••" + action row, rimuove i link Archivia/Elimina dal modale.

**Nessun file nuovo. Nessuna modifica a server actions o schema DB.**

**Convenzioni codice:**

- Pattern menu "•••" già usato in [app/(app)/uova/UovaList.tsx:415-489](../../../app/(app)/uova/UovaList.tsx) — replicarlo fedelmente.
- `useTransition` per le action server-side (già usato nel modale esistente).
- `useToast` per il feedback all'utente.
- Comando typecheck: `npm run typecheck`.

---

## Task 1: Fetchare tutte le note + estendere `NotaItem`

**Files:**
- Modify: `app/(app)/note/page.tsx`
- Modify: `app/(app)/note/NoteClient.tsx` (solo l'interfaccia `NotaItem`)

- [ ] **Step 1: Aggiungere `archiviata` a `NotaItem`**

In [app/(app)/note/NoteClient.tsx](../../../app/(app)/note/NoteClient.tsx) (intorno alla riga 28), l'interfaccia `NotaItem` attualmente è:

```ts
export interface NotaItem {
  id: string;
  testo: string;
  data: string;
  tag: TagNota | null;
  fotoUrl: string | null;
  promemoriaData: string | null;
  promemoriaCanale: CanaleNotifica | null;
  promemoriaInviato: boolean;
}
```

Aggiungere il campo `archiviata`:

```ts
export interface NotaItem {
  id: string;
  testo: string;
  data: string;
  tag: TagNota | null;
  fotoUrl: string | null;
  promemoriaData: string | null;
  promemoriaCanale: CanaleNotifica | null;
  promemoriaInviato: boolean;
  archiviata: boolean;
}
```

- [ ] **Step 2: Rimuovere il filtro `archiviata=false` dalla query in `page.tsx`**

In [app/(app)/note/page.tsx](../../../app/(app)/note/page.tsx), il blocco corrente (righe 20-25):

```ts
const { data: note } = await supabase
  .from("note")
  .select("*")
  .eq("pollaio_id", pollaio.id)
  .eq("archiviata", false)
  .order("data", { ascending: false });
```

Diventa (rimuovere SOLO la riga `.eq("archiviata", false)`):

```ts
const { data: note } = await supabase
  .from("note")
  .select("*")
  .eq("pollaio_id", pollaio.id)
  .order("data", { ascending: false });
```

- [ ] **Step 3: Aggiornare il mapping di `items` per includere `archiviata`**

Nello stesso file, il mapping (righe 27-36):

```ts
const items: NotaItem[] = (note ?? []).map((n) => ({
  id: n.id,
  testo: n.testo,
  data: n.data,
  tag: n.tag as NotaItem["tag"],
  fotoUrl: n.foto_url,
  promemoriaData: n.promemoria_data,
  promemoriaCanale: n.promemoria_canale as NotaItem["promemoriaCanale"],
  promemoriaInviato: n.promemoria_inviato,
}));
```

Diventa:

```ts
const items: NotaItem[] = (note ?? []).map((n) => ({
  id: n.id,
  testo: n.testo,
  data: n.data,
  tag: n.tag as NotaItem["tag"],
  fotoUrl: n.foto_url,
  promemoriaData: n.promemoria_data,
  promemoriaCanale: n.promemoria_canale as NotaItem["promemoriaCanale"],
  promemoriaInviato: n.promemoria_inviato,
  archiviata: !!n.archiviata,
}));
```

- [ ] **Step 4: Aggiornare il sottotitolo dell'header per contare solo i non archiviati**

Nello stesso file, il blocco header (righe 40-50):

```tsx
<Header
  title="Note e promemoria"
  subtitle={
    items.length === 0
      ? "Appunta tutto quello che ti viene in mente"
      : `${items.length} not${items.length === 1 ? "a" : "e"}`
  }
/>
```

Diventa (calcolare un conteggio dei non archiviati e usarlo per il sottotitolo, in modo che la cifra resti significativa per l'utente):

```tsx
<Header
  title="Note e promemoria"
  subtitle={(() => {
    const attive = items.filter((n) => !n.archiviata).length;
    if (items.length === 0) return "Appunta tutto quello che ti viene in mente";
    return `${attive} not${attive === 1 ? "a" : "e"}`;
  })()}
/>
```

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/\(app\)/note/page.tsx app/\(app\)/note/NoteClient.tsx
git commit -m "feat(note): fetch all notes and add archiviata to NotaItem"
```

---

## Task 2: Estendere il filtro nel `NoteClient` + chip "Archiviate"

**Files:**
- Modify: `app/(app)/note/NoteClient.tsx` (solo il corpo del componente `NoteClient`)

- [ ] **Step 1: Estendere il tipo del filtro**

Nel file `app/(app)/note/NoteClient.tsx`, intorno alla riga 53, dichiarare un nuovo type union sopra al componente `NoteClient`:

```ts
type Filtro = "tutte" | TagNota | "archiviate";
```

Aggiornare la `useState` del filtro (riga 53):

```ts
const [filtro, setFiltro] = useState<TagNota | "tutte">("tutte");
```

In:

```ts
const [filtro, setFiltro] = useState<Filtro>("tutte");
```

- [ ] **Step 2: Calcolare le partizioni `nonArchiviati` e `archiviati`**

Subito sopra al `const filtered = useMemo(...)` esistente (riga 60), aggiungere:

```ts
const nonArchiviati = useMemo(
  () => items.filter((n) => !n.archiviata),
  [items],
);
const archiviati = useMemo(
  () => items.filter((n) => n.archiviata),
  [items],
);
```

- [ ] **Step 3: Aggiornare la logica `filtered`**

Sostituire il `filtered` corrente:

```ts
const filtered = useMemo(
  () => (filtro === "tutte" ? items : items.filter((n) => n.tag === filtro)),
  [items, filtro],
);
```

con:

```ts
const filtered = useMemo(() => {
  if (filtro === "archiviate") return archiviati;
  if (filtro === "tutte") return nonArchiviati;
  return nonArchiviati.filter((n) => n.tag === filtro);
}, [filtro, nonArchiviati, archiviati]);
```

- [ ] **Step 4: Auto-switch quando l'ultima archiviata viene ripristinata**

Subito dopo il blocco `filtered`, aggiungere:

```ts
useEffect(() => {
  if (filtro === "archiviate" && archiviati.length === 0) {
    setFiltro("tutte");
  }
}, [filtro, archiviati.length]);
```

NB: `useEffect` è già importato in cima al file.

- [ ] **Step 5: Aggiornare i chip conteggi (uso `nonArchiviati`) + aggiungere il chip "Archiviate"**

Il blocco JSX dei chip (righe 69-86):

```tsx
<div className="flex gap-1.5 overflow-x-auto pb-2 -mx-4 px-4">
  <FiltroChip active={filtro === "tutte"} onClick={() => setFiltro("tutte")}>
    Tutte ({items.length})
  </FiltroChip>
  {TAGS.map((t) => {
    const count = items.filter((n) => n.tag === t.value).length;
    if (count === 0) return null;
    return (
      <FiltroChip
        key={t.value}
        active={filtro === t.value}
        onClick={() => setFiltro(t.value)}
      >
        {t.icon} {t.label} ({count})
      </FiltroChip>
    );
  })}
</div>
```

Diventa:

```tsx
<div className="flex gap-1.5 overflow-x-auto pb-2 -mx-4 px-4">
  <FiltroChip active={filtro === "tutte"} onClick={() => setFiltro("tutte")}>
    Tutte ({nonArchiviati.length})
  </FiltroChip>
  {TAGS.map((t) => {
    const count = nonArchiviati.filter((n) => n.tag === t.value).length;
    if (count === 0) return null;
    return (
      <FiltroChip
        key={t.value}
        active={filtro === t.value}
        onClick={() => setFiltro(t.value)}
      >
        {t.icon} {t.label} ({count})
      </FiltroChip>
    );
  })}
  {archiviati.length > 0 && (
    <FiltroChip
      active={filtro === "archiviate"}
      onClick={() => setFiltro("archiviate")}
    >
      🗄️ Archiviate ({archiviati.length})
    </FiltroChip>
  )}
</div>
```

- [ ] **Step 6: Passare `isArchiveView` a ogni `NotaCard`**

Trovare il rendering della lista (intorno alla riga 102):

```tsx
<div className="flex flex-col gap-2">
  {visible.map((n) => (
    <NotaCard key={n.id} nota={n} onEdit={() => setEditing(n)} />
  ))}
</div>
```

Sostituire con (calcolare `isArchiveView` una volta sopra al return, oppure inline come fatto qui):

```tsx
<div className="flex flex-col gap-2">
  {visible.map((n) => (
    <NotaCard
      key={n.id}
      nota={n}
      onEdit={() => setEditing(n)}
      isArchiveView={filtro === "archiviate"}
    />
  ))}
</div>
```

- [ ] **Step 7: Aggiornare l'empty-state**

L'empty-state corrente (righe 88-99):

```tsx
{filtered.length === 0 ? (
  <EmptyState
    icon="📝"
    title={items.length === 0 ? "Nessuna nota ancora" : "Nessuna nota in questa categoria"}
    subtitle={
      items.length === 0
        ? "Appunta osservazioni, idee, promemoria... tutto resta qui."
        : undefined
    }
    action={items.length === 0 ? "Scrivi la prima nota" : undefined}
    onAction={() => setCreating(true)}
  />
)
```

Va modificato per riferirsi a `nonArchiviati.length` (le "note attive") invece di `items.length` (che ora include anche archiviate):

```tsx
{filtered.length === 0 ? (
  <EmptyState
    icon="📝"
    title={nonArchiviati.length === 0 ? "Nessuna nota ancora" : "Nessuna nota in questa categoria"}
    subtitle={
      nonArchiviati.length === 0
        ? "Appunta osservazioni, idee, promemoria... tutto resta qui."
        : undefined
    }
    action={nonArchiviati.length === 0 ? "Scrivi la prima nota" : undefined}
    onAction={() => setCreating(true)}
  />
)
```

- [ ] **Step 8: Typecheck (atteso che fallisca su `NotaCard` props)**

Run: `npm run typecheck`
Expected: errore in `NotaCard` perché stiamo passando `isArchiveView` ma il componente non lo accetta ancora. È atteso — verrà risolto in Task 3. Procedere comunque al commit (è un commit incrementale, il typecheck verde arriverà col task successivo).

Se preferisci avere typecheck verde tra Task 2 e Task 3, puoi anticipare l'aggiunta della prop `isArchiveView?: boolean` (ignorata) alla firma di `NotaCard` qui, e implementare la logica vera in Task 3.

- [ ] **Step 9: Commit**

```bash
git add app/\(app\)/note/NoteClient.tsx
git commit -m "feat(note): extend filtro with 'archiviate' chip and counts"
```

---

## Task 3: `NotaCard` con menu "•••" + action row

**Files:**
- Modify: `app/(app)/note/NoteClient.tsx` (la funzione `NotaCard` e relative dipendenze)

- [ ] **Step 1: Sostituire la firma di `NotaCard`**

La signature corrente (riga 150):

```tsx
function NotaCard({ nota, onEdit }: { nota: NotaItem; onEdit: () => void }) {
```

Diventa:

```tsx
function NotaCard({
  nota,
  onEdit,
  isArchiveView,
}: {
  nota: NotaItem;
  onEdit: () => void;
  isArchiveView: boolean;
}) {
```

- [ ] **Step 2: Aggiungere state + handler dentro `NotaCard`**

Sotto la signature, prima del `const tag = TAGS.find(...)` (riga 151), aggiungere:

```tsx
const { show } = useToast();
const [pending, startTransition] = useTransition();
const [open, setOpen] = useState(false);

function onArchive() {
  startTransition(async () => {
    const res = await archiviaNota(nota.id, true);
    if (res.ok) show("Nota archiviata");
    else show(res.error ?? "Ops, riprova!");
  });
}

function onRestore() {
  startTransition(async () => {
    const res = await archiviaNota(nota.id, false);
    if (res.ok) show("Nota ripristinata");
    else show(res.error ?? "Ops, riprova!");
  });
}

function onDelete() {
  if (!window.confirm("Eliminare questa nota?")) return;
  startTransition(async () => {
    const res = await deleteNota(nota.id);
    if (res.ok) show("Nota eliminata");
    else show(res.error ?? "Ops, riprova!");
  });
}
```

NB: `useToast`, `useTransition`, `useState`, `archiviaNota`, `deleteNota` sono già importati in cima al file — non aggiungere import.

- [ ] **Step 3: Sostituire la matita con il pulsante "•••"**

Il blocco corrente (righe 162-174) renderizza il blocco header della card con la matita di modifica:

```tsx
<div className="flex items-center gap-2">
  <span className="text-xs text-(--text-secondary)">
    {formatData(nota.data)}
  </span>
  <button
    type="button"
    onClick={onEdit}
    className="text-(--text-secondary)"
    aria-label="Modifica"
  >
    <IconEdit size={14} />
  </button>
</div>
```

Diventa (la matita sparisce, sostituita dal toggle "•••"):

```tsx
<div className="flex items-center gap-2">
  <span className="text-xs text-(--text-secondary)">
    {formatData(nota.data)}
  </span>
  <button
    type="button"
    onClick={() => setOpen((o) => !o)}
    className="text-xs text-(--text-secondary) underline-offset-2"
    aria-label="Apri azioni"
  >
    {open ? "✕" : "•••"}
  </button>
</div>
```

NB: l'import `IconEdit` resta usato dal `NotaFormModal` (verrà rimosso in Task 4), non rimuoverlo ora.

- [ ] **Step 4: Aggiungere la action row in fondo alla card**

La `Card` corrente termina così (intorno a righe 200-204):

```tsx
      {nota.promemoriaData && (
        <div … >
          …
        </div>
      )}
    </Card>
  );
}
```

Aggiungere il blocco condizionale `{open && ...}` SUBITO PRIMA della chiusura `</Card>`:

```tsx
      {nota.promemoriaData && (
        <div … >
          …
        </div>
      )}

      {open && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-(--border) mt-2">
          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            disabled={pending}
            className="text-xs px-3 py-2"
          >
            ✏️ Modifica
          </Button>
          {isArchiveView ? (
            <Button
              variant="secondary"
              size="md"
              onClick={onRestore}
              disabled={pending}
              className="text-xs px-3 py-2"
            >
              ↩️ Ripristina
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="md"
              onClick={onArchive}
              disabled={pending}
              className="text-xs px-3 py-2"
            >
              🗄️ Archivia
            </Button>
          )}
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="text-xs text-[#c0435a] font-semibold ml-auto"
          >
            Elimina
          </button>
        </div>
      )}
    </Card>
  );
}
```

Il pattern (riga con `border-t`, `Button variant="secondary" size="md"` per le azioni positive, `<button type="button">` con `text-[#c0435a]` per Elimina, `ml-auto` per spingere Elimina a destra) è preso identicamente da [UovaList.tsx:445-489](../../../app/(app)/uova/UovaList.tsx) per consistenza visiva.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no errors. Anche l'errore residuo da Task 2 (la prop `isArchiveView`) ora è risolto.

- [ ] **Step 6: Commit**

```bash
git add app/\(app\)/note/NoteClient.tsx
git commit -m "feat(note): replace edit-icon with ••• action menu on NotaCard"
```

---

## Task 4: Pulire il modale `NotaFormModal`

**Files:**
- Modify: `app/(app)/note/NoteClient.tsx` (solo `NotaFormModal`)

I link Archivia/Elimina in fondo al modale sono ora ridondanti rispetto al menu "•••". Si rimuovono insieme ai loro handler.

- [ ] **Step 1: Rimuovere `onDelete` e `onArchive` dentro `NotaFormModal`**

Trovare nel modale (intorno alle righe 274-295) le due funzioni:

```tsx
function onDelete() {
  if (!initial) return;
  if (!window.confirm("Eliminare questa nota?")) return;
  startTransition(async () => {
    const res = await deleteNota(initial.id);
    if (res.ok) {
      show("Nota eliminata");
      onClose();
    } else show("Ops, riprova!");
  });
}

function onArchive() {
  if (!initial) return;
  startTransition(async () => {
    const res = await archiviaNota(initial.id, true);
    if (res.ok) {
      show("Nota archiviata");
      onClose();
    } else show("Ops, riprova!");
  });
}
```

**Rimuovere entrambe le funzioni**, lasciando intatto `onSubmit` sopra di esse.

- [ ] **Step 2: Rimuovere il blocco di link Archivia/Elimina dal JSX del modale**

In fondo al `<form>` del modale (intorno alle righe 400-419) c'è questo blocco:

```tsx
{mode === "edit" && (
  <div className="flex gap-3 justify-center mt-3">
    <button
      type="button"
      onClick={onArchive}
      disabled={pending}
      className="text-xs text-(--text-secondary) py-2"
    >
      Archivia
    </button>
    <button
      type="button"
      onClick={onDelete}
      disabled={pending}
      className="text-xs text-[#c0435a] font-semibold py-2"
    >
      Elimina
    </button>
  </div>
)}
```

**Rimuovere l'intero blocco.** Il `<Button type="submit">` "Salva nota" / "Salva modifiche" subito sopra resta invariato.

- [ ] **Step 3: Typecheck (controlla import inutilizzati)**

Run: `npm run typecheck`
Expected: no errors. `archiviaNota` e `deleteNota` sono ancora importati in cima al file ma vengono usati dal `NotaCard` (Task 3), quindi gli import NON vanno rimossi.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/note/NoteClient.tsx
git commit -m "refactor(note): remove redundant archive/delete links from NotaFormModal"
```

---

## Task 5: Verifica finale + checklist manuale

- [ ] **Step 1: Typecheck completo**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 2: Avviare il dev server**

Run: `npm run dev` (in background)

- [ ] **Step 3: Checklist manuale**

| # | Scenario | Atteso |
|---|---|---|
| 1 | Baseline — nessuna nota archiviata | Niente chip "Archiviate". Comportamento identico a prima. |
| 2 | Apri una nota, tocca "•••" | Appare la riga `Modifica · Archivia · Elimina` |
| 3 | Tocca Archivia | Toast "Nota archiviata". La nota sparisce dalla vista "Tutte". Compare il chip "Archiviate (1)" in coda alla riga chip. |
| 4 | Tocca il chip "Archiviate" | Vedi solo la nota archiviata. Il suo "•••" rivela `Modifica · Ripristina · Elimina` |
| 5 | Tocca Ripristina | Toast. La nota torna in "Tutte". Se era l'unica, il chip "Archiviate" sparisce e il filtro auto-passa a "Tutte". |
| 6 | Tocca Elimina | `confirm("Eliminare questa nota?")`. Cancel → nessuna modifica. OK → nota cancellata dal DB. |
| 7 | Sottotitolo header | Mostra il conteggio delle note **non archiviate** ("`N note`"), non delle totali. |
| 8 | Modale di modifica | NON contiene più i link Archivia/Elimina in fondo. Solo "Salva modifiche". |
| 9 | Paginazione + cambio filtro | Con > 15 note attive: cambiando filtro tag o Archiviate, la paginazione si resetta a pagina 1. |
| 10 | Conteggi chip | "Tutte (N)" e per-tag contano **solo** le non archiviate. "Archiviate (M)" conta gli archiviati. |

- [ ] **Step 4: (Opzionale) commit di chiusura**

Se la checklist passa pulita: nulla da committare. Altrimenti fix puntuali e commit.

---

## Note operative

- **Ordine consigliato:** Task 1 → 2 → 3 → 4 → 5. I task 2 e 3 sono accoppiati (Task 2 introduce una prop `isArchiveView` consumata da Task 3); se vuoi typecheck verde tra i due, vedi la nota nello Step 8 di Task 2.
- **Niente test automatici** — questo repo non ha test (vedi spec §9).
- **Niente modifiche al DB o alle server actions** — `archiviaNota` accetta già il booleano per ripristinare.
