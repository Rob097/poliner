# Paginazione delle liste — Design

**Data:** 2026-05-22
**Stato:** Approvato — pronto per implementation plan

---

## 1. Problema

Diverse pagine dell'app mostrano liste che crescono nel tempo senza limite visibile:
storico uova, spese, note, uscite, manutenzione, eventi salute / trattamenti / mute
nel dettaglio gallina, storico regali per contatto, ecc.

Anche un utente con volumi modesti (es. 5 uova al mese) si ritrova rapidamente con
liste lunghissime di card che rendono la pagina lenta da scorrere e disorientante.
Le notifiche sono già limitate a 80 server-side, ma non c'è nessun pattern uniforme.

L'app è una PWA mobile-first usata da persone non tecniche: serve un meccanismo
semplice, prevedibile e visivamente non invadente.

## 2. Obiettivo

Introdurre un sistema di paginazione uniforme su tutte le liste dell'app:

- **25 elementi alla volta** come pagina iniziale.
- **Bottone "Mostra altri"** sotto la lista per caricare i prossimi 25.
- Comparsa del bottone **solo se la lista supera i 25 elementi** (sotto soglia, zero rumore visivo).
- Comportamento identico ovunque (un solo componente, un solo hook).

Migliorare l'usabilità, non la performance. Le query Supabase restano
invariate: la paginazione è puramente UI sopra dati già caricati.

## 3. Architettura

### 3.1 Approccio: paginazione client-side

Le pagine continuano a fetchare l'intero dataset come oggi. La paginazione è uno
strato UI applicato sull'array già in memoria.

Motivazione: le pagine attuali calcolano riepiloghi e raggruppamenti su tutto il
dataset (es. "X disponibili / Y consumate / Z regalate", "spese per categoria",
"uova in scadenza"). Una paginazione server-side richiederebbe query separate per
stats + lista, duplicando logica. Per i volumi realistici (anche 2000+ uova su
3 anni ≈ ~200 KB di JSON) il payload resta accettabile su mobile.

Se in futuro un utente sfora questa soglia, si potrà migrare a server-side senza
cambiare l'UX (l'interfaccia del bottone "Mostra altri" è la stessa).

### 3.2 Pezzi nuovi riusabili

**`lib/hooks/usePagination.ts`** — hook generico.

```ts
function usePagination<T>(items: T[], pageSize = 25): {
  visible: T[];
  hasMore: boolean;
  remaining: number;
  loadMore: () => void;
  reset: () => void;
};
```

Quando l'array `items` cambia identità (filtro cambiato, dati ricaricati dal
server), si resetta automaticamente alla prima pagina. `loadMore` appende i
prossimi `pageSize` elementi.

Implementazione: state interno `pageCount` (numero di pagine visibili, default 1).
`visible = items.slice(0, pageCount * pageSize)`. `useEffect` su `items` resetta
`pageCount` a 1.

**`components/ui/LoadMoreButton.tsx`** — bottone unico.

Props: `onClick: () => void`, `remaining: number`.

Rendering: `<Button variant="secondary" fullWidth>` con label
`Mostra altri (N rimanenti)`. Margine `mt-3` per distanziarsi dalla lista.

### 3.3 Comportamento UX

