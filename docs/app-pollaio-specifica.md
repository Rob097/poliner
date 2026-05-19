# Poliner — Specifica di Prodotto
**Versione:** 0.3 — Nuove feature: deposizione nidi, età produttiva, foto uova, uscite, trattamenti, muta, costi, meteo storico, stagionalità  
**Stato:** Bozza  
**Ultima modifica:** Maggio 2026

---

## 1. Il Problema e la Visione

Chi gestisce un piccolo pollaio domestico si ritrova a fare tutto a memoria o su foglietti volanti: quando è stata pulita la casetta, quante uova ci sono in frigo, se una gallina sta male, a chi ha regalato le uova la settimana scorsa. Non esiste nessuna app semplice, bella e pensata per chi gestisce un pollaio per passione (non per lavoro), e soprattutto non esiste nulla in italiano progettato per una persona non tecnica.

L'obiettivo è creare una **Progressive Web App (PWA)** privata, in italiano, esteticamente curata (toni pastello, linguaggio caldo e amichevole) che diventi la memoria digitale del pollaio. Funziona su qualsiasi dispositivo tramite browser (smartphone, tablet, computer), può essere installata sulla home screen come se fosse un'app nativa, e non richiede né App Store né Play Store. Tutto in un posto solo, sempre a portata di mano.

---

## 2. Nome dell'App

**Nome definitivo: Poliner**

Il nome è scelto. Breve, originale, facile da ricordare e da pronunciare. Non è un termine comune, il che lo rende unico e brandizzabile. Si legge chiaramente anche su un'icona piccola.

**Nota per il designer:** il logotipo deve funzionare sia come favicon browser (16×16px) che come icona installabile PWA (192×192px e 512×512px). Valutare una piccola icona grafica abbinata al testo (es. silhouetta gallina stilizzata o uovo).

---

## 3. Utenti Target

L'app è pensata per **uso privato** da parte di una o poche persone che gestiscono un pollaio domestico. Non è uno strumento professionale per allevatori.

**Profilo utente primario:** donna adulta, non tecnica, usa lo smartphone quotidianamente per social e messaggi, non ha familiarità con app complesse. Accede a Poliner principalmente da smartphone tramite browser o dalla home screen dopo installazione PWA. Vuole qualcosa di carino, intuitivo e in italiano.

**Requisiti UX derivanti da questo profilo:**
- Nessun termine tecnico senza spiegazione
- Azioni principali raggiungibili in massimo 2 tap dalla home
- Linguaggio caldo, informale, in prima persona (es. "Le tue galline" non "Gestione animali")
- Conferme e feedback visivi chiari dopo ogni azione (es. "✓ Uovo aggiunto!")
- Nessun modulo con tanti campi obbligatori — tutto progressivo e opzionale

---

## 4. Accesso e Profilo

### 4.1 Registrazione e Login
- L'app è **privata**: richiede registrazione con email e password
- Login con email + password
- Possibile aggiungere autenticazione con Apple ID / Google (opzionale, fase 2)
- Reset password via email
- Sessione persistente (non si deve fare login ogni volta)

### 4.2 Profilo Utente
- Nome e foto profilo
- Email (modificabile)
- Password (modificabile)
- Preferenze notifiche globali (on/off per tipo)
- Lingua: italiano (unica lingua per ora)

---

## 5. Il Pollaio

### 5.1 Creazione del pollaio
Al primo accesso, un flusso guidato (onboarding) aiuta l'utente a:
1. Dare un nome al pollaio (es. "Il Pollaio di Fiocca")
2. Impostare la posizione (tramite API Geolocalizzazione del browser, modificabile manualmente)
3. Aggiungere una foto del pollaio (opzionale)

La posizione serve per il meteo. Viene rilevata automaticamente tramite la Geolocation API del browser (funziona sia da smartphone che da desktop) e può essere modificata in qualsiasi momento dalle impostazioni. L'utente può anche inserirla manualmente con nome città.

### 5.2 Un solo pollaio per account
Per ora l'app gestisce un singolo pollaio per utente. L'architettura deve però permettere l'espansione a più pollai in futuro senza refactoring pesante.

### 5.3 Dashboard del pollaio (Home)
La schermata principale mostra:
- Nome del pollaio e posizione
- Meteo attuale e previsioni prossime 48h (widget compatto)
- Alert attivi (pulizie in scadenza, uova in scadenza, animali con problemi di salute)
- Numero di uova disponibili oggi
- Accesso rapido alle azioni più usate: "Aggiungi uovo", "Segnala pulizia", "Nota rapida"

---

## 6. Le Galline (e il Gallo)

### 6.1 Censimento animali
Ogni animale ha una scheda con:

**Campi base (obbligatori):**
- Nome
- Tipo: gallina / gallo
- Razza (scelta da lista + voce "Altra razza" con campo libero)
- Data di nascita o età approssimativa

**Campi aggiuntivi (opzionali):**
- Foto (da fotocamera o galleria)
- Colore del piumaggio (campo libero + palette colori predefinita)
- Note libere sulla singola gallina

