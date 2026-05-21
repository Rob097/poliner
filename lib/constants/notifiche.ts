export type CategoriaNotificaId =
  | "manutenzione"
  | "uova_scadenza"
  | "meteo"
  | "chiusura_pollaio"
  | "promemoria"
  | "scorte"
  | "trattamenti"
  | "fine_produzione"
  | "muta_lunga"
  | "richiesta_uova";

export interface CategoriaNotifica {
  id: CategoriaNotificaId;
  label: string;
  desc: string;
  icona: string;
  defaultOn: boolean;
}

export const CATEGORIE_NOTIFICHE: CategoriaNotifica[] = [
  {
    id: "manutenzione",
    label: "Manutenzione",
    desc: "Pulizie scadute o in scadenza",
    icona: "🧹",
    defaultOn: true,
  },
  {
    id: "uova_scadenza",
    label: "Uova in scadenza",
    desc: "Avviso quando le uova stanno per scadere",
    icona: "🥚",
    defaultOn: true,
  },
  {
    id: "meteo",
    label: "Meteo",
    desc: "Avvisi pioggia, vento, caldo, freddo",
    icona: "⛅",
    defaultOn: true,
  },
  {
    id: "chiusura_pollaio",
    label: "Chiusura pollaio",
    desc: "Al tramonto, se risulta ancora aperto",
    icona: "🌙",
    defaultOn: true,
  },
  {
    id: "promemoria",
    label: "Promemoria",
    desc: "Le tue note con data e ora",
    icona: "🔔",
    defaultOn: true,
  },
  {
    id: "scorte",
    label: "Scorte basse",
    desc: "Quando mais, pellet... stanno finendo",
    icona: "📦",
    defaultOn: true,
  },
  {
    id: "trattamenti",
    label: "Trattamenti",
    desc: "Prossime sverminazioni e antiparassitari",
    icona: "💊",
    defaultOn: true,
  },
  {
    id: "fine_produzione",
    label: "Fine vita produttiva",
    desc: "Quando una gallina si avvicina al picco",
    icona: "🐔",
    defaultOn: false,
  },
  {
    id: "muta_lunga",
    label: "Muta lunga",
    desc: "Se una gallina è in muta da oltre 10 settimane",
    icona: "🪶",
    defaultOn: true,
  },
  {
    id: "richiesta_uova",
    label: "Richieste uova",
    desc: "Quando un guest del pollaio chiede uova",
    icona: "🙏",
    defaultOn: true,
  },
];

export function categorieDefault(): Record<CategoriaNotificaId, boolean> {
  const out = {} as Record<CategoriaNotificaId, boolean>;
  for (const c of CATEGORIE_NOTIFICHE) out[c.id] = c.defaultOn;
  return out;
}
