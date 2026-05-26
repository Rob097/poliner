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
  chat: process.env.OPENAI_CHAT_MODEL ?? "gpt-5-nano",
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
export const CHAT_PARAMS = {
  max_completion_tokens: 2000,
  reasoning_effort: "medium" as const,
};

export const TITLE_PARAMS = {
  max_completion_tokens: 50,
  reasoning_effort: "minimal" as const,
};

// Rate limit applicativo (per utente, al giorno UTC).
export const QUOTA_DAILY_LIMIT = 30;

// Quanti messaggi della conversazione passare al modello come storico.
export const MAX_HISTORY_MESSAGES = 20;