### 6.2 Dati automatici per razza
Quando si seleziona una razza dalla lista, l'app precompila automaticamente alcune informazioni tipiche di quella razza:

- Produzione media di uova (uova/anno indicative)
- Temperamento (es. "docile", "vivace", "diffidente")
- Taglia (piccola / media / grande)
- Colore tipico delle uova (bianche, marroni, crema, blu-verdi per Araucana, ecc.)
- Note caratteristiche della razza

**Razze da supportare al lancio** (elenco espandibile tramite aggiornamenti):

*Razze italiane*
| Razza | Uova/anno | Colore uova | Taglia | Temperamento |
|---|---|---|---|---|
| Livornese (Leghorn) | 280–320 | Bianche | Media | Vivace, indipendente |
| Ancona | 180–250 | Bianche | Media | Rustica, attiva |
| Padovana | 150–180 | Bianche | Media | Ornamentale, ciuffo, docile |
| Polverara | 130–160 | Bianche | Media | Ornamentale, ciuffo |
| Siciliana | 150–200 | Bianche | Piccola-media | Rustica, resistente al caldo |
| Mugellese | 120–150 | Crema | Media | Rara, rustica |
| Modenese | 130–160 | Bianche | Media | Rara, robusta |
| Romagnola | 150–180 | Bianche | Media | Rustica, autonoma |
| Valdarno | 140–170 | Bianche | Media | Rara, rustica |
| Tirolese | 120–150 | Crema | Grande | Rara, resistente al freddo |

*Razze internazionali diffuse in Italia*
| Razza | Uova/anno | Colore uova | Taglia | Temperamento |
|---|---|---|---|---|
| Rhode Island Red | 200–280 | Marroni | Grande | Docile, prolifica |
| New Hampshire | 200–240 | Marroni chiare | Grande | Docile, tranquilla |
| Sussex | 200–260 | Crema/marroni | Grande | Docile, curiosa |
| Orpington | 150–200 | Crema/marroni | Grande | Placida, ottima per famiglie |
| Plymouth Rock (Amrock) | 200–250 | Marroni | Grande | Tranquilla, livrea sparviero |
| Wyandotte | 150–220 | Crema/marroni | Media-grande | Docile, ornamentale |
| Australorp | 250–300 | Marroni | Grande | Tranquilla, record di deposizione |
| ISA Brown | 280–310 | Marroni rosate | Media | Ibrida, molto produttiva |
| Brahma | 120–150 | Marroni | Molto grande | Placida, piumaggio zampe |
| Marans | 150–200 | Bruno scuro/cioccolato | Grande | Tranquilla, uova scurissime |
| Cocincina | 100–130 | Crema/marroni | Grande | Ornamentale, placida |
| Araucana | 150–180 | Blu-verdi/azzurre | Media | Vivace, uova colorate |
| Legbar Crema | 150–200 | Blu-verdi | Media | Vivace, uova colorate |
| Olive Egger (ibrida) | 150–200 | Verde oliva | Media | Vivace, uova verdi |
| Amburgo | 150–200 | Bianche | Leggera | Attiva, livrea millefiori |
| Minorca | 180–220 | Bianche grandi | Media | Vivace, mediterranea |
| Welsummer | 150–180 | Bruno terracotta | Media | Tranquilla, uova scure |
| Barnevelder | 150–200 | Bruno scuro | Media | Docile, uova scure |
| Faverolle | 150–200 | Crema | Grande | Docile, piumata, ottima per famiglie |
| Chantecler | 150–200 | Marroni | Grande | Resistente al freddo, tranquilla |
| Dominique | 150–200 | Marroni | Media | Storica americana, tranquilla |
| Java | 150–180 | Marroni | Grande | Rara, rustica |
| Buckeye | 150–200 | Marroni | Grande | Attiva, resistente al freddo |
| Moroseta (Silkie) | 80–120 | Crema | Nana | Ornamentale, placidissima, cova bene |
| Sebright | 50–80 | Bianche | Nana | Ornamentale, livrea orlata |
| Chabo (Bantam) | 60–100 | Crema/bianche | Nana | Ornamentale, docile |
| Olandese Ciuffata | 100–140 | Bianche | Media | Ornamentale, ciuffo grande |
| Phoenix | 70–100 | Bianche/crema | Media | Ornamentale, coda lunghissima |
| La Flèche | 150–200 | Bianche | Grande | Rara francese, cresta a "V" |

*Voce generica*
- **Gallina mista / razza non conosciuta** — nessun dato precompilato, tutti i campi liberi

L'utente può sempre modificare/sovrascrivere i dati precompilati.

### 6.3 Età produttiva e ciclo di vita

L'app calcola automaticamente alcune informazioni in base alla data di nascita/età di ogni gallina:

