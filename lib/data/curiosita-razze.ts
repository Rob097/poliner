/**
 * Curiosità "sapevi che…" mostrate sulla pagina pubblica del pollaio.
 * Si sceglie una curiosità della razza più rappresentata,
 * altrimenti si pesca da quelle generiche.
 */

const CURIOSITA_RAZZA: Record<string, string[]> = {
  livornese: [
    "Le Livornesi (Leghorn) sono tra le galline più prolifiche al mondo: fino a 320 uova all'anno.",
    "Sono le antenate delle galline ovaiole industriali bianche più diffuse.",
  ],
  ancona: [
    "L'Ancona, di origini marchigiane, è famosa per la livrea nera con punte bianche.",
  ],
  padovana: [
    "La Padovana è una delle più antiche razze ornamentali italiane: il suo ciuffo è inconfondibile.",
  ],
  polverara: [
    "La Polverara è una rara razza padovana, con un ciuffo elegante e un piumaggio fine.",
  ],
  siciliana: [
    "La Siciliana è una razza rustica, perfetta per i climi caldi e mediterranei.",
  ],
  mugellese: [
    "La Mugellese è una razza toscana rara, salvata dall'estinzione negli ultimi decenni.",
  ],
  modenese: [
    "La Modenese è una razza emiliana antica, ottima ovaiola e madre attenta.",
  ],
  romagnola: [
    "La Romagnola è la classica gallina di aia: rustica, autonoma e ottima razzolatrice.",
  ],
  valdarno: [
    "La Valdarno è una rara razza toscana, conosciuta anche come 'Valdarnese bianca'.",
  ],
  tirolese: [
    "La Tirolese si è adattata bene ai climi freddi alpini, grazie al suo piumaggio folto.",
  ],
  "rhode-island-red": [
    "Le Rhode Island Red sono fra le razze più diffuse al mondo: docili, rustiche e ottime ovaiole.",
  ],
  "new-hampshire": [
    "La New Hampshire è una cugina più tranquilla della Rhode Island, selezionata negli USA.",
  ],
  sussex: [
    "La Sussex è curiosa e socievole: spesso segue gli umani in giardino come un cagnolino.",
  ],
  orpington: [
    "Le Orpington sembrano grandi piumini ambulanti: tra le galline più docili e adatte ai bambini.",
  ],
  "plymouth-rock": [
    "La Plymouth Rock (Amrock) ha la classica livrea 'barrata' bianco-nera, molto fotogenica.",
  ],
  wyandotte: [
    "La Wyandotte ha un piumaggio finemente disegnato, simile a una scaglia di pesce.",
  ],
  australorp: [
    "Una Australorp ha il record mondiale per uova in un anno: 364 in 365 giorni!",
  ],
  "isa-brown": [
    "Le Isa Brown sono ibridi ovaioli: fino a 300 uova nel primo anno di deposizione.",
  ],
  brahma: [
    "La Brahma è gigantesca: i galli possono superare i 5 kg. Ha anche le zampe piumate.",
  ],
  marans: [
    "Le Marans depongono uova marroni scurissime, quasi color cioccolato.",
  ],
  cocincina: [
    "La Cocincina è enorme, calmissima e ha le zampe completamente piumate.",
  ],
  araucana: [
    "L'Araucana depone uova azzurre o verdi-pastello: l'unica razza con il guscio davvero colorato.",
  ],
  "legbar-crema": [
    "La Legbar crema depone uova azzurre e si riconosce il sesso dei pulcini già dal piumaggio!",
  ],
  "olive-egger": [
    "Le Olive Egger sono incroci selezionati per uova color verde-oliva.",
  ],
  amburgo: [
    "L'Amburgo è agile, vivace e adora razzolare in libertà: una piccola atleta.",
  ],
  minorca: [
    "La Minorca depone uova bianche grandissime, fra le più voluminose in proporzione al corpo.",
  ],
  welsummer: [
    "La Welsummer depone uova marroni con piccole macchioline: ognuna è un'opera d'arte.",
  ],
  barnevelder: [
    "La Barnevelder olandese depone uova bruno-cioccolato e ha un disegno 'a doppia frangia'.",
  ],
  faverolle: [
    "La Faverolle francese ha cinque dita per zampa, una barbetta e una personalità adorabile.",
  ],
  chantecler: [
    "La Chantecler è canadese: cresta minuscola e piumaggio fitto la rendono perfetta per il gelo.",
  ],
  dominique: [
    "La Dominique è la più antica razza americana: già allevata nel '700.",
  ],
  java: [
    "La Java è una delle prime razze americane: ha contribuito a creare Plymouth Rock e Jersey Giant.",
  ],
  buckeye: [
    "La Buckeye è l'unica razza americana sviluppata interamente da una donna, Nettie Metcalf.",
  ],
  moroseta: [
    "Le Moroseta (Silkie) hanno piume morbidissime come la seta e la pelle nera.",
  ],
  sebright: [
    "La Sebright è una piccolissima razza ornamentale, con piumaggio finemente bordato.",
  ],
  chabo: [
    "La Chabo è una razza nana giapponese antichissima, con zampe cortissime.",
  ],
  "olandese-ciuffata": [
    "L'Olandese ciuffata ha un ciuffo spettacolare che le copre quasi tutta la testa.",
  ],
  phoenix: [
    "La Phoenix giapponese ha una coda lunghissima: in alcune linee supera anche i 5 metri!",
  ],
  "la-fleche": [
    "La La Flèche francese ha una cresta a due punte che ricorda corna di diavolo.",
  ],
  "ayam-cemani": [
    "L'Ayam Cemani è completamente nera: piumaggio, pelle, carne e perfino le ossa!",
  ],
  barrata: [
    "La Barrata (Plymouth Rock barrato) ha l'inconfondibile livrea a strisce bianco-nere.",
  ],
};

