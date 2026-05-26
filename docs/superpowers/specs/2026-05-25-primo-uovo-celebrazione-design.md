# Festeggiamento "primo uovo di una gallina"

**Data:** 2026-05-25
**Stato:** Approvato — pronto per implementation plan

---

## 1. Problema

Quando una gallina del pollaio depone il suo primo uovo, è un piccolo momento speciale: i poliner ne vanno fieri, vorrebbero "festeggiarlo". Oggi l'esperienza di registrare un uovo è la stessa indipendentemente dal fatto che sia il primo della gallina o l'ennesimo: stesso toast `✓ Ottimo! Uovo registrato 🥚`, stessa navigazione a `/uova`.

## 2. Obiettivo

Mostrare un modale festivo "Primo uovo!" la prima volta che ciascuna gallina compare nella tabella `uova`. Vale sia per il flusso *single egg* ([NuovoUovoForm](../../../app/(app)/uova/nuovo/NuovoUovoForm.tsx)) sia per la *raccolta veloce* ([BatchUovaForm](../../../app/(app)/uova/batch/BatchUovaForm.tsx)).

Se nello stesso batch più galline raggiungono il loro primo uovo, **un unico modale** le elenca tutte.

## 3. Architettura

### 3.1 Detection lato server

Le server action `createUovo` e `createUovaBulk` in [app/(app)/uova/actions.ts](../../../app/(app)/uova/actions.ts) eseguono una **istantanea pre-insert**: per ogni `animale_id` non-null coinvolto, contano le uova esistenti. Se il count è 0, la gallina è candidata a "primo uovo".

Algoritmo (`createUovo`, single):
1. Se `input.animaleId` è non-null, conta uova con `animale_id = input.animaleId`. Se `count === 0`, salva l'id come "primo".
2. Esegui l'insert come oggi.
3. Se c'era un "primo": fetcha `nome` e `foto_url` della gallina; aggiungi alla risposta.

Algoritmo (`createUovaBulk`, batch):
1. Estrai l'insieme degli `animaleId` distinti non-null dal `righe`.
2. Una sola query `select id, animale_id` su `uova` con `.in("animale_id", idsDistinti)` raggruppa quali già esistono. Quelli con count 0 sono candidati.
3. Esegui l'insert bulk come oggi.
4. Per i candidati, una sola query a `animali` per recuperare `nome` e `foto_url`.

Razionale: i count vanno fatti **prima** dell'insert. Dopo l'insert i count sarebbero almeno 1 (la riga appena scritta), distruggendo l'informazione. Una piccola race condition con request concorrenti è accettata (vedi §5).

### 3.2 Risposta arricchita

Tipo `PrimoUovo`:

```ts
export interface PrimoUovo {
  animaleId: string;
  nome: string;
  fotoUrl: string | null;
}
```

Entrambe le action ritornano lo stesso campo opzionale:

```ts
ActionResult & { primeUova?: PrimoUovo[] }
```

Quando vuoto o assente, comportamento invariato. Quando non vuoto, il client mostra il modale.

### 3.3 Componente client `PrimoUovoModal`

Nuovo file: `components/uova/PrimoUovoModal.tsx`.

Riusa il `Modal` esistente ([components/ui/Modal.tsx](../../../components/ui/Modal.tsx)) come bottom-sheet. Riceve `prime: PrimoUovo[]` e `onClose: () => void`. Niente fetch interno, niente state remoto.

Layout testuale (vedi mockup in §4):

- Modal `title` prop: stringa vuota `""`. L'header del bottom-sheet mostra comunque la X di chiusura — la festa vive nel corpo, niente titolo testuale in alto.
- Emoji 🎉 grande, animato con `animate-bounce` (utility Tailwind stock).
- Titolo serif grande, centrato: *"Che giornata speciale!"*.
- Per ciascuna `PrimoUovo`: un blocco orizzontale con Avatar 64px (foto se presente, emoji default 🐔 altrimenti) + testo a destra `<Nome>` (semibold) + sottotitolo `ha fatto il suo primo uovo! 🥚`.
- Pulsante primary fullWidth: *"Festeggiamo! 🎈"* → chiama `onClose()`.

Sfondo del modale: soft gradient pastello via inline style sul container (`linear-gradient(135deg, var(--primary-lighter), #FFE07A22)`).

### 3.4 Integrazione nei form

In entrambi `NuovoUovoForm` e `BatchUovaForm`:

1. State locale `primeUova: PrimoUovo[] | null` (default `null`).
2. Nel callback dopo l'`await createUovo(...)` / `await createUovaBulk(...)` con `res.ok === true`:
   - Se `res.primeUova && res.primeUova.length > 0`: `setPrimeUova(res.primeUova)`. **Non navigare**, **non chiamare `show()`**.
   - Altrimenti: comportamento attuale invariato (`show("✓ Ottimo!…")` + `router.push("/uova")` + `router.refresh()`).
