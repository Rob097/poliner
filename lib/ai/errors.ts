import OpenAI from "openai";
import { QUOTA_DAILY_LIMIT } from "./config";

export type AssistantErrorCode =
  | "quota_daily"
  | "quota_openai"
  | "auth"
  | "network"
  | "server"
  | "unknown";

export interface AssistantError {
  code: AssistantErrorCode;
  message: string;
}

export function mapOpenAIError(err: unknown): AssistantError {
  if (err instanceof OpenAI.APIError) {
    const status = err.status;
    if (status === 429) {
      return {
        code: "quota_openai",
        message:
          "L'assistente è momentaneamente molto richiesto. Riprova tra qualche minuto.",
      };
    }
    if (status === 401 || status === 403) {
      return {
        code: "auth",
        message:
          "C'è un problema di configurazione dell'assistente. Avvisa l'amministratore.",
      };
    }
    if (typeof status === "number" && status >= 500) {
      return {
        code: "server",
        message: "L'assistente non risponde adesso. Riprova tra poco.",
      };
    }
  }
  if (err instanceof Error && /timeout|network|fetch|ENOTFOUND|ECONN/i.test(err.message)) {
    return {
      code: "network",
      message:
        "Non riesco a contattare l'assistente. Controlla la connessione e riprova.",
    };
  }
  return {
    code: "unknown",
    message: "C'è stato un intoppo nel parlare con l'assistente. Riprova tra poco.",
  };
}

export const DAILY_QUOTA_ERROR: AssistantError = {
  code: "quota_daily",
  message: `Hai raggiunto i ${QUOTA_DAILY_LIMIT} messaggi di oggi. Riprova domani.`,
};
