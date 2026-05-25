// Placeholder per le write tools dell'assistente AI.
//
// In v1 l'assistente è SOLO LETTURA. Quando vorremo attivare le
// azioni di scrittura (es. "Segna che Babet ha fatto un uovo",
// "Aggiungi mangime alla lista spesa"), aggiungeremo qui le
// definizioni + handler (registra_uovo, aggiungi_voce_lista_spesa,
// crea_nota, …) e cableremo lato UI uno step di conferma esplicito
// dell'utente prima dell'esecuzione.
//
// Il registry in `./index.ts` espone già `WRITE_TOOLS` come slot
// pronto: basterà popolarlo qui e includere `WRITE_TOOLS` nella
// chiamata al modello (insieme a `READ_TOOLS`).

export {};
