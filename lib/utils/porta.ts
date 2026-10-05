/**
 * Porta automatica: orari (ore italiane, "HH:MM") a cui apertura e chiusura
 * del pollaio vengono registrate da sole. La registrazione avviene nel DB
 * (funzione `registra_porte_automatiche`, chiamata ogni minuto da pg_cron) e
 * non sovrascrive mai un orario già presente: qui c'è solo la parte di
 * validazione e presentazione.
 */

export interface PortaAutomatica {
  attiva: boolean;
  /** "HH:MM", null = si apre a mano. */
  apertura: string | null;
  /** "HH:MM", null = si chiude a mano. */
  chiusura: string | null;
}

const ORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isOraValida(ora: string): boolean {
  return ORA_RE.test(ora);
}

/** "07:00:00" (TIME di Postgres) → "07:00". */
export function oraHHMM(time: string | null | undefined): string | null {
  return time ? time.slice(0, 5) : null;
}

export function portaDaPollaio(p: {
  porta_auto_attiva: boolean;
  porta_auto_apertura: string | null;
  porta_auto_chiusura: string | null;
}): PortaAutomatica {
  return {
    attiva: p.porta_auto_attiva,
    apertura: oraHHMM(p.porta_auto_apertura),
    chiusura: oraHHMM(p.porta_auto_chiusura),
  };
}

/** Messaggio d'errore per l'utente, oppure null se la configurazione è valida. */
export function validaPorta(porta: PortaAutomatica): string | null {
  if (porta.apertura && !isOraValida(porta.apertura)) {
    return "L'orario di apertura non è valido.";
  }
  if (porta.chiusura && !isOraValida(porta.chiusura)) {
    return "L'orario di chiusura non è valido.";
  }
  if (porta.attiva && !porta.apertura && !porta.chiusura) {
    return "Indica almeno un orario, di apertura o di chiusura.";
  }
  if (porta.apertura && porta.chiusura && porta.chiusura <= porta.apertura) {
    return "La chiusura deve essere dopo l'apertura.";
  }
  return null;
}

/** "apre alle 07:00 · chiude alle 20:00" (solo le parti impostate). */
export function riepilogoPorta(porta: PortaAutomatica): string {
  if (!porta.attiva) return "Non attiva";
  return [
    porta.apertura && `apre alle ${porta.apertura}`,
    porta.chiusura && `chiude alle ${porta.chiusura}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Orari automatici ancora attesi oggi, cioè quelli che la porta registrerà
 * se nessuno interviene a mano. Rispecchia le condizioni della funzione SQL.
 */
export function automatismiInArrivo(
  porta: PortaAutomatica,
  oraAdesso: string,
  oggi: { oraUscita: string | null; oraRientro: string | null },
): { apertura: string | null; chiusura: string | null } {
  if (!porta.attiva) return { apertura: null, chiusura: null };
  const uscita = oraHHMM(oggi.oraUscita);
  const rientro = oraHHMM(oggi.oraRientro);

  const apertura =
    porta.apertura && !uscita && !rientro && oraAdesso < porta.apertura
      ? porta.apertura
      : null;
  // La chiusura scatta solo se il pollaio risulta (o risulterà) aperto prima.
  const apertoPrima = uscita ? uscita < (porta.chiusura ?? "") : apertura !== null;
  const chiusura =
    porta.chiusura && !rientro && apertoPrima && oraAdesso < porta.chiusura
      ? porta.chiusura
      : null;
  return { apertura, chiusura };
}