- **Età attuale** — visualizzata in anni e mesi sulla scheda
- **Fase produttiva** — calcolata automaticamente:
  - Pollastre (< 5-6 mesi): "Non ancora in deposizione"
  - Piena produzione (6 mesi – 2 anni): nessuna nota
  - Produzione ridotta (2–3 anni): "La produzione potrebbe iniziare a calare"
  - Fine vita produttiva (> 3 anni): "Questa gallina è probabilmente oltre il picco produttivo"
  - (Le soglie variano per razza e sono precompilate dal database razze, modificabili)
- **Notifica opzionale** quando si avvicina la soglia di fine vita produttiva

### 6.4 Calendario della muta

La muta è il periodo annuale (tipicamente autunno) in cui le galline perdono le penne e smettono temporaneamente di deporre. L'app permette di:

- Segnare l'inizio e la fine della muta per ogni gallina
- Visualizzare sulla scheda gallina lo stato attuale: "In muta da X giorni"
- Le galline in muta vengono evidenziate nella lista con un badge apposito
- Le statistiche di produzione tengono conto dei periodi di muta (spiegando i cali)
- Notifica quando una gallina è in muta da più di 10 settimane (muta insolitamente lunga)

### 6.5 Stato di salute e trattamenti

Ogni scheda animale ha una sezione "Salute & Trattamenti" con due sottosezioni:

**Eventi di salute (problemi):**
- Data dell'evento
- Tipo di problema (da lista: ferita, malattia, comportamento anomalo, parassiti, problema al guscio, altro)
- Descrizione libera
- Foto (opzionale)
- Stato: in corso / risolto
- Note di follow-up

**Registro trattamenti (sia preventivi che curativi):**
- Data
- Tipo di trattamento (campo libero con autocomplete: sverminazione, antiparassitario, vitamina, antibiotico, disinfettante ferita, ecc.)
- Animale/i coinvolti: singolo animale o "tutto il pollaio"
- Prodotto usato (campo libero)
- Dose / quantità
- Note
- Prossimo trattamento previsto (data, con notifica automatica)

I trattamenti programmati (es. sverminazione ogni 6 mesi) generano un avviso quando si avvicina la data del prossimo. Gli animali con trattamenti in scadenza appaiono evidenziati nella lista.

Gli animali con problemi di salute attivi vengono evidenziati nella lista galline e nella home con un badge visivo.

**Esempio reale:** il gallo ha ferite alle zampe causate dalle galline. Si registra come "Ferita — Zampe posteriori — Beccato dalle galline", stato "in corso". Si aggiunge un trattamento "Disinfezione ferita" con data e prodotto usato.

### 6.6 Log delle uscite

Per ogni giornata si può segnare:
- Ora di uscita nel recinto (le galline escono)
- Ora di rientro nella casetta (le galline rientrano per la notte)
- Note opzionali (es. "oggi non sono uscite per il maltempo")

Il log delle uscite serve principalmente come diario comportamentale e sicurezza: se le galline non sono ancora rientrate all'imbrunire, l'app può inviare un avviso (orario tramonto calcolato automaticamente in base alla posizione e alla stagione).

### 6.7 Lista animali
Vista a lista con:
- Foto (o avatar con iniziale del nome)
- Nome e razza
- Badge stato salute (se ci sono problemi attivi)
- Badge muta (se la gallina è in muta)
- Per le galline: uova prodotte negli ultimi 7 giorni
- Tap sulla scheda → apre il dettaglio completo

---

## 7. Le Uova

### 7.1 Raccolta giornaliera
Con un tap dalla home o dalla sezione Uova, si può registrare:
- Quale gallina ha fatto l'uovo (scelta dalla lista) — opzionale, si può dire "gallina non identificata"
- In quale nido è stato trovato l'uovo (scelta dalla lista nidi configurati, opzionale)
- Data e ora (pre-compilata con adesso, modificabile)
- Foto dell'uovo (opzionale — utile per documentare anomalie: guscio morbido, macchie, forma strana, colore insolito)
- Eventuale nota (es. "uovo molto piccolo", "guscio fragile", "doppio tuorlo")

### 7.1a Gestione nidi

Nella configurazione del pollaio si possono registrare i nidi presenti (es. "Nido 1", "Nido finestra", "Nido in fondo"). Per ogni nido:
- Nome libero
- Posizione/nota opzionale

Nelle statistiche sarà possibile vedere quale nido viene usato di più e quali galline preferiscono quale nido. Se un nido non viene mai usato per settimane, l'app può segnalarlo come suggerimento ("Il Nido 2 non viene usato da 2 settimane — potrebbe avere un problema?").

### 7.2 Scorte e stato uova
Le uova vengono tracciate individualmente o a lotto. Per ogni uovo/lotto si conosce:
- Data di deposizione
- Stato: disponibile / consumato / regalato
- Se regalato: a chi (dalla rubrica) e quando

**Visualizzazione scorte:**
- Totale uova disponibili oggi
- Suddivise per settimana di raccolta
- Grafico delle ultime 4 settimane (produzione, consumate, regalate)

