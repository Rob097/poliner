# Note — Archivia / Elimina più visibili + filtro "Archiviate"

**Data:** 2026-05-25
**Stato:** Approvato — pronto per implementation plan

---

## 1. Problema

Le note hanno già supporto database per archiviazione (colonna `archiviata`) e le server action `archiviaNota` / `deleteNota` esistono. Però:

- Le azioni Archivia/Elimina sono **due piccoli link testuali in fondo al modale di modifica** — poco scopribili. L'utente deve ricordarsi che ci sono.
- **Non c'è alcun modo di vedere le note archiviate**: una volta archiviata, una nota sparisce dalla UI senza possibilità di consultarla o ripristinarla.

## 2. Obiettivo

- Rendere Archivia/Elimina azioni **first-class** sulla card, non nascoste nel modale.
- Aggiungere un **filtro "Archiviate"** che compare solo se esistono note archiviate, permettendo di vederle e ripristinarle.
- Allineare il pattern al resto dell'app — niente nuove convenzioni UI.

## 3. Decisioni di design

### 3.1 Menu "•••" sulla card

Si replica il pattern già usato in [UovaList.tsx:415-468](../../../app/(app)/uova/UovaList.tsx). Il pulsante matita 📝 attuale in alto-destra della card sparisce, sostituito da un pulsante **"•••"**. Toccandolo, in fondo alla card appare una riga di azioni separata da una hairline.

**Vista normale** (note non archiviate): `Modifica · Archivia · Elimina`.

**Vista "Archiviate"**: `Modifica · Ripristina · Elimina`.

Conferma `window.confirm("Eliminare questa nota?")` solo su Elimina (già presente, va mantenuta).

Niente conferma su Archivia o Ripristina — sono reversibili e devono essere fluide.

### 3.2 Filtro chip "Archiviate"

Il tipo `Filtro` (oggi `"tutte" | TagNota`) diventa `"tutte" | TagNota | "archiviate"`.

Posizione del chip: **in coda** alla riga dei chip (dopo i chip dei tag), non subito dopo "Tutte". I tag sono la categorizzazione principale di una nota attiva; "Archiviate" è una vista separata, quindi va lateralmente.

Condizionale: il chip è renderizzato **solo se `archiviati.length > 0`**. Se non hai mai archiviato nulla, l'utente non vede il chip.

### 3.3 Conteggi nei chip

| Chip | Conteggio |
|---|---|
| Tutte | Note **non archiviate** |
| Per-tag (osservazione/idea/promemoria) | Note **non archiviate** con quel tag |
| Archiviate | Note **archiviate** (qualunque tag) |

Semantica: "Tutte" = "tutte le attive", coerente con com'è oggi. Le archiviate sono una vista separata.

### 3.4 Filtraggio della lista

Quando `filtro === "archiviate"` la lista mostra solo `items.filter(n => n.archiviata)`. Altrimenti applica la logica attuale sui non archiviati. La paginazione (15 elementi alla volta, hook `usePagination`) si resetta automaticamente al cambio filtro grazie all'identità del nuovo array passato.

### 3.5 Modale di modifica

I due link "Archivia" e "Elimina" in fondo al `<form>` di [NoteClient.tsx:400-419](../../../app/(app)/note/NoteClient.tsx) vengono **rimossi**. Diventano ridondanti rispetto al menu "•••" sulla card. Il modale resta focalizzato esclusivamente sulla modifica del testo/tag/foto/promemoria.

## 4. Fetching dei dati

[app/(app)/note/page.tsx:24](../../../app/(app)/note/page.tsx) oggi filtra `.eq("archiviata", false)`. Rimuovere quel filtro: la query fetcha **tutte** le note del pollaio. Il client component si occupa della partizione.

L'interfaccia `NotaItem` (definita in `NoteClient.tsx`) aggiunge il campo `archiviata: boolean`. Il mapping in `page.tsx` riempie `archiviata: n.archiviata`.

Volume: anche un pollaio attivo non genera centinaia di note. Non c'è rischio di payload eccessivo.

## 5. Server actions

Nessuna modifica necessaria:

- `archiviaNota(id, archiviata: boolean)` — accetta già il parametro booleano. Archivia con `true`, ripristina con `false`.
- `deleteNota(id)` — invariata.

## 6. Sottotitolo della pagina

Il sottotitolo dell'header `<Header>` oggi è `${items.length} not${items.length === 1 ? "a" : "e"}` dove `items.length` era il count di non archiviate. Dopo la modifica `items` contiene tutto: il sottotitolo deve continuare a riflettere **solo le non archiviate** ("`N note`"), per non confondere l'utente sulla quantità "attiva". Il conteggio si calcola in `page.tsx` prima di passare i dati.

## 7. Boundary e contratti

- `archiviaNota(id, true|false)` è l'unico modo di transizionare. Mai modificare `archiviata` direttamente.
- Il menu "•••" è state locale della card (`useState<boolean>(false)`), come in UovaList. Niente shared state.
- `Filtro` rimane un union type discriminato — il TypeScript garantisce che ogni chip e ogni branch del filtraggio è gestito.

## 8. Non-obiettivi

- Niente swipe actions (non esistono nel codebase).
- Niente bulk select / multi-archive.
- Niente "auto-archivia dopo X giorni" o policy temporali.
- Niente filtro per tag DENTRO la vista archiviate (è una vista flat — se serve in futuro lo si valuta).
- Niente ricerca testuale.

## 9. Test plan

Niente test automatici (l'app non ne ha). Verifica manuale:

1. **Stato baseline**: nessuna nota archiviata → niente chip "Archiviate", baseline invariato.
2. Apri una nota, tocca "•••", verifica che appaia la riga Modifica/Archivia/Elimina.
3. Tocca Archivia → toast "Nota archiviata", nota scompare dalla vista "Tutte", chip "Archiviate (1)" appare.
4. Tocca chip "Archiviate" → vedi solo la nota archiviata. La sua action row ha Modifica/Ripristina/Elimina.
5. Tocca Ripristina → toast, nota torna nella vista "Tutte"; se era l'unica archiviata, chip "Archiviate" sparisce.
6. Conferma confirm dialog su Elimina; cancel → nessuna modifica; OK → nota eliminata dal DB.
7. Paginazione: con > 15 note attive, cambiando filtro la paginazione si resetta a pagina 1.
8. Il modale di modifica NON contiene più i link Archivia/Elimina in fondo.

Su mobile, verificare che il menu "•••" sia ben tappabile con il pollice e che la riga di azioni non rompa il layout.