3. Render condizionale del modale: `{primeUova && <PrimoUovoModal prime={primeUova} onClose={handleClose} />}` dove `handleClose` esegue navigazione e refresh:

   ```ts
   function handleClose() {
     router.push("/uova");
     router.refresh();
   }
   ```

4. Il loading overlay esistente (`showLoadingOverlay`/`hideLoadingOverlay`) deve essere **chiuso** anche nel branch "primo uovo" — l'overlay non deve restare visibile dietro al modale.

## 4. Mockup ASCII

Caso 1 gallina:

```
┌─────────────────────────────────────┐
│                              ✕      │
│           🎉                        │
│       (bounce animation)            │
│                                     │
│      Che giornata speciale!         │
│                                     │
│   ┌─────┐                           │
│   │ AVT │  Fiocca                   │
│   │ 64  │  ha fatto il suo          │
│   └─────┘  primo uovo! 🥚           │
│                                     │
│       [Festeggiamo! 🎈]             │
└─────────────────────────────────────┘
```

Caso N galline (batch):

```
┌─────────────────────────────────────┐
│                              ✕      │
│           🎉                        │
│                                     │
│      Che giornata speciale!         │
│                                     │
│   ┌───┐  Fiocca                     │
│   │ A │  primo uovo! 🥚             │
│   └───┘                             │
│   ┌───┐  Bianca                     │
│   │ A │  primo uovo! 🥚             │
│   └───┘                             │
│                                     │
│       [Festeggiamo! 🎈]             │
└─────────────────────────────────────┘
```

## 5. Boundary e contratti

- L'unico path che innesca il modale è la risposta di `createUovo`/`createUovaBulk`. Niente eventi separati, niente notifiche push, niente persistenza di "ho già visto la celebrazione" (non serve: la prima volta che il count passa da 0 a 1 il modale appare; al click successivo per la stessa gallina il count è 1, niente modale).
- `animale_id === null` → niente festeggiamento (la gallina non è identificabile).
- Race condition: due request concorrenti che inseriscono il primo uovo della stessa gallina nello stesso millisecondo vedrebbero entrambe `count === 0`. Entrambe ritornerebbero un `PrimoUovo`. L'app è single-user nella pratica (un poliner alla volta), quindi accettato.
- `PrimoUovoModal` è presentational: stessa interfaccia anche quando il modale viene riusato in futuro per altre celebrazioni (es. centenario di uova).

## 6. Test plan

L'app non ha test automatici. Verifica manuale:

1. **Baseline**: registra un uovo per una gallina che ne ha già almeno uno → comportamento invariato (toast + redirect, niente modale).
2. **Primo uovo single**: aggiungi una nuova gallina via `/galline/nuova`. Vai su `/uova/nuovo`. Seleziona la nuova gallina e registra. Atteso: modale "Che giornata speciale!" con il suo nome e avatar; al click su "Festeggiamo!" navigazione a `/uova`.
3. **Primo uovo batch (1 gallina)**: come sopra, ma via `/uova/batch`, +1 sulla nuova gallina, conferma. Atteso: modale con la nuova gallina; al click navigazione.
4. **Primo uovo batch (2+ galline)**: aggiungi 2 nuove galline. In `/uova/batch`, +1 su entrambe, conferma. Atteso: modale che elenca entrambe.
5. **Mix nel batch**: 1 gallina al primo uovo + altre con uova esistenti. Atteso: modale con solo la prima.
6. **Tutti con uova esistenti nel batch**: niente modale, comportamento invariato.
7. **"Non so" come gallina**: registra con gallina null. Atteso: niente modale (no `animale_id` da celebrare).
8. **Foto avatar**: se la gallina ha `foto_url`, mostrare la foto; altrimenti emoji default 🐔.
9. **Loading overlay**: dopo successo non resta visibile dietro al modale.
10. **Cross-modal X / tap-outside**: chiudere il modale via la X o tap sul backdrop deve navigare ugualmente.

## 7. File coinvolti

- `app/(app)/uova/actions.ts` — `createUovo` e `createUovaBulk` arricchiti con la logica di detection + tipo `PrimoUovo`.
- **Nuovo** `components/uova/PrimoUovoModal.tsx` — componente client per il modale.
- `app/(app)/uova/nuovo/NuovoUovoForm.tsx` — state `primeUova`, render condizionale, branch nel post-submit.
- `app/(app)/uova/batch/BatchUovaForm.tsx` — stesso pattern.

Nessuna migrazione DB. Nessuna nuova dipendenza. Nessuna modifica al `Modal` di base.

## 8. Non-obiettivi

- Niente confetti library / animazione full-screen.
- Niente effetti sonori.
- Niente celebrazioni su edit o delete.
- Niente badge "primo uovo" persistente sulla scheda gallina.
- Niente entry in `notifiche_inviate` o push notification.
- Niente analytics / tracking.
- Niente festeggiamento per `animale_id = null`.
- Niente persistenza di "ho visto questa celebrazione" — sopra-ingegnerizzato. Il count su DB è la fonte di verità.
