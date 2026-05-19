export type Stagione = "inverno" | "primavera" | "estate" | "autunno";

export interface ConsiglioStagionale {
  stagione: Stagione;
  icona: string;
  titolo: string;
  messaggio: string;
}

/**
 * Determina la stagione astronomica/meteorologica nell'emisfero nord (semplificata).
 * Marzo–Maggio: primavera. Giugno–Agosto: estate. Sett–Nov: autunno. Dic–Feb: inverno.
 */
export function stagioneCorrente(d: Date = new Date()): Stagione {
  const m = d.getMonth(); // 0-11
  if (m === 11 || m <= 1) return "inverno";
  if (m <= 4) return "primavera";
  if (m <= 7) return "estate";
  return "autunno";
}

/**
 * Consiglio stagionale dinamico — varia leggermente all'interno della stagione
 * (es. fine estate / inizio autunno → "preparati alla muta").
 */
export function consiglioStagionale(d: Date = new Date()): ConsiglioStagionale {
  const m = d.getMonth();
  const day = d.getDate();
  const stagione = stagioneCorrente(d);

  // Fine estate (15 ago – fine ago): preludio muta
  if (m === 7 && day >= 15) {
    return {
      stagione: "estate",
      icona: "🍂",
      titolo: "Si avvicina la muta",
      messaggio:
        "Settembre si avvicina: le galline potrebbero iniziare la muta. È normale se la produzione cala per qualche settimana.",
    };
  }

  if (stagione === "autunno") {
    return {
      stagione,
      icona: "🍂",
      titolo: "Le giornate si accorciano",
      messaggio:
        "Le ore di luce si accorciano: la produzione potrebbe diminuire fino alla primavera.",
    };
  }

  if (stagione === "inverno") {
    return {
      stagione,
      icona: "❄️",
      titolo: "Inverno nel pollaio",
      messaggio:
        "Con il freddo le galline bevono meno — controlla più spesso l'abbeveratoio e che l'acqua non ghiacci.",
    };
  }

  if (stagione === "primavera") {
    return {
      stagione,
      icona: "🌸",
      titolo: "La produzione riprende",
      messaggio:
        "Aumentano le ore di luce: la produzione delle uova dovrebbe riprendere a salire!",
    };
  }

  // Estate piena
  return {
    stagione,
    icona: "☀️",
    titolo: "Estate calda",
    messaggio:
      "Caldo in arrivo: assicurati che le galline abbiano sempre acqua fresca e ombra disponibile.",
  };
}
