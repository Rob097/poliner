# Avvisi home — segna come letto (snooze ciclico)

**Data:** 2026-05-25
**Stato:** Approvato — pronto per implementation plan

---

## 1. Problema

La sezione "Avvisi" sulla home page mostra fino a 4 avvisi calcolati a runtime
dalla situazione del pollaio (manutenzioni in ritardo o imminenti, problemi di
salute, uova in scadenza, scorte basse, promemoria <24h). Gli avvisi sono
**derivati** — non c'è una tabella `avvisi` nel DB — quindi finché la condizione
persiste, l'avviso resta visibile e non c'è modo per l'utente di dire "ok l'ho
visto, smetti di mostrarmelo".

## 2. Obiettivo

Aggiungere un pulsante "✓" su ogni avviso che lo **archivia per il ciclo
corrente**. L'avviso resta nascosto fino a quando la situazione sottostante non
si rinnova (es. registri un nuovo intervento di manutenzione, e poi la voce
torna a essere in ritardo nel ciclo successivo).

- Snooze **per-utente** (non per-pollaio): se sei admin condiviso, ogni admin
  segna i propri avvisi indipendentemente.
- Nessun toast, nessuna conferma sul click "✓" — è un'azione frequente e
  reversibile (al ciclo successivo riappare).

## 3. Architettura

### 3.1 Tabella `avvisi_letti`

```sql
create table public.avvisi_letti (
  user_id uuid not null references auth.users(id) on delete cascade,
  pollaio_id uuid not null references public.pollai(id) on delete cascade,
  avviso_key text not null,
  letto_il timestamptz not null default now(),
  primary key (user_id, pollaio_id, avviso_key)
);

create index on public.avvisi_letti(user_id, pollaio_id);

alter table public.avvisi_letti enable row level security;

create policy "avvisi_letti_select_own" on public.avvisi_letti
  for select using (auth.uid() = user_id);

create policy "avvisi_letti_insert_own" on public.avvisi_letti
  for insert with check (auth.uid() = user_id);

create policy "avvisi_letti_delete_own" on public.avvisi_letti
  for delete using (auth.uid() = user_id);
```

Pattern coerente con `notifiche_inviate` (vedi
[20260520192018_add_notification_read_state.sql](../../../supabase/migrations/20260520192018_add_notification_read_state.sql)).

PRIMARY KEY composta su `(user_id, pollaio_id, avviso_key)` per garantire
idempotenza dell'`INSERT` (upsert no-op se la riga esiste già).

### 3.2 `avviso_key` per ogni tipo

Ogni avviso viene identificato da una stringa stabile `<tipo>:<cycle_id>`. Il
cycle_id cambia quando la situazione si rinnova → key nuova → l'avviso riappare
anche se l'utente l'aveva letto.

| Tipo avviso | `avviso_key` | Sorgente del cycle_id |
|---|---|---|
| Manutenzione in ritardo | `manut_ritardo:${voceId}:${ultimoInterventoDate \|\| 'mai'}` | `manutenzioneStati[].ultimoIntervento` (string ISO o null) |
| Manutenzione in scadenza | `manut_imminente:${voceId}:${ultimoInterventoDate \|\| 'mai'}` | idem |
| Gallina con problema salute | `salute:${eventoId}` | `saluteAttivi[].id` (un evento risolto sparisce dalla lista) |
| Uova in scadenza (aggregato) | `uova_scadenza:${hash}` | Hash deterministico delle ID delle uova attualmente in scadenza (sorted-join + djb2-like hash) |
| Scorta bassa | `scorte_basse:${scortaId}:${ultimoRifornimentoDate \|\| 'mai'}` | Data dell'ultima riga in `scorte_rifornimenti` per la scorta (o `'mai'` se nessun rifornimento) |
| Promemoria nota | `promemoria:${notaId}` | `promemoriaImminenti[].id` |

**Note sulla scelta delle key**:

