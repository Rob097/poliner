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
// reasoning_effort "low": dà al modello uno spazio mentale nascosto
// (reasoning tokens) per ragionare prima di rispondere. Indispensabile
// per evitare il "pensare ad alta voce" nel testo finale e per
// rispettare regole di stile/brevità complesse. "minimal" è troppo
// poco per i nostri vincoli; "medium" sarebbe over-kill e costoso.
export const CHAT_PARAMS = {
  max_completion_tokens: 2000,
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
