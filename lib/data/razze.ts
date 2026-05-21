export type Origine = "italiana" | "internazionale" | "mista";
export type Taglia = "nana" | "piccola" | "media" | "grande" | "molto-grande" | "leggera";

export interface Razza {
  id: string;
  nome: string;
  uovaAnnoMin: number;
  uovaAnnoMax: number;
  coloreUova: string;
  taglia: Taglia;
  temperamento: string;
  inizioProduzioneMesi: number;
  fineProduzioneMesi: number;
  origine: Origine;
}

/**
 * Catalogo razze (sezione 6.2 della specifica).
 * `mista` è la voce generica per galline di razza non identificata.
 */
export const RAZZE: Razza[] = [
  // ── Italiane ──────────────────────────────
  { id: "livornese", nome: "Livornese (Leghorn)", uovaAnnoMin: 280, uovaAnnoMax: 320, coloreUova: "Bianche", taglia: "media", temperamento: "Vivace, indipendente", inizioProduzioneMesi: 5, fineProduzioneMesi: 30, origine: "italiana" },
  { id: "ancona", nome: "Ancona", uovaAnnoMin: 180, uovaAnnoMax: 250, coloreUova: "Bianche", taglia: "media", temperamento: "Rustica, attiva", inizioProduzioneMesi: 6, fineProduzioneMesi: 30, origine: "italiana" },
  { id: "padovana", nome: "Padovana", uovaAnnoMin: 150, uovaAnnoMax: 180, coloreUova: "Bianche", taglia: "media", temperamento: "Ornamentale, ciuffo, docile", inizioProduzioneMesi: 6, fineProduzioneMesi: 30, origine: "italiana" },
  { id: "polverara", nome: "Polverara", uovaAnnoMin: 130, uovaAnnoMax: 160, coloreUova: "Bianche", taglia: "media", temperamento: "Ornamentale, ciuffo", inizioProduzioneMesi: 6, fineProduzioneMesi: 30, origine: "italiana" },
  { id: "siciliana", nome: "Siciliana", uovaAnnoMin: 150, uovaAnnoMax: 200, coloreUova: "Bianche", taglia: "piccola", temperamento: "Rustica, resistente al caldo", inizioProduzioneMesi: 6, fineProduzioneMesi: 30, origine: "italiana" },
  { id: "mugellese", nome: "Mugellese", uovaAnnoMin: 120, uovaAnnoMax: 150, coloreUova: "Crema", taglia: "media", temperamento: "Rara, rustica", inizioProduzioneMesi: 6, fineProduzioneMesi: 30, origine: "italiana" },
  { id: "modenese", nome: "Modenese", uovaAnnoMin: 130, uovaAnnoMax: 160, coloreUova: "Bianche", taglia: "media", temperamento: "Rara, robusta", inizioProduzioneMesi: 6, fineProduzioneMesi: 30, origine: "italiana" },
  { id: "romagnola", nome: "Romagnola", uovaAnnoMin: 150, uovaAnnoMax: 180, coloreUova: "Bianche", taglia: "media", temperamento: "Rustica, autonoma", inizioProduzioneMesi: 6, fineProduzioneMesi: 30, origine: "italiana" },
  { id: "valdarno", nome: "Valdarno", uovaAnnoMin: 140, uovaAnnoMax: 170, coloreUova: "Bianche", taglia: "media", temperamento: "Rara, rustica", inizioProduzioneMesi: 6, fineProduzioneMesi: 30, origine: "italiana" },
  { id: "tirolese", nome: "Tirolese", uovaAnnoMin: 120, uovaAnnoMax: 150, coloreUova: "Crema", taglia: "grande", temperamento: "Rara, resistente al freddo", inizioProduzioneMesi: 6, fineProduzioneMesi: 30, origine: "italiana" },

  // ── Internazionali diffuse in Italia ──────
  { id: "rhode-island-red", nome: "Rhode Island Red", uovaAnnoMin: 200, uovaAnnoMax: 280, coloreUova: "Marroni", taglia: "grande", temperamento: "Docile, prolifica", inizioProduzioneMesi: 5, fineProduzioneMesi: 36, origine: "internazionale" },
  { id: "new-hampshire", nome: "New Hampshire", uovaAnnoMin: 200, uovaAnnoMax: 240, coloreUova: "Marroni chiare", taglia: "grande", temperamento: "Docile, tranquilla", inizioProduzioneMesi: 5, fineProduzioneMesi: 36, origine: "internazionale" },
  { id: "sussex", nome: "Sussex", uovaAnnoMin: 200, uovaAnnoMax: 260, coloreUova: "Crema/marroni", taglia: "grande", temperamento: "Docile, curiosa", inizioProduzioneMesi: 5, fineProduzioneMesi: 36, origine: "internazionale" },
  { id: "orpington", nome: "Orpington", uovaAnnoMin: 150, uovaAnnoMax: 200, coloreUova: "Crema/marroni", taglia: "grande", temperamento: "Placida, ottima per famiglie", inizioProduzioneMesi: 6, fineProduzioneMesi: 36, origine: "internazionale" },
  { id: "plymouth-rock", nome: "Plymouth Rock (Amrock)", uovaAnnoMin: 200, uovaAnnoMax: 250, coloreUova: "Marroni", taglia: "grande", temperamento: "Tranquilla, livrea sparviero", inizioProduzioneMesi: 5, fineProduzioneMesi: 36, origine: "internazionale" },
  { id: "wyandotte", nome: "Wyandotte", uovaAnnoMin: 150, uovaAnnoMax: 220, coloreUova: "Crema/marroni", taglia: "grande", temperamento: "Docile, ornamentale", inizioProduzioneMesi: 6, fineProduzioneMesi: 36, origine: "internazionale" },
  { id: "australorp", nome: "Australorp", uovaAnnoMin: 250, uovaAnnoMax: 300, coloreUova: "Marroni", taglia: "grande", temperamento: "Tranquilla, record di deposizione", inizioProduzioneMesi: 5, fineProduzioneMesi: 36, origine: "internazionale" },
  { id: "isa-brown", nome: "ISA Brown", uovaAnnoMin: 280, uovaAnnoMax: 310, coloreUova: "Marroni rosate", taglia: "media", temperamento: "Ibrida, molto produttiva", inizioProduzioneMesi: 4, fineProduzioneMesi: 24, origine: "internazionale" },
  { id: "brahma", nome: "Brahma", uovaAnnoMin: 120, uovaAnnoMax: 150, coloreUova: "Marroni", taglia: "molto-grande", temperamento: "Placida, piumaggio zampe", inizioProduzioneMesi: 7, fineProduzioneMesi: 30, origine: "internazionale" },
  { id: "marans", nome: "Marans", uovaAnnoMin: 150, uovaAnnoMax: 200, coloreUova: "Bruno scuro/cioccolato", taglia: "grande", temperamento: "Tranquilla, uova scurissime", inizioProduzioneMesi: 6, fineProduzioneMesi: 36, origine: "internazionale" },
  { id: "cocincina", nome: "Cocincina", uovaAnnoMin: 100, uovaAnnoMax: 130, coloreUova: "Crema/marroni", taglia: "grande", temperamento: "Ornamentale, placida", inizioProduzioneMesi: 7, fineProduzioneMesi: 30, origine: "internazionale" },
  { id: "araucana", nome: "Araucana", uovaAnnoMin: 150, uovaAnnoMax: 180, coloreUova: "Blu-verdi/azzurre", taglia: "media", temperamento: "Vivace, uova colorate", inizioProduzioneMesi: 6, fineProduzioneMesi: 30, origine: "internazionale" },
  { id: "legbar-crema", nome: "Legbar Crema", uovaAnnoMin: 150, uovaAnnoMax: 200, coloreUova: "Blu-verdi", taglia: "media", temperamento: "Vivace, uova colorate", inizioProduzioneMesi: 5, fineProduzioneMesi: 30, origine: "internazionale" },
  { id: "olive-egger", nome: "Olive Egger (ibrida)", uovaAnnoMin: 150, uovaAnnoMax: 200, coloreUova: "Verde oliva", taglia: "media", temperamento: "Vivace, uova verdi", inizioProduzioneMesi: 5, fineProduzioneMesi: 30, origine: "internazionale" },
  { id: "amburgo", nome: "Amburgo", uovaAnnoMin: 150, uovaAnnoMax: 200, coloreUova: "Bianche", taglia: "leggera", temperamento: "Attiva, livrea millefiori", inizioProduzioneMesi: 6, fineProduzioneMesi: 30, origine: "internazionale" },
  { id: "minorca", nome: "Minorca", uovaAnnoMin: 180, uovaAnnoMax: 220, coloreUova: "Bianche grandi", taglia: "media", temperamento: "Vivace, mediterranea", inizioProduzioneMesi: 6, fineProduzioneMesi: 30, origine: "internazionale" },
  { id: "welsummer", nome: "Welsummer", uovaAnnoMin: 150, uovaAnnoMax: 180, coloreUova: "Bruno terracotta", taglia: "media", temperamento: "Tranquilla, uova scure", inizioProduzioneMesi: 6, fineProduzioneMesi: 30, origine: "internazionale" },
  { id: "barnevelder", nome: "Barnevelder", uovaAnnoMin: 150, uovaAnnoMax: 200, coloreUova: "Bruno scuro", taglia: "media", temperamento: "Docile, uova scure", inizioProduzioneMesi: 6, fineProduzioneMesi: 36, origine: "internazionale" },
  { id: "faverolle", nome: "Faverolle", uovaAnnoMin: 150, uovaAnnoMax: 200, coloreUova: "Crema", taglia: "grande", temperamento: "Docile, piumata, ottima per famiglie", inizioProduzioneMesi: 6, fineProduzioneMesi: 30, origine: "internazionale" },
  { id: "chantecler", nome: "Chantecler", uovaAnnoMin: 150, uovaAnnoMax: 200, coloreUova: "Marroni", taglia: "grande", temperamento: "Resistente al freddo, tranquilla", inizioProduzioneMesi: 6, fineProduzioneMesi: 36, origine: "internazionale" },
  { id: "dominique", nome: "Dominique", uovaAnnoMin: 150, uovaAnnoMax: 200, coloreUova: "Marroni", taglia: "media", temperamento: "Storica americana, tranquilla", inizioProduzioneMesi: 6, fineProduzioneMesi: 30, origine: "internazionale" },
  { id: "java", nome: "Java", uovaAnnoMin: 150, uovaAnnoMax: 180, coloreUova: "Marroni", taglia: "grande", temperamento: "Rara, rustica", inizioProduzioneMesi: 6, fineProduzioneMesi: 36, origine: "internazionale" },
  { id: "buckeye", nome: "Buckeye", uovaAnnoMin: 150, uovaAnnoMax: 200, coloreUova: "Marroni", taglia: "grande", temperamento: "Attiva, resistente al freddo", inizioProduzioneMesi: 6, fineProduzioneMesi: 36, origine: "internazionale" },
  { id: "moroseta", nome: "Moroseta (Silkie)", uovaAnnoMin: 80, uovaAnnoMax: 120, coloreUova: "Crema", taglia: "nana", temperamento: "Ornamentale, placidissima, cova bene", inizioProduzioneMesi: 7, fineProduzioneMesi: 24, origine: "internazionale" },
  { id: "sebright", nome: "Sebright", uovaAnnoMin: 50, uovaAnnoMax: 80, coloreUova: "Bianche", taglia: "nana", temperamento: "Ornamentale, livrea orlata", inizioProduzioneMesi: 7, fineProduzioneMesi: 24, origine: "internazionale" },
  { id: "chabo", nome: "Chabo (Bantam)", uovaAnnoMin: 60, uovaAnnoMax: 100, coloreUova: "Crema/bianche", taglia: "nana", temperamento: "Ornamentale, docile", inizioProduzioneMesi: 7, fineProduzioneMesi: 24, origine: "internazionale" },
  { id: "olandese-ciuffata", nome: "Olandese Ciuffata", uovaAnnoMin: 100, uovaAnnoMax: 140, coloreUova: "Bianche", taglia: "media", temperamento: "Ornamentale, ciuffo grande", inizioProduzioneMesi: 6, fineProduzioneMesi: 30, origine: "internazionale" },
  { id: "phoenix", nome: "Phoenix", uovaAnnoMin: 70, uovaAnnoMax: 100, coloreUova: "Bianche/crema", taglia: "media", temperamento: "Ornamentale, coda lunghissima", inizioProduzioneMesi: 7, fineProduzioneMesi: 30, origine: "internazionale" },
  { id: "la-fleche", nome: "La Flèche", uovaAnnoMin: 150, uovaAnnoMax: 200, coloreUova: "Bianche", taglia: "grande", temperamento: "Rara francese, cresta a V", inizioProduzioneMesi: 6, fineProduzioneMesi: 30, origine: "internazionale" },
  { id: "ayam-cemani", nome: "Ayam Cemani", uovaAnnoMin: 60, uovaAnnoMax: 100, coloreUova: "Crema chiare", taglia: "media", temperamento: "Rara, interamente nera (pelle e ossa)", inizioProduzioneMesi: 7, fineProduzioneMesi: 30, origine: "internazionale" },
  { id: "barrata", nome: "Barrata (Plymouth)", uovaAnnoMin: 200, uovaAnnoMax: 250, coloreUova: "Marroni", taglia: "grande", temperamento: "Tranquilla, livrea barrata bianco-nera", inizioProduzioneMesi: 5, fineProduzioneMesi: 36, origine: "internazionale" },

  // ── Voce generica ─────────────────────────
  { id: "mista", nome: "Gallina mista / razza non conosciuta", uovaAnnoMin: 0, uovaAnnoMax: 0, coloreUova: "—", taglia: "media", temperamento: "—", inizioProduzioneMesi: 6, fineProduzioneMesi: 30, origine: "mista" },
];

const razzeCollator = new Intl.Collator("it", { sensitivity: "base" });

export const RAZZE_ORDINATE_PER_NOME = [...RAZZE].sort((left, right) =>
  razzeCollator.compare(left.nome, right.nome),
);

export function trovaRazza(id: string | null | undefined): Razza | undefined {
  if (!id) return undefined;
  return RAZZE.find((r) => r.id === id);
}

export function uovaAnnoLabel(r: Razza): string {
  if (r.origine === "mista") return "—";
  return `${r.uovaAnnoMin}–${r.uovaAnnoMax}`;
}

export const RAZZE_PER_ORIGINE = {
  italiana: RAZZE.filter((r) => r.origine === "italiana"),
  internazionale: RAZZE.filter((r) => r.origine === "internazionale"),
  mista: RAZZE.filter((r) => r.origine === "mista"),
};
