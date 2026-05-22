# Scroll & Layout Refactor

## 1. Problema riscontrato

L'app, soprattutto se usata come PWA installata, presenta due sintomi correlati:

1. **Header che "sparisce"** in alcune pagine: la barra in alto con titolo / back / azioni non è visibile.
2. **Scroll che non arriva in fondo**: anche con il `<ScreenContainer>` correttamente padded, l'ultimo contenuto delle pagine resta nascosto dietro il `<TabBar>` e non si riesce a raggiungerlo scrollando.

### Quando si manifesta (info raccolta dall'utente)

- Dopo aver navigato fra pagine (Link o back).
- Dopo che l'app è stata in background e si torna in primo piano.
- Dopo aver aperto/chiuso la tastiera virtuale.
- **Non solo iOS** — anche Android e Safari mobile non installato.
- Una volta rotto, **resta rotto finché non si ricarica la pagina** (o si naviga su una pagina diversa che ricompone il layout).

Questo esclude la pista "rubber-band iOS / overscroll" e indica un problema di **stato del layout che si corrompe su un evento di viewport e non viene mai più ricalcolato correttamente**.

---

## 2. Situazione attuale

### 2.1 Albero del layout

```
<html>                         html { height: 100dvh; overflow: hidden }
  <body>                       body { height: 100dvh; overflow: hidden }
    <div class="app-frame-desktop h-dvh flex justify-center">
      <div class="app-frame">  position: relative; height: 100dvh;
                               padding-top: env(safe-area-inset-top);
                               overflow: hidden; display: flex; flex-direction: column

        {/* AppShell children = page output + chrome */}
        <Header />             sticky top-0 z-20   (FUORI da .screen-scroll)
        <ScreenContainer />    .screen-scroll .pad-tab → flex:1; min-h:0; overflow-y:auto
        <InstallPrompt />      fixed bottom: calc(80px + safe-area-inset-bottom)
        <TabBar />             fixed bottom-0; min-[500px]:absolute
        <FABMenu />            fixed inset-0  (overlay modale, irrilevante)
      </div>
    </div>
  </body>
</html>
```

### 2.2 File coinvolti

- [app/globals.css](app/globals.css) — definizione di `.app-frame`, `.screen-scroll`, `.pad-tab`.
- [app/layout.tsx](app/layout.tsx) — wrapper `.app-frame-desktop` + `.app-frame`.
- [components/layout/AppShell.tsx](components/layout/AppShell.tsx) — composizione children + InstallPrompt + TabBar + FABMenu.
- [components/layout/TabBar.tsx](components/layout/TabBar.tsx) — misurazione JS di `--tab-bar-offset`.
- [components/ui/Header.tsx](components/ui/Header.tsx) — Header sticky.
- [components/ui/ScreenContainer.tsx](components/ui/ScreenContainer.tsx) — wrapper scroll + `pad-tab`.
- [components/ui/PageSkeleton.tsx](components/ui/PageSkeleton.tsx) — skeleton che replica il pattern Header + ScreenContainer.
- Tutte le pagine in [app/(app)/](app/(app)/) (~28 file) usano lo stesso pattern Header + ScreenContainer come sibling.

### 2.3 Catena di dipendenze fragili

L'altezza dello spazio inferiore visibile nelle pagine è governata da una catena di valori derivati:

```
nav.getBoundingClientRect().height
        |
        v
TabBar useEffect (ResizeObserver + visualViewport.resize + window.resize)
        |
        v
document.documentElement.style.setProperty("--tab-bar-offset", `${navHeight + 24}px`)
        |
        v
.pad-tab { padding-bottom: var(--tab-bar-offset, calc(96px + env(safe-area-inset-bottom))) }
        |
        v
spazio sotto l'ultimo elemento di ogni pagina
```

Se uno qualunque di questi step è sbagliato — anche transitoriamente — il valore finale si "cristallizza" sbagliato finché non scatta un nuovo evento di re-misurazione.

---

## 3. Possibili cause

In ordine di sospetto, derivate dall'analisi del codice e dal pattern di trigger riportato dall'utente:

### Causa A — `--tab-bar-offset` cristallizzato a un valore errato