### 7.3 Scadenza uova — logica e avvisi

Basandosi su ricerche aggiornate sulla conservazione delle uova fresche di pollaio domestico:

**Parametri di conservazione predefiniti (modificabili nelle impostazioni):**

| Modalità di conservazione | Durata consigliata |
|---|---|
| Temperatura ambiente (< 25°C) | 20 giorni dalla deposizione |
| In frigorifero (0–4°C) | 28 giorni dalla deposizione |

**Logica di avviso:**
- **5 giorni prima della scadenza:** notifica "⚠️ Alcune uova stanno per scadere — hai ancora 5 giorni per usarle o regalarle!"
- **2 giorni prima della scadenza:** notifica urgente "🚨 Queste uova scadono dopodomani!"
- **Gli avvisi NON vengono mai generati per uova già segnate come regalate o consumate**
- L'utente può impostare la modalità di conservazione (frigo / ambiente) nelle preferenze, oppure per singolo lotto

**Suggerimento contestuale:** se ci sono uova in scadenza, l'app può suggerire "Vuoi regalarle a qualcuno?" con accesso rapido alla rubrica.

### 7.4 Regali di uova
Quando si segnano uova come regalate:
- Si sceglie il destinatario dalla rubrica (o si aggiunge al volo)
- Si inserisce la quantità
- Data automatica (modificabile)
- Nota opzionale

---

## 8. Manutenzione del Pollaio

### 8.1 Tipi di manutenzione tracciata
L'app tiene traccia di queste attività, ognuna con la propria frequenza consigliata e avviso:

| Attività | Dove | Frequenza consigliata (default) |
|---|---|---|
| Pulizia della casetta | Casetta interna | Ogni 7 giorni |
| Pulizia completa del pollaio | Tutto il recinto | Ogni 14 giorni |
| Cambio trucciolo | Casetta interna | Ogni 7 giorni |
| Cambio corteccia di pino | Pollaio esterno | Ogni 30 giorni |
| Rinnovo bagno di sabbia | Area bagno | Ogni 14 giorni |
| Cambio paglia nei nidi | Nidi esterni | Ogni 7 giorni |

**Nota:** il bagno di sabbia è composto da terra di diatomea + sabbia + cenere. Viene trattato come un'unica voce di manutenzione ma nella scheda dettaglio si possono aggiungere note sui componenti.

### 8.2 Registrazione intervento
Per ogni intervento si registra:
- Tipo (dalla lista sopra)
- Data e ora (pre-compilata)
- Note (es. "ho aggiunto anche terra di diatomea", "trucciolo tutto bagnato — cambiato prima del solito")
- Foto (opzionale)

### 8.3 Avvisi di manutenzione
- Notifica quando si avvicina la data dell'intervento successivo (es. 1 giorno prima)
- Notifica se l'intervento è già scaduto (es. "sono passati 8 giorni dall'ultima pulizia della casetta — è ora!")
- Le frequenze consigliate sono modificabili dall'utente nelle impostazioni

---

## 9. Meteo

### 9.1 Integrazione meteo
- API: **Open-Meteo** (gratuita, nessuna registrazione richiesta, copertura italiana eccellente)
- Posizione: quella impostata per il pollaio (GPS o manuale)
- Aggiornamento: ogni 2 ore in background

### 9.2 Dati meteo visualizzati
- Temperatura attuale e percepita
- Condizione meteo (sole, nuvole, pioggia, neve, vento)
- Previsioni per le prossime 48 ore (mattina / pomeriggio / sera)
- Velocità del vento

### 9.3 Notifiche meteo automatiche
L'app invia notifiche proattive basate sulle previsioni del giorno successivo:

| Condizione | Soglia | Messaggio esempio |
|---|---|---|
| Pioggia | > 60% probabilità | "🌧️ Domani pioverà — ricordati di controllare che le galline abbiano riparo!" |
| Vento forte | > 40 km/h | "💨 Domani c'è molto vento — controlla che il pollaio sia ben chiuso" |
| Caldo estremo | > 35°C | "🌡️ Domani fa molto caldo — assicurati che le galline abbiano acqua fresca!" |
| Freddo intenso | < 0°C | "🥶 Domani si gela — controlla il ricovero notturno delle galline" |
| Bel tempo | Sole pieno | "☀️ Domani splende il sole — giornata perfetta per far uscire le galline!" |
| Temporale | Allerta meteo | "⛈️ Attenzione! Temporale previsto domani — metti al riparo le galline per tempo" |

### 9.4 Storico meteo

L'app salva un log giornaliero delle condizioni meteo rilevate (temperatura min/max, precipitazioni, ore di sole stimate). Questo storico viene usato in due modi:

- **Nella sezione Statistiche:** si può sovrapporre il grafico della produzione delle uova con il grafico delle temperature e delle ore di luce, per scoprire correlazioni (es. "la produzione cala quando le temperature scendono sotto i 5°C" o "dopo 3 giorni di pioggia continua la produzione si riduce")
- **Come contesto automatico:** quando si registra un calo di produzione o un problema di salute, l'app mostra in sovrimpressione le condizioni meteo degli ultimi giorni come informazione utile

