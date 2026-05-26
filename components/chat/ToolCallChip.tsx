"use client";

const LABEL: Record<string, string> = {
  // Read
  get_animali: "Controllo le galline",
  get_animale_dettaglio: "Apro la scheda della gallina",
  get_uova_recenti: "Conto le uova recenti",
  get_uova_stats: "Calcolo le statistiche delle uova",
  get_scorte: "Controllo le scorte",
  get_spese_recenti: "Sommo le spese recenti",
  get_lista_spesa: "Apro la lista della spesa",
  get_note_recenti: "Cerco tra le note",
  get_manutenzioni_aperte: "Verifico le manutenzioni",
  get_rubrica: "Apro la rubrica",
  get_impostazioni_app: "Cerco nella guida dell'app",
  // Write
  registra_uovo: "Registro l'uovo",
  aggiungi_lista_spesa: "Aggiungo alla lista della spesa",
  crea_nota: "Sto scrivendo la nota",
  registra_spesa: "Registro la spesa",
  registra_evento_salute: "Apro l'evento di salute",
  registra_rifornimento_scorta: "Aggiorno la scorta",
  spunta_lista_spesa: "Spunto dalla lista",
  registra_manutenzione: "Registro la manutenzione",
  marca_uovo_consumato: "Segno l'uovo come consumato",
};

interface Props {
  toolName: string;
}

export function ToolCallChip({ toolName }: Props) {
  const label = LABEL[toolName] ?? `Eseguo ${toolName}`;
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-(--surface-alt) border border-(--border) text-[13px] text-(--text-secondary)">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-(--primary) animate-pulse" aria-hidden />
      {label}…
    </div>
  );
}