Il valore CSS `--tab-bar-offset` viene impostato in [components/layout/TabBar.tsx:38-43](components/layout/TabBar.tsx#L38-L43) basandosi su `getBoundingClientRect().height` del `<nav>`. Si rifire **solo** se:
- `ResizeObserver` percepisce un cambio di size del `<nav>` stesso.
- Scatta `window.resize`.
- Scatta `visualViewport.resize`.

Scenari problematici:
- Durante l'apertura della tastiera su Android, il visualViewport rimpicciolisce, il listener scatta, ma `getBoundingClientRect()` del TabBar (che è `fixed bottom-0`) può restituire `0` o un valore minimo perché momentaneamente fuori dal visualViewport / nascosto. `--tab-bar-offset` viene scritto a `24px`. Quando la tastiera si chiude, il `<nav>` ritorna alla dimensione precedente — ma **la dimensione non cambia rispetto a "subito prima"**, quindi `ResizeObserver` non fire. Risultato: padding-bottom rimasto a 24px, e il fondo della lista è nascosto dietro il TabBar.
- Durante il ritorno dell'app dal background (mobile browser standalone), il browser può ricalcolare il layout con valori diversi prima che il DOM sia ridisegnato. `getBoundingClientRect()` legge valori transitori.

### Causa B — `<Header sticky top-0>` fuori dal proprio scroll container

L'Header in [components/ui/Header.tsx:19](components/ui/Header.tsx#L19) ha `sticky top-0`, ma è renderizzato come **sibling** di `<ScreenContainer>` (vedi p.es. [app/(app)/page.tsx:132-156](app/(app)/page.tsx#L132-L156)). Il suo contenitore di sticky è quindi `.app-frame`, che non scrolla mai (ha `overflow: hidden`).

Conseguenze:
- `sticky` non sta facendo niente di utile: l'Header è semplicemente il primo flex item.
- Se l'`.app-frame` viene leggermente shiftato in y (per cambi di safe-area / visualViewport), l'Header non ha un meccanismo che lo "riattacca" al top visibile: viene tagliato dal `overflow: hidden` del body.
- Mancando `flex-shrink: 0`, in scenari di sotto-pressure (es. contenuto del flex container che eccede 100dvh perché il calcolo di dvh è transitoriamente sbagliato) l'Header potrebbe perdere altezza.

### Causa C — `position: fixed` ancorato al viewport del browser

Sia `<TabBar>` (`fixed bottom-0`) sia `<InstallPrompt>` (`fixed bottom: calc(80px + …)`) sono ancorati al viewport del browser. Questo li espone a tutti i bug di:
- Differenze fra layoutViewport e visualViewport (tastiera mobile).
- Cambi di `env(safe-area-inset-*)` durante l'ingresso/uscita in standalone mode.
- Off-by-one fra il calcolo di `100dvh` di body/frame e il viewport reale.

Ma in realtà **non c'è bisogno** che siano fixed: `.app-frame` è già esattamente `100dvh` e `position: relative`. Un `absolute bottom-0` rispetto a `.app-frame` è visivamente identico a un `fixed bottom-0`, ma immune a tutti i bug sopra perché non dipende dal viewport del browser.

### Causa D — Mancanza di `overscroll-behavior` su `.screen-scroll`

Quando lo scroll interno a `.screen-scroll` raggiunge inizio o fine, il gesto viene propagato (scroll chaining). Su alcuni browser questo può triggerare resize del visualViewport o "scroll" del body (anche se body ha `overflow: hidden`, esistono fasi di reflow durante il chaining). Questa è probabilmente una causa secondaria, ma è low-cost da fixare e tappa una intera classe di problemi.

### Cause considerate ma scartate

- **Rubber-band iOS / overscroll** — l'utente segnala il bug anche su Android e in Safari non standalone, quindi non è specifico iOS.
- **NavigationOverlay bloccato visibile** — l'utente vede comunque la pagina, quindi l'overlay non è stuck.
- **InstallPrompt che copre l'Header** — `InstallPrompt` ha `bottom: …`, non può coprire l'Header.

---

## 4. Proposta

**Principio guida**: smettere di dipendere dal viewport del browser per qualunque elemento di chrome dell'app. Tutto vive dentro `.app-frame`, che è esattamente `100dvh` ed è già un contenitore self-contained. Lo trattiamo come una mini-finestra, non come "una parte del viewport".

Cambi concettuali:

| Aspetto | Oggi | Dopo |
|---|---|---|
| `<TabBar>` posizionamento | `fixed bottom-0` (su mobile), `absolute bottom-0` (≥500px) | `absolute bottom-0` **sempre** |
| `<InstallPrompt>` posizionamento | `fixed`, `absolute` ≥500px | `absolute` **sempre** |
| `<Header>` posizione | Sibling di `<ScreenContainer>`, `sticky top-0` non funzionante | **Dentro** `<ScreenContainer>` come primo figlio, `sticky top-0` realmente funzionante; oppure fisso sopra `.screen-scroll` come elemento flex con `flex-shrink: 0` |
| `--tab-bar-offset` | Misurazione JS con `ResizeObserver` + listeners | **Rimossa**: `.pad-tab` usa un valore CSS-only basato su safe-area |
| `.screen-scroll` | `overflow-y: auto` | aggiunto `overscroll-behavior: contain` |
| TabBar `useEffect` di misurazione | Esiste | Rimosso |

### Perché funziona

- **TabBar `absolute` dentro `.app-frame`**: `.app-frame` è `position: relative` e `height: 100dvh`. `absolute bottom-0` dà esattamente la stessa apparenza visiva, ma il suo posizionamento è calcolato **rispetto al frame**, non al visualViewport del browser. Niente più jitter con la tastiera, niente più shift in standalone iOS.
- **Header dentro `.screen-scroll`**: il sticky funziona davvero, e l'Header non può sparire perché il `.screen-scroll` ha sempre il proprio top a top di `.app-frame` (sotto la safe area). Anche se il frame venisse shiftato per qualche bug del browser, l'Header resterebbe attaccato al top dello scroll.
- **`--tab-bar-offset` CSS-only**: niente più misurazione JS che può catturare valori transitori sbagliati. Il padding-bottom è statico ma comunque corretto perché lo dimensiono basandomi sull'altezza intrinseca del TabBar (nota a design time) + safe-area + breathing space.

### Pro / contro

**Pro**:
- Elimina due fonti distinte di fragilità (misurazione JS + ancoraggio al viewport).
- Funziona identico su iOS, Android, desktop, browser e PWA installata.
- Codice più semplice: niente `useRef` + `ResizeObserver` + listeners.

**Contro**:
- Richiede di toccare tutte le pagine che hanno `<Header />` + `<ScreenContainer />` come siblings (~28 file).
- Se in futuro il TabBar cambia altezza dinamicamente, il padding statico non si adatta. Mitigabile: l'altezza del TabBar è determinata da contenuto statico (label fisse, icone fisse, FAB di dimensione fissa). Cambiarla è un'azione esplicita di design.

---

## 5. Piano dettagliato di implementazione

Il piano è ordinato in modo che ogni step lasci il codice in stato funzionante; ogni step può essere committato indipendentemente.

### Step 1 — Aggiornare `ScreenContainer` per accettare un Header opzionale

File: [components/ui/ScreenContainer.tsx](components/ui/ScreenContainer.tsx)

- Aggiungere prop `header?: ReactNode`.
- Renderizzare l'header come primo figlio del div `screen-scroll`, con classi `sticky top-0 z-20` + `bg-[var(--bg)]` (per coprire il contenuto che scorre sotto).
- Mantenere backward compatibility: se `header` non è passato, il componente si comporta come oggi.

Pseudocodice:

```tsx
export function ScreenContainer({ header, children, pad = true, className }: Props) {
  return (
    <div className={cn("screen-scroll pad-tab", className)}>
      {header && <div className="sticky top-0 z-20 bg-[var(--bg)]">{header}</div>}
      <div className={cn(pad && "px-4 pt-2")}>{children}</div>
    </div>
  );
}
```

Nota: oggi `pad` applica `px-4 pt-2` al `.screen-scroll` direttamente. Dopo questa change, il padding orizzontale e quello superiore vanno applicati al **contenuto sotto l'header**, non all'header stesso (l'header ha già il proprio padding interno).

### Step 2 — Aggiornare `<Header>` per non avere più `sticky`

File: [components/ui/Header.tsx](components/ui/Header.tsx)

- Rimuovere `sticky top-0 z-20` dalla `cn(...)` del wrapper.
- Lo sticky ora vive sul wrapper messo da `ScreenContainer` (Step 1). Tenere `sticky` anche su Header sarebbe doppio.
- Verificare che il bordo inferiore (`border-b`) sia ancora gestito.

### Step 3 — Migrare le pagine al nuovo API

Per ognuno dei ~28 file in [app/(app)/](app/(app)/) che usano il pattern:

```tsx
return (
  <>
    <Header ... />
    <ScreenContainer> ... </ScreenContainer>
  </>
);
```

Trasformare in:

```tsx
return (
  <ScreenContainer header={<Header ... />}>
    ...
  </ScreenContainer>
);
```

File interessati (lista completa):
- [app/(app)/page.tsx](app/(app)/page.tsx)
- [app/(app)/spese/page.tsx](app/(app)/spese/page.tsx)
- [app/(app)/statistiche/page.tsx](app/(app)/statistiche/page.tsx)
- [app/(app)/statistiche/loading.tsx](app/(app)/statistiche/loading.tsx)
- [app/(app)/meteo/page.tsx](app/(app)/meteo/page.tsx)
- [app/(app)/note/page.tsx](app/(app)/note/page.tsx)
- [app/(app)/scorte/page.tsx](app/(app)/scorte/page.tsx)
- [app/(app)/notifiche/page.tsx](app/(app)/notifiche/page.tsx)
- [app/(app)/galline/page.tsx](app/(app)/galline/page.tsx)
- [app/(app)/galline/in-memoria/page.tsx](app/(app)/galline/in-memoria/page.tsx)
- [app/(app)/galline/[id]/loading.tsx](app/(app)/galline/[id]/loading.tsx)
- [app/(app)/galline/[id]/ChickenDetail.tsx](app/(app)/galline/[id]/ChickenDetail.tsx)
- [app/(app)/galline/[id]/modifica/ModificaGallinaForm.tsx](app/(app)/galline/[id]/modifica/ModificaGallinaForm.tsx)
- [app/(app)/galline/nuova/NuovaGallinaForm.tsx](app/(app)/galline/nuova/NuovaGallinaForm.tsx)
- [app/(app)/lista-spesa/page.tsx](app/(app)/lista-spesa/page.tsx)
- [app/(app)/lista-spesa/ListaSpesaClient.tsx](app/(app)/lista-spesa/ListaSpesaClient.tsx)
- [app/(app)/impostazioni/page.tsx](app/(app)/impostazioni/page.tsx)
- [app/(app)/impostazioni/membri/page.tsx](app/(app)/impostazioni/membri/page.tsx)
- [app/(app)/uscite/page.tsx](app/(app)/uscite/page.tsx)
- [app/(app)/rubrica/page.tsx](app/(app)/rubrica/page.tsx)
- [app/(app)/rubrica/[id]/page.tsx](app/(app)/rubrica/[id]/page.tsx)
- [app/(app)/manutenzione/page.tsx](app/(app)/manutenzione/page.tsx)
- [app/(app)/menu/MenuClient.tsx](app/(app)/menu/MenuClient.tsx)
- [app/(app)/uova/page.tsx](app/(app)/uova/page.tsx)
- [app/(app)/uova/nidi/page.tsx](app/(app)/uova/nidi/page.tsx)
- [app/(app)/uova/nuovo/NuovoUovoForm.tsx](app/(app)/uova/nuovo/NuovoUovoForm.tsx)
- [app/(app)/uova/batch/BatchUovaForm.tsx](app/(app)/uova/batch/BatchUovaForm.tsx)
- [app/(app)/uova/regala/RegalaUovaForm.tsx](app/(app)/uova/regala/RegalaUovaForm.tsx)
- [components/ui/PageSkeleton.tsx](components/ui/PageSkeleton.tsx)

Tipologie di casi da gestire con attenzione:
- Pagine in cui dopo `<Header />` ci sono div con classi specifiche prima del `<ScreenContainer>` (es. pubblico): da rivedere singolarmente.
- Form (`NuovoUovoForm`, `BatchUovaForm`, etc.) che potrebbero avere `<form>` come root: l'`header` va comunque dentro `ScreenContainer`, il form si avvolge attorno al contenuto.

### Step 4 — `<TabBar>` da `fixed` a `absolute`

File: [components/layout/TabBar.tsx](components/layout/TabBar.tsx)

- Cambiare la className: `fixed bottom-0 left-0 right-0 ... min-[500px]:absolute` → `absolute bottom-0 left-0 right-0 ...`.
- Verificare che `.app-frame` abbia `position: relative` (già ce l'ha, vedi [app/globals.css:86](app/globals.css#L86)).
- Rimuovere tutto il blocco `useEffect` che misura `--tab-bar-offset` (righe 33-57 attuali).
- Rimuovere `useRef` e l'import di `useEffect`/`useRef`.

### Step 5 — `<InstallPrompt>` da `fixed` a `absolute`

File: [components/layout/InstallPrompt.tsx](components/layout/InstallPrompt.tsx)

- Cambiare la className: `fixed left-3 right-3 z-40 animate-slide-up min-[500px]:absolute` → `absolute left-3 right-3 z-40 animate-slide-up`.

### Step 6 — `.pad-tab` CSS-only

File: [app/globals.css](app/globals.css)

- Rimuovere la dipendenza da `var(--tab-bar-offset, ...)`.
- Usare un valore basato unicamente su safe-area + altezza nominale del TabBar.

```css
.pad-tab {
  padding-bottom: calc(var(--tab-bar-height) + env(safe-area-inset-bottom, 0px));
}
```

Dove `--tab-bar-height` può essere una costante CSS (es. `80px`) definita in `:root`, in modo che modifiche future siano centralizzate in un punto solo.

In alternativa più semplice: hardcode del valore equivalente all'attuale fallback:

```css
.pad-tab {
  padding-bottom: calc(96px + env(safe-area-inset-bottom, 0px));
}
```

### Step 7 — `overscroll-behavior` su `.screen-scroll`

File: [app/globals.css:111-117](app/globals.css#L111-L117)

```css
.screen-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;        /* nuova riga */
  -webkit-overflow-scrolling: touch;
}
```

### Step 8 — Verifica visiva e funzionale

Per ogni step (in particolare 3, 4, 5) testare:

1. **Mobile portrait (iOS PWA installato)**: header visibile, scroll arriva fino in fondo, ultimo elemento non nascosto dal TabBar.
2. **Mobile portrait (Android PWA installato)**: come sopra.
3. **Mobile portrait (browser non installato)**: come sopra, controllando anche le barre dinamiche del browser.
4. **Desktop (≥500px)**: il frame centrato a 430px deve continuare ad apparire identico, con TabBar attaccata al bordo inferiore del frame.
5. **Trigger riprodotti**:
   - Navigare A → B → back A → controllare header e scroll.
   - Aprire/chiudere tastiera in un form e poi tornare a una pagina lista.
   - Mettere l'app in background, riportarla in foreground.
6. **FABMenu**: aprire/chiudere il menu, verificare che continui a coprire correttamente lo schermo e che il padding di safe-area sia rispettato.
7. **InstallPrompt**: forzandone la visualizzazione in dev, verificare che sia ancorato correttamente sopra il TabBar.

### Step 9 — Cleanup

- Rimuovere il commento `Padding-bottom dinamico per evitare contenuto sotto il TabBar. Usa l'altezza reale del TabBar quando disponibile e mantiene un fallback conservativo durante il primo paint.` in [app/globals.css:121-123](app/globals.css#L121-L123) — non più applicabile.
- Verificare che non ci siano altri riferimenti a `--tab-bar-offset` nel codice (`grep "tab-bar-offset"`).

### Ordine di commit suggerito

1. Step 1 + 2: API di `ScreenContainer` aggiornato e Header senza sticky. (atomico)
2. Step 3: migrazione delle pagine. (commit unico o suddiviso per cartella; tutto il codice resta funzionante perché ScreenContainer è backward compatible)
3. Step 4 + 5 + 6 + 7 + 9: TabBar absolute, InstallPrompt absolute, pad-tab CSS-only, overscroll-behavior, cleanup. (atomico, perché Step 4 elimina la fonte di `--tab-bar-offset` e Step 6 lo sostituisce)

### Cosa NON cambia

- `<FABMenu>` resta `fixed inset-0` perché è un overlay modale che deve coprire tutto lo schermo. È fuori dal flow normale e non dipende dalle stesse fragilità.
- `<NavigationOverlay>` resta `fixed inset-0` per lo stesso motivo.
- `viewport` / `manifest` / safe-area handling in [app/layout.tsx](app/layout.tsx) e [app/manifest.ts](app/manifest.ts) restano invariati.
- Le dimensioni e l'aspetto visivo di Header e TabBar restano gli stessi.