### 9.5 Stagionalità intelligente

L'app conosce la posizione del pollaio e la data corrente, e fornisce consigli proattivi basati sulla stagione in corso. Questi suggerimenti appaiono come card informative nella home — non come notifiche push, per non essere fastidiosi. L'utente può chiuderli o ignorarli.

Esempi di messaggi stagionali automatici:

| Periodo | Messaggio |
|---|---|
| Fine estate / inizio autunno | "Settembre si avvicina: le galline potrebbero iniziare la muta. È normale se la produzione cala per qualche settimana." |
| Autunno | "Le ore di luce si accorciano: la produzione potrebbe diminuire fino alla primavera." |
| Inverno | "Con il freddo le galline bevono meno — controlla più spesso l'abbeveratoio e che l'acqua non ghiacci." |
| Primavera | "Aumentano le ore di luce: la produzione delle uova dovrebbe riprendere a salire!" |
| Estate | "Caldo in arrivo: assicurati che le galline abbiano sempre acqua fresca e ombra disponibile." |

I consigli stagionali vengono incrociati con il meteo storico (sezione 9.4) e con la produzione registrata, per affinare i messaggi nel tempo.

---

## 10. Lista della Spesa e Scorte

### 10.1 Lista della spesa
Semplice lista di cose da comprare:
- Aggiunta rapida con testo libero
- Possibilità di aggiungere categoria (cibo galline / lettiera / medicinali / altro)
- Quantità opzionale
- Spunta per segnare come comprato
- Le voci spuntate vengono nascoste (con opzione "mostra acquistato")
- Condivisione lista (via WhatsApp, email, ecc.) — funzionalità nativa di condivisione testo

### 10.2 Tracciamento cibo e scorte

Il nome di ogni alimento è **campo libero** — l'utente scrive esattamente quello che usa (es. "Mais del contadino", "Scarti della nonna", "Pellet Bio Marca X", "Scarti del fruttivendolo"). Per velocizzare l'inserimento, l'app mostra suggerimenti di completamento automatico basati sulle voci già inserite in passato.

**Per ogni voce di cibo:**
- Nome libero (con autocomplete dalle voci precedenti)
- Quantità attuale in scorta + unità di misura libera (kg, sacchi, porzioni, ecc.)
- Soglia di avviso scorte basse (personalizzabile per voce)
- Registro dei rifornimenti (data, quantità aggiunta, note)
- Avviso automatico quando la quantità scende sotto la soglia impostata

**Nella lista della spesa** (sezione 10.1), le voci di cibo in esaurimento possono essere aggiunte con un tap: "Aggiungi alla lista della spesa".

### 10.3 Registro spese

Per tenere traccia di quanto si spende per il pollaio e calcolare il costo per uovo. Ogni volta che si vuole registrare una spesa:

- Data (pre-compilata con oggi, modificabile)
- Importo (€)
- Cosa è stato comprato (campo libero con autocomplete: mais, pellet, trucciolo, corteccia di pino, terra di diatomea, veterinario, medicinali, attrezzatura, ecc.)
- Note opzionali

Non c'è obbligo di registrare ogni spesa — il sistema funziona anche se si inseriscono solo le spese principali. Più si registra, più il calcolo del costo per uovo sarà accurato.

**Costo per uovo (calcolato automaticamente nelle statistiche):**
- Totale spese nel periodo selezionato ÷ totale uova prodotte nello stesso periodo
- Filtri per periodo: ultimo mese, ultimi 3 mesi, ultimo anno, tutto
- Visualizzato come curiosità, non come pressione economica ("Ogni uovo ti è costato circa €0,38 questo mese")

---

## 11. Rubrica

La rubrica non è un'agenda di contatti generica — è specifica per il pollaio.

**Ogni contatto ha:**
- Nome
- Relazione opzionale (es. "vicina di casa", "sorella")
- Telefono (opzionale, per apertura rapida in WhatsApp)
- Note
- **Storico automatico:** tutte le volte che hai regalato uova a questa persona, con data e quantità

**Funzionalità:**
- Selezione rapida quando si segnano uova regalate
- Vista "storico regali" per persona: quante uova totali, quante volte, ultima data
- Questa rubrica è usata anche nelle statistiche

---

## 12. Note e Diario

### 12.1 Note libere
Ogni nota ha:
- Testo libero
- Data (automatica, modificabile)
- Tag opzionale (es. "osservazione", "idea", "reminder")
- Foto allegata (opzionale)

### 12.2 Note come promemoria
Ogni nota può essere trasformata in promemoria:
- Si imposta data e ora
- Si sceglie come ricevere l'avviso:
  - 🔔 Notifica push sul telefono
  - 📧 Email all'indirizzo del profilo
  - 🔔📧 Entrambi
- Il promemoria appare nella home tra gli alert attivi finché non viene visualizzato/archiviato

