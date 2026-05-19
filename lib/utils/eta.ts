import { trovaRazza, type Razza } from "@/lib/data/razze";

/**
 * Età testuale tipo "2 anni e 3 mesi" / "8 mesi".
 */
export function calcolaEta(dataNascita: string | Date, oggi: Date = new Date()): string {
  const nascita = typeof dataNascita === "string" ? new Date(dataNascita) : dataNascita;
  const diffMs = oggi.getTime() - nascita.getTime();
  const mesiTotali = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));
  const anni = Math.floor(mesiTotali / 12);
  const mesiResto = mesiTotali % 12;

  if (anni === 0) {
    if (mesiResto === 0) return "Meno di un mese";
    return `${mesiResto} mes${mesiResto === 1 ? "e" : "i"}`;
  }
  if (mesiResto === 0) return `${anni} ann${anni === 1 ? "o" : "i"}`;
  return `${anni} ann${anni === 1 ? "o" : "i"} e ${mesiResto} mes${mesiResto === 1 ? "e" : "i"}`;
}

export type Fase = "pollastra" | "piena" | "ridotta" | "fine";

export interface FaseProduttiva {
  fase: Fase;
  label: string;
  colore: string;
}

const FASI: Record<Fase, Omit<FaseProduttiva, "fase">> = {
  pollastra: { label: "Non ancora in deposizione", colore: "#A8D1FF" },
  piena: { label: "Piena produzione", colore: "#B5D4B5" },
  ridotta: { label: "Produzione in calo", colore: "#FFE07A" },
  fine: { label: "Oltre il picco produttivo", colore: "#FFD6E0" },
};

/**
 * Fase produttiva basata su età e (se nota) razza.
 * Solo per le galline; per i galli torna null.
 */
export function faseProduttiva(
  args: {
    tipo: "gallina" | "gallo";
    dataNascita: string | Date | null;
    razzaId?: string | null;
  },
  oggi: Date = new Date(),
): FaseProduttiva | null {
  if (args.tipo === "gallo") return null;
  if (!args.dataNascita) return null;

  const nascita = typeof args.dataNascita === "string" ? new Date(args.dataNascita) : args.dataNascita;
  const mesi = Math.floor((oggi.getTime() - nascita.getTime()) / (1000 * 60 * 60 * 24 * 30.44));

  const razza: Razza | undefined = trovaRazza(args.razzaId);
  const inizio = razza?.inizioProduzioneMesi ?? 5;
  const fine = razza?.fineProduzioneMesi ?? 36;

  if (mesi < inizio) return { fase: "pollastra", ...FASI.pollastra };
  if (mesi <= 24) return { fase: "piena", ...FASI.piena };
  if (mesi <= fine) return { fase: "ridotta", ...FASI.ridotta };
  return { fase: "fine", ...FASI.fine };
}