- *Manutenzione*: l'`ultimoInterventoDate` è già esposto nel `StatoVoce`
  ([lib/utils/manutenzione.ts:17](../../../lib/utils/manutenzione.ts#L17)) —
  zero query aggiuntive.
- *Salute*: ogni `eventoSalute` ha un id stabile. Quando viene risolto, sparisce
  dalla lista `saluteAttivi`, quindi non rientra mai nel ciclo "stesso evento".
  Un nuovo problema sarà un nuovo `eventoId`.
- *Uova in scadenza*: è l'unico avviso aggregato. Lo identifichiamo con un hash
  del set di ID uova in scadenza al momento del calcolo. Se l'utente consuma o
  regala un uovo, o se ne deposita uno nuovo che entra in scadenza, il set
  cambia → hash diverso → avviso riappare.
- *Scorte*: serve una query a `scorte_rifornimenti` per ottenere l'ultima
  `data` per ciascuna `scorta_id` (LIMIT 1 + GROUP BY o `MAX(data)`). La query
  è ristretta solo alle scorte attualmente basse (di solito 0-3 elementi).
- *Promemoria*: ogni nota promemoria ha un id stabile. Snooze permanente per
  quella nota — perché un promemoria è discreto (ha una data specifica) e una
  volta passato non si "rinnova".

### 3.3 Flusso server-side

In [lib/queries/home.ts](../../../lib/queries/home.ts), `loadHomeData` esegue
già le query principali in parallelo. Aggiungiamo:

1. **Query `avvisi_letti`** per `(user_id, pollaio_id)` — restituisce un
   `Set<string>` di key lette.
2. **Query "ultimo rifornimento per scorta bassa"** — solo per le scorte
   risultate basse, prendiamo `MAX(data)` da `scorte_rifornimenti`.

Il computo degli avvisi in [app/(app)/page.tsx](../../../app/(app)/page.tsx) viene
arricchito così:

- A ciascun alert si associa una `avviso_key`.
- Prima del `.slice(0, 4)`, si filtra `alerts.filter((a) => !lette.has(a.avviso_key))`.

Pseudocodice:

```ts
const lette: Set<string> = data.avvisiLetti; // Set di avviso_key

const alerts: AlertWithKey[] = [
  ...manutenzioneScaduteAlerts(data),    // ogni alert ha .avviso_key
  ...manutenzioneImminentiAlerts(data),
  ...saluteAlerts(data),
  ...uovaScadenzaAlerts(data),
  ...scorteBasseAlerts(data),
  ...promemoriaAlerts(data),
];

const visibili = alerts.filter((a) => !lette.has(a.avviso_key)).slice(0, 4);
```

### 3.4 Server action

Nuovo file `lib/actions/avvisi.ts`:

```ts
"use server";
import { revalidatePath } from "next/cache";
import { requirePollaio } from "@/lib/supabase/queries";

export async function segnaAvvisoComeLetto(avvisoKey: string): Promise<{ ok: boolean }> {
  const { supabase, user, pollaio } = await requirePollaio();
  const { error } = await supabase
    .from("avvisi_letti")
    .upsert(
      { user_id: user.id, pollaio_id: pollaio.id, avviso_key: avvisoKey },
      { onConflict: "user_id,pollaio_id,avviso_key" },
    );
  if (error) return { ok: false };
  revalidatePath("/");
  return { ok: true };
}
```

### 3.5 UI: refactor di `AlertCard`

[components/ui/AlertCard.tsx](../../../components/ui/AlertCard.tsx) oggi è un
server component renderizzato dentro un `<Link>` con full-area navigation.

Cambiamenti:

- Diventa client component (`"use client"`).
- Riceve `avvisoKey: string` opzionale (legacy callers senza key non vedono il
  ✓; nessuno nel codebase usa AlertCard fuori dalla home, ma manteniamo
  l'optional per pulizia API).
- La card non è più wrappata esternamente in `<Link>` — il wrapping `<Link>`
  diventa interno: il corpo della card (icona + titolo + sottotitolo) è un
  link cliccabile; il pulsante "✓" è separato a destra prima del chevron.
- Click su "✓": chiama `segnaAvvisoComeLetto(avvisoKey)` via `useTransition`,
  niente toast.

Layout target:

```
┌──────────────────────────────────────────────────┐
│ ⚠️  Pulizia in ritardo                  [✓]  ›  │
│      Da 5 giorni                                 │
└──────────────────────────────────────────────────┘
```

Il chevron resta — comunica la cliccabilità del corpo. Il pulsante ✓ usa lo
stesso pattern di [NotificheList.tsx:175-191](../../../app/(app)/notifiche/NotificheList.tsx#L175-L191)
(variante `icon`, primary color).

`AlertCardProps` diventa:

```ts
interface AlertCardProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  color?: string;
  href: string;             // ora required (la card è sempre un link nel use case home)
  avvisoKey?: string;       // opzionale; se presente mostra il ✓
}
```

L'unico chiamante è `app/(app)/page.tsx`, che oggi avvolge l'`AlertCard` in
`<Link>`. Si aggiornano i call site per passare `href` e `avvisoKey` come
prop, rimuovendo il wrap esterno.

### 3.6 Limite max 4 dopo il filtro

`.slice(0, 4)` resta invariato. Ora però viene applicato DOPO il filtro delle
key lette. Se l'utente segna come letto un avviso, e ci sono più di 4 alerts
in coda, ne riappare uno che era nascosto.

## 4. Boundary e contratti

- L'unico modo di marcare un avviso come letto è la server action
  `segnaAvvisoComeLetto`.
- L'unico modo di "annullare" una lettura è il naturale rinnovo del ciclo
  (cycle_id cambia → nuova `avviso_key` → l'avviso non è più presente in
  `avvisi_letti`). NON c'è UI per "annulla snooze".
- La RLS della tabella protegge l'isolamento per-utente: ogni utente vede e
  scrive solo le sue righe.

## 5. Non-obiettivi

- Niente UI "vedi avvisi letti" o "annulla snooze".
- Niente cleanup automatico delle righe vecchie in `avvisi_letti` (volume basso
  per singolo utente; in caso si potrà aggiungere un job futuro).
- Niente notifica push per "avviso ricomparso".
- Niente ordinamento custom o priorità diversa da quella attuale.
- Niente sync cross-utente o cross-device dello snooze (è già automatico via
  DB).

## 6. Test plan

L'app non ha framework di test. Verifica manuale:

1. **Baseline**: nessun avviso letto. Home mostra max 4 avvisi come prima.
2. **Snooze base**: cliccare ✓ su un avviso → l'avviso sparisce
   immediatamente, gli avvisi sottostanti scalano (se erano > 4, ne appare
   uno nuovo). Nessun toast.
3. **Persistenza**: refresh della pagina → l'avviso resta nascosto.
4. **Re-rinnovo manutenzione**: snooze su "Pulizia in ritardo". Registra un
   intervento sulla voce di pulizia. La voce torna "puntuale". Aspetta o
   simula passaggio dei giorni (cambiando `frequenza_giorni`) finché la voce
   torna a "scaduta" o "in_scadenza". L'avviso riappare (nuova key con nuovo
   `ultimoInterventoDate`).
5. **Re-rinnovo scorta**: snooze su "Mais sta finendo". Riempi la scorta
   (rifornisci). La scorta torna sopra soglia → niente avviso. Consuma fino
   a tornare sotto soglia → l'avviso riappare (nuova key con nuovo
   `ultimoRifornimentoDate`).
6. **Re-rinnovo uova**: snooze su "X uova in scadenza". Consuma un uovo che
   era nel set. Refresh → avviso riappare (set di id cambiato → hash
   diverso).
7. **Re-rinnovo salute**: snooze su "Gilda ha un problema". Segna l'evento
   come risolto → avviso sparisce naturalmente (non è più in `saluteAttivi`).
   Crea un nuovo evento salute per Gilda → nuovo eventoId → nuovo avviso.
8. **Cross-utente**: due admin sullo stesso pollaio. Admin A snooza un avviso.
   Admin B continua a vederlo (snooze per-utente).
9. **Click sul corpo della card vs ✓**: cliccare nell'area icona/titolo
   naviga a `href` (come prima). Cliccare solo sul ✓ non naviga, solo
   snooze.

## 7. File coinvolti

- **Migrazione DB**: nuovo file `supabase/migrations/<timestamp>_avvisi_letti.sql`.
- **Server action**: nuovo `lib/actions/avvisi.ts`.
- **Home query**: `lib/queries/home.ts` aggiunge query `avvisi_letti` + query
  ultimo rifornimento per scorte basse; estende `HomeData` con `avvisiLetti:
  Set<string>` e `ultimiRifornimenti: Map<string, string>`.
- **Home page**: `app/(app)/page.tsx` calcola `avviso_key` per ogni alert,
  filtra le lette, passa `avvisoKey` e `href` all'`AlertCard`, rimuove il
  wrap `<Link>` esterno.
- **AlertCard**: `components/ui/AlertCard.tsx` diventa client component con
  link interno + pulsante ✓.
- **Type regen** (se uso `Database` types): rigenerare con
  `npm run supabase:types` dopo la migrazione.