---

## 13. Statistiche e Grafici

### 13.1 Produzione uova
- Uova per giorno / settimana / mese (grafico a barre)
- Uova per gallina (chi produce di più)
- Uova per nido (quale nido viene usato di più)
- Confronto mese su mese
- Totale annuale
- Sovrapposizione produzione + temperatura/ore di luce (da storico meteo)
- I periodi di muta vengono evidenziati sul grafico come zone grigie, per spiegare i cali

### 13.2 Destinazione uova
- Quante uova consumate, quante regalate, quante ancora disponibili (grafico a torta)
- Regali per persona: chi riceve più uova (grafico a barre)
- Storico regali nel tempo

### 13.3 Salute del pollaio
- Frequenza interventi di manutenzione (rispettati vs. in ritardo)
- Numero di eventi di salute registrati per animale
- Timeline eventi di salute
- Trattamenti eseguiti nel tempo (per animale o per tutto il pollaio)

### 13.4 Spese e costo per uovo
- Totale spese per periodo (grafico a barre mensile)
- Spese per categoria (grafico a torta)
- Costo per uovo nel tempo (andamento mensile)
- Confronto spese vs. produzione

### 13.5 Comportamento animali
- Giorni di uscita nel recinto (log uscite, grafico mensile)
- Periodi di muta per gallina (timeline)
- Fasi produttive per animale (visualizzazione età produttiva)

### 13.6 Periodi di tempo
I grafici supportano filtri per: ultima settimana, ultimo mese, ultimi 3 mesi, ultimo anno, tutto.

---

## 14. Notifiche — Schema Completo

