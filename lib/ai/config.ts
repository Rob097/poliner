// ╔══════════════════════════════════════════════════════════╗
// ║ Configurazione modelli AI per Poliner.                   ║
// ║ Per cambiare modello: aggiorna `MODELS` qui sotto oppure  ║
// ║ override via env (`OPENAI_CHAT_MODEL`, `OPENAI_TITLE_MODEL`).
// ║ I parametri specifici del modello stanno in `CHAT_PARAMS` ║
// ║ / `TITLE_PARAMS`: se passi a un modello con API diversa   ║
// ║ (es. supporta `temperature` invece di `reasoning_effort`),║
// ║ aggiusta lì.                                              ║
// ╚══════════════════════════════════════════════════════════╝

export const MODELS = {
  // gpt-5-mini è il sweet spot per qualità/costo per la chat:
  // miglior vision di gpt-5-nano (utile per le foto delle galline),
  // più aderente alle regole di stile, abbastanza veloce con
  // reasoning_effort 'low'. Override via env se vuoi cambiare.
  chat: process.env.OPENAI_CHAT_MODEL ?? "gpt-5-mini",
  // Il titolo della conversazione è un compito banale: gpt-5-nano
  // basta e avanza, costa meno.
  title: process.env.OPENAI_TITLE_MODEL ?? "gpt-5-nano",
} as const;

// Parametri passati a chat.completions.create per la chat principale.
// I modelli GPT-5 usano `max_completion_tokens` e (opzionalmente)
// `reasoning_effort`. Se passi a un modello GPT-4, sostituisci con
// { max_tokens, temperature }.
//
// reasoning_effort "medium": il modello ha spazio mentale nascosto
// sufficiente per identificare razze da foto, rispettare regole di
// stile complesse e non "pensare ad alta voce" nel testo. Costa un
// po' di più di "low" ma è il livello che dà risposte di qualità
// per il nostro caso d'uso. Abbassa a "low" se i costi salgono.
// NB: max_completion_tokens INCLUDE i reasoning tokens nascosti.
// Con gpt-5-mini + reasoning_effort 'low' tipicamente si usano
// 200-500 reasoning tokens + 200-500 testo. 4000 lascia margine
// abbondante per risposte articolate o sequenze tool-call → testo.
export const CHAT_PARAMS = {
  max_completion_tokens: 4000,
  reasoning_effort: "low" as const,
};

export const TITLE_PARAMS = {
  max_completion_tokens: 50,
  reasoning_effort: "minimal" as const,
};

// Rate limit applicativo (per utente, al giorno UTC).
export const QUOTA_DAILY_LIMIT = 30;

// Quanti messaggi della conversazione passare al modello come storico.
export const MAX_HISTORY_MESSAGES = 20;