| Aspetto | Comportamento |
|---|---|
| Soglia di attivazione | Bottone compare solo se `items.length > 25` |
| Cambio filtro / tab | Reset automatico alla prima pagina (via `useEffect` su `items` nell'hook) |
| Liste raggruppate | Si conta in piatto sugli elementi (non sui gruppi). I gruppi vengono ricostruiti dagli elementi visibili: l'ultimo gruppo della pagina può essere parziale, e caricando altri elementi quel gruppo si completa prima che ne appaiano di nuovi. L'ordine delle voci resta invariato. |
| Statistiche di riepilogo | Calcolate sempre su `items` completo, mai sui visibili |
| Scroll dopo "Mostra altri" | Nessun auto-scroll. I nuovi elementi appaiono sotto, l'utente continua naturalmente. |
| State persistito in URL | No (`?page=2`). Solo state del componente. Coerente con tab e modali dell'app. |
| Stato dopo navigazione | Tornando alla pagina si riparte da 25. Idem per refresh. |

## 4. Liste interessate

Si applica l'hook ovunque ci sia una lista renderizzata con `.map(...)` in stile
"card / riga ripetuta". Il bottone resta nascosto sotto i 25 elementi, quindi
liste piccole non vedono differenze.

### 4.1 Liste che paginano con certezza (crescono nel tempo)

- `app/(app)/uova/UovaList.tsx`
  - Tab **Storico**: lista piatta `uova`.
  - Tab **Scorte**: `grouped` raggruppato per data. Paginazione applicata su
    `disponibili` piatto; il rendering dei gruppi avviene sui visibili. Le card
    di alert ("X uova scadute", "X in scadenza") e il riepilogo a 3 colonne
    restano basati sui totali.
- `app/(app)/spese/SpeseClient.tsx` — `speseFiltrate`. Il riepilogo "Totale spese
  / Costo per uovo" e la sezione "Per categoria" usano il dataset completo.
- `app/(app)/note/NoteClient.tsx` — `filtered`.
- `app/(app)/uscite/UsciteClient.tsx` — `log` (storico in fondo alla pagina).
  Il grafico "Orario medio (ultime 4 settimane)" resta sul dataset completo.
- `app/(app)/manutenzione/ManutenzioneClient.tsx` — `ultimi` (log interventi).
  La sezione "Le mie manutenzioni" (`stati`) e "Consigli" (`consigli`) restano
  non paginate (sono naturalmente corte).
- `app/(app)/galline/[id]/ChickenDetail.tsx`:
  - `trattamenti`
  - `eventiSalute`
  - `periodiMuta` (dentro al `<details>` "Storico mute")
  - `uova`: NON paginata, già limitata a 10 server-side.

### 4.2 Liste server-rendered che richiedono estrazione di un client component

Pagine attualmente pure server. Per aggiungere paginazione bisogna estrarre un
piccolo client component dedicato. Il fetching resta nel server component.

- `app/(app)/rubrica/[id]/page.tsx` → nuovo `app/(app)/rubrica/[id]/RegaliList.tsx`
  client component che riceve `regali` e li renderizza.
- `app/(app)/galline/in-memoria/page.tsx` → nuovo
  `app/(app)/galline/in-memoria/InMemoriaList.tsx`.
- `app/(app)/notifiche/page.tsx` → nuovo `app/(app)/notifiche/NotificheList.tsx`.
  Il raggruppamento per data si ricostruisce sui visibili. Il messaggio finale
  "Mostriamo solo gli ultimi 80 avvisi degli ultimi 30 giorni" appare solo
  quando l'utente ha caricato tutti gli 80.

### 4.3 Liste a cui aggiungo l'hook "per simmetria"

Probabilmente non superano i 25 elementi nella maggior parte degli utenti, ma
applicare l'hook costa praticamente zero (3 righe per componente) e garantisce
comportamento uniforme se in futuro crescono.

- `app/(app)/galline/GallineListClient.tsx` — lista galline filtrata.
- `app/(app)/rubrica/RubricaClient.tsx` — `sorted`.
- `app/(app)/scorte/ScorteClient.tsx` — `items`.
- `app/(app)/lista-spesa/ListaSpesaClient.tsx` — `pending` e `done`, paginati
  separatamente (sono due liste UI distinte).

### 4.4 Liste escluse

- **Statistiche** (`statistiche/page.tsx`): è un dashboard di grafici, non liste.
- **Filtri/chip** (TAGS, filtri galline, suggerimenti): sono UI di controllo, non liste di dati.
- **Suggerimenti / consigli predefiniti** (manutenzione consigli, spese suggerimenti): set fissi piccoli.
- **Stati di manutenzione** (`stati` in ManutenzioneClient): naturalmente corta (una voce per pulizia attiva).

## 5. Boundary e contratti

**`usePagination` è puro client.** Non sa nulla del dominio. Riceve un array,
ritorna uno slice. Si ricicla in ogni lista identicamente.

**`LoadMoreButton` è puro presentational.** Riceve `onClick` e `remaining`.
Non conosce l'hook.

**I client component estratti** (`RegaliList`, `InMemoriaList`, `NotificheList`)
ricevono solo i dati già normalizzati dal server component. Non fanno fetch.
Replicano fedelmente il markup esistente più l'hook + bottone.

## 6. Test plan

L'app non ha test automatici (nessuno trovato nel repo, nessuna dipendenza di
testing in `package.json`). La verifica è manuale e visiva:

1. Su una lista corta (<25), verificare che il bottone NON compaia.
2. Su una lista lunga, verificare che si vedano solo 25 elementi inizialmente
   e che il bottone mostri "(N rimanenti)".
3. Cliccando il bottone, i prossimi 25 si aggiungono sotto senza salti di
   scroll.
4. Cambiando filtro/tab (Note tag, Galline filtro, Uova Scorte/Storico, Spese
   periodo), la paginazione si resetta a 25.
5. Statistiche di riepilogo restano coerenti coi totali, non con i visibili.
6. Liste raggruppate (Uova Scorte, Notifiche): il raggruppamento si ricostruisce
   correttamente man mano che si caricano altri elementi.

Su mobile reale (PWA installata o browser), verificare che il bottone sia
comodamente raggiungibile col pollice e non confondibile con altri bottoni
azione presenti in fondo alla pagina (es. "Aggiungi spesa", "Aggiungi animale").
La `variant="secondary"` lo distingue visivamente dai bottoni primari di azione.

## 7. Non-obiettivi

- Non si fa server-side pagination.
- Non si introduce infinite scroll automatico (richiesta esplicita del prodotto).
- Non si introduce paginazione numerata `1 / 2 / 3 ...`.
- Non si tocca il limite server-side delle notifiche (80, già esistente).
- Non si aggiungono test automatici (l'app non ne ha).
- Non si refactora il fetching dei dati nelle pagine server.