### 14.1 Canali disponibili
- **Notifica push** (sul telefono)
- **Email** (all'indirizzo del profilo)
- **Entrambi**

La scelta del canale è configurabile globalmente e/o per categoria di notifica.

### 14.2 Categorie di notifica

| Categoria | Quando | Canale default |
|---|---|---|
| Manutenzione in scadenza | 1 giorno prima | Push |
| Manutenzione scaduta | Giorno stesso + ogni 2 giorni | Push |
| Uova in scadenza (5 gg) | 5 giorni prima | Push |
| Uova in scadenza (2 gg) | 2 giorni prima | Push + Email |
| Meteo (avvisi) | La sera prima, 20:00 | Push |
| Promemoria personali | Data/ora impostata dall'utente | Push + Email (configurabile) |
| Scorte cibo in esaurimento | Quando sotto soglia | Push |
| Trattamento in scadenza | 3 giorni prima della data prevista | Push |
| Fine vita produttiva gallina | Quando si avvicina la soglia per razza | Push |
| Muta insolitamente lunga | Dopo 10 settimane in muta | Push |
| Rientro galline (imbrunire) | Se log uscita aperto a tramonto | Push |
| Nido inutilizzato | Dopo 2 settimane senza uova in un nido | Push |

### 14.3 Impostazioni notifiche
Nella sezione Impostazioni > Notifiche:
- On/off globale
- On/off per ogni categoria
- Scelta canale per ogni categoria
- Ora di invio notifiche meteo
- "Non disturbare" con fascia oraria

---

## 15. Architettura Tecnica (Indicazioni per lo Sviluppatore)

### 15.1 Stack consigliato

| Layer | Tecnologia | Motivazione |
|---|---|---|
| Frontend / PWA | Next.js (React) | SSR/SSG, routing, ottimo supporto PWA con next-pwa, deploy semplice |
| PWA features | next-pwa / Workbox | Service worker, offline cache, installabilità dalla home screen |
| Styling | Tailwind CSS | Utility-first, ottimo per UI responsive mobile-first |
| Backend + DB | Supabase | Auth, PostgreSQL, Storage immagini, Edge Functions, tutto incluso |
| Meteo | Open-Meteo API | Gratuita, no API key, dati orari e giornalieri, copertura IT ottima |
| Notifiche push | Web Push API + Supabase Edge Functions | Push nativi del browser (supportati su Android/desktop; su iOS da Safari 16.4+) |
| Email | Resend o Supabase Edge Functions + SendGrid | Invio email promemoria e avvisi |
| Grafici | Recharts | Libreria React matura, leggera, buone animazioni |
| Geolocalizzazione | Browser Geolocation API | Nativa, nessuna dipendenza esterna |
| Deploy | Vercel | Deploy automatico da Git, CDN globale, gratuito per progetti piccoli |

**Note sulla scelta PWA vs app nativa:**
- Nessun bisogno di App Store / Play Store
- Aggiornamenti istantanei (nessuna approvazione necessaria)
- Funziona su qualsiasi dispositivo con un browser moderno
- Installabile dalla home screen su iOS (Safari) e Android (Chrome)
- Le Web Push Notifications sono supportate su Android e desktop; su iPhone richiedono iOS 16.4+ e Safari

### 15.2 Struttura dati principale (schematica)

```
utente
  └─ pollaio (1 per ora, architettura multi-pollaio ready)
        ├─ animali[]
        │     ├─ scheda (nome, razza, età, foto, colore, note)
        │     ├─ eventi_salute[]
        │     ├─ trattamenti[]
        │     ├─ periodi_muta[]
        │     └─ uova_prodotte[] (FK)
        ├─ nidi[]
        │     └─ nome, note
        ├─ uova[]
        │     ├─ data_deposizione
        │     ├─ animale_FK (nullable)
        │     ├─ nido_FK (nullable)
        │     ├─ foto (nullable)
        │     ├─ note
        │     ├─ stato (disponibile / consumato / regalato)
        │     └─ regalo_FK → regalo
        ├─ regali[]
        │     ├─ contatto_FK
        │     ├─ quantità
        │     └─ data
        ├─ manutenzioni[]
        │     ├─ tipo
        │     ├─ data
        │     └─ note
        ├─ log_uscite[]
        │     ├─ data
        │     ├─ ora_uscita
        │     ├─ ora_rientro
        │     └─ note
        ├─ meteo_storico[]
        │     ├─ data
        │     ├─ temp_min, temp_max
        │     ├─ precipitazioni_mm
        │     └─ ore_sole_stimate
        ├─ spese[]
        │     ├─ data
        │     ├─ importo_euro
        │     ├─ descrizione
        │     └─ note
        ├─ note[]
        │     ├─ testo
        │     ├─ foto
        │     ├─ tag
        │     └─ promemoria (data, ora, canale)
        ├─ spesa_lista[]
        ├─ scorte_cibo[]
        └─ contatti_rubrica[]
```

### 15.3 Note architetturali importanti
- Tutte le date salvate in UTC, visualizzate nel timezone del browser
- Le immagini (foto galline, pollaio, eventi salute) vengono salvate su Supabase Storage con compressione lato client prima dell'upload (libreria browser-image-compression)
- **Offline first (priorità media):** service worker Workbox mette in cache le pagine principali e i dati recenti; le azioni offline vengono sincronizzate al ritorno di connessione
- Le regole di notifica vengono eseguite tramite Supabase Edge Functions su cron schedulato — non solo client-side, per garantire l'invio anche quando la PWA è chiusa
- Il manifest PWA deve includere `display: standalone`, `theme_color` con il rosa primario, e icone a 192×192 e 512×512px
- Design mobile-first: la UI è progettata per smartphone (360–430px) ma si adatta a tablet e desktop con un layout leggermente più largo

---

## 16. Design System

### 16.1 Principi di design
- **Semplice prima di tutto:** ogni schermata deve avere un'azione principale chiara
- **Caldo e accogliente:** come guardare un quaderno fatto a mano, non un'app aziendale
- **Colori pastello:** nessun colore aggressivo, tutto morbido e riposante per gli occhi
- **Linguaggio umano:** "Le tue galline" non "Gestione animali"; "Aggiungi" non "Inserisci record"
- **Feedback immediato:** ogni azione ha una risposta visiva (animazione, toast, cambio colore)

### 16.2 Palette colori

**Primario**
- Rosa pastello principale: `#E8678A`
- Rosa chiaro (superfici): `#FFD6E0`
- Rosa pallido (sfondi): `#FFF0F3`

**Accenti**
- Pesca: `#FFE4D0`
- Burro/giallo chiaro: `#FFE07A`
- Salvia/verde chiaro: `#B5D4B5`
- Cielo/blu chiaro: `#A8D1FF`
- Lavanda: `#E8DAFF`

**Neutri**
- Bianco caldo: `#FAF8F6`
- Grigio chiaro: `#F0EDE8`
- Grigio medio: `#9E968C`
- Testo principale: `#2E2924`

### 16.3 Tipografia
- **Titoli e nome app:** Lora (serif) — elegante e caldo
- **Testi UI, bottoni, body:** Nunito (sans-serif) — rotondo e amichevole
- Evitare font tecnici o geometrici (no Inter, no SF Pro visibile, no Roboto)

### 16.4 Tono del linguaggio
- Italiano, informale ma non gergale
- Prima persona plurale dove appropriato ("Le nostre galline")
- Messaggi di errore in tono rassicurante: "Ops, qualcosa non ha funzionato — riprova!" invece di "Errore 500"
- Messaggi di conferma con un tocco di calore: "✓ Ottimo! Uovo registrato" invece di "Salvato"
- Le notifiche sono amichevoli e mai allarmiste (tranne per emergenze meteo reali)

---

## 17. Flussi Principali (User Flows)

### Onboarding (prima apertura)
1. Schermata di benvenuto → Registrazione email+password
2. "Benvenuta! Come si chiama il tuo pollaio?" → inserimento nome
3. "Dove si trova?" → GPS automatico + conferma o modifica manuale
4. "Vuoi aggiungere una foto?" → opzionale, skip disponibile
5. "Adesso aggiungiamo le tue galline!" → flusso aggiunta animali (almeno 1)
6. "Perfetto! Il tuo pollaio è pronto 🎉" → Home

### Aggiunta uovo (flusso principale, uso quotidiano)
1. Tap "+" su home o sezione Uova
2. "Chi ha fatto l'uovo?" → lista galline + "Non so"
3. Data/ora (pre-compilata) → conferma
4. Toast: "✓ Uovo aggiunto! Hai 7 uova disponibili"

### Regalo uova
1. Uova → "Regala uova"
2. "Quante uova?" → inserimento quantità
3. "A chi?" → selezione da rubrica o aggiunta nuovo contatto
4. Conferma → Toast: "✓ Regalate 6 uova a Nonna Maria!"

---

## 18. Idee e Funzionalità Future (Backlog)

Queste non fanno parte dell'MVP ma vanno tenute in mente nell'architettura:

- **Condivisione pollaio:** permettere a più utenti di gestire lo stesso pollaio (es. coppia)
- **Export dati:** esporta tutto in PDF o CSV (registro annuale per chi vuole tenerlo)
- **Shortcut home screen:** icone rapide nel manifest PWA per le azioni più usate (es. "Aggiungi uovo") accessibili con long-press sull'icona installata
- **Calendario stagionale:** consigli automatici basati sulla stagione (es. "In estate le galline bevono di più — controlla l'acqua più spesso")
- **Peso delle uova:** campo opzionale per tracciare il peso e classificare (S/M/L/XL)
- **Ciclo della cova:** se si vuole far covare le uova, tracciare il periodo di cova e la schiusa prevista
- **Integrazione veterinario:** note sulle visite veterinarie e sui farmaci somministrati
- **Backup automatico:** export periodico dei dati su cloud personale (Google Drive, iCloud)
- **Multi-pollaio:** gestire più pollai dallo stesso account
- **Comunità:** sezione opzionale per condividere foto e consigli con altri utenti (fase molto avanzata)

---

## 19. Checklist per Claude Design

Quando si passa questo documento a Claude Design per la prototipazione visiva, le schermate prioritarie da progettare nell'ordine sono:

- [ ] Onboarding (3-4 schermate)
- [ ] Home / Dashboard del pollaio (con card stagionalità)
- [ ] Lista galline (con badge muta e salute)
- [ ] Scheda singola gallina (foto, dati razza, età produttiva, salute, trattamenti, muta, log uscite)
- [ ] Sezione Uova (scorte + aggiunta rapida con nido e foto)
- [ ] Gestione nidi
- [ ] Sezione Manutenzione (lista interventi + avvisi)
- [ ] Sezione Meteo (widget home + storico)
- [ ] Registro spese e costo per uovo
- [ ] Rubrica contatti
- [ ] Note e promemoria
- [ ] Lista della spesa + scorte cibo
- [ ] Statistiche (produzione, destinazione, spese, meteo sovrapposto, uscite)
- [ ] Impostazioni e profilo

---

## 20. Checklist per Claude Code

Quando si passa questo documento a Claude Code per l'implementazione:

- [ ] Setup progetto Next.js + Tailwind CSS
- [ ] Configurazione PWA (next-pwa, manifest.json, service worker)
- [ ] Setup Supabase (auth, schema DB, storage, Edge Functions)
- [ ] Implementa schema DB completo (vedi sezione 15.2)
- [ ] Auth: registrazione, login, profilo, reset password
- [ ] Onboarding flow
- [ ] Geolocalizzazione via browser (con fallback manuale)
- [ ] CRUD Animali (con upload e compressione foto)
- [ ] Database razze con dati precompilati (vedi sezione 6.2)
- [ ] Logica età produttiva e notifica fine vita produttiva
- [ ] CRUD Muta (periodi, badge, evidenziazione su grafici)
- [ ] CRUD Salute + Trattamenti (con notifiche prossimo trattamento)
- [ ] Log uscite (con avviso tramonto)
- [ ] CRUD Nidi + statistiche per nido
- [ ] CRUD Uova (con nido, foto, logica scadenza e avvisi)
- [ ] CRUD Manutenzione (con avvisi e frequenze configurabili)
- [ ] Integrazione Open-Meteo (previsioni + storico giornaliero)
- [ ] Notifiche meteo automatiche
- [ ] Stagionalità intelligente (card home per stagione)
- [ ] CRUD Cibo e scorte (campo libero + autocomplete)
- [ ] Registro spese + calcolo costo per uovo
- [ ] CRUD Note + Promemoria
- [ ] Rubrica e sistema Regali
- [ ] Lista della spesa + integrazione scorte cibo
- [ ] Statistiche e grafici completi (Recharts)
- [ ] Web Push Notifications (con richiesta permesso)
- [ ] Invio email promemoria (Supabase Edge Functions + Resend)
- [ ] Impostazioni notifiche per categoria e canale
- [ ] Test su Chrome Android, Safari iOS, Chrome desktop

---

*Documento creato e aggiornato con Claude Sonnet 4.6 — Maggio 2026*