const CURIOSITA_GENERICHE: string[] = [
  "Le galline riconoscono fino a 100 facce diverse, sia di altre galline che di persone.",
  "Ogni gallina ha la sua personalità: c'è la timida, la curiosa, la leader e l'esploratrice.",
  "Le galline 'parlano' fra loro con oltre 30 versi diversi, ognuno con un significato preciso.",
  "Il colore del guscio dell'uovo dipende dalla razza, non dall'alimentazione.",
  "Le galline sognano: durante il sonno REM rivivono ciò che hanno fatto durante il giorno.",
  "Una gallina felice canticchia un piccolo brontolio quando razzola contenta.",
  "Le galline preferiscono dormire in alto: nei polli selvatici si appollaiano sugli alberi.",
];

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length]!;
}

/**
 * Sceglie una curiosità da mostrare nella pagina pubblica.
 * Scelta deterministica per slug (così non balla a ogni refresh,
 * ma cambia da un pollaio all'altro). Cambia naturalmente al
 * variare delle razze rappresentate.
 */
export function curiositaPerPagina(args: {
  slug: string;
  razzeIds: (string | null)[];
}): { testo: string; razzaNome: string | null } {
  const conta = new Map<string, number>();
  for (const id of args.razzeIds) {
    if (!id || id === "mista") continue;
    if (!CURIOSITA_RAZZA[id]) continue;
    conta.set(id, (conta.get(id) ?? 0) + 1);
  }

  const seed = hashString(args.slug);

  // Razza più rappresentata (con almeno una curiosità disponibile).
  let topId: string | null = null;
  let topCount = 0;
  for (const [id, c] of conta) {
    if (c > topCount) {
      topCount = c;
      topId = id;
    }
  }

  if (topId) {
    const lista = CURIOSITA_RAZZA[topId]!;
    return { testo: pick(lista, seed), razzaNome: null };
  }
  return { testo: pick(CURIOSITA_GENERICHE, seed), razzaNome: null };
}
