import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { QUOTA_DAILY_LIMIT } from "./config";

export interface QuotaCheckResult {
  allowed: boolean;
  used: number;
  limit: number;
}

function oggiUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Verifica il quota giornaliero e, se sotto soglia, incrementa di 1 e
 * ritorna `allowed: true`. In caso di superamento ritorna `allowed: false`
 * senza incrementare.
 *
 * Race condition: due richieste concorrenti dello stesso utente nel
 * millisecondo possono entrambe leggere il vecchio count e venire allowed,
 * sforando di 1 il limite. Accettato (app single-user in pratica).
 */
/**
 * Lettura sola dell'uso giornaliero (non incrementa). Per UI/indicatori.
 */
export async function getQuotaUsage(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ used: number; limit: number }> {
  const data = oggiUTC();
  const { data: row } = await supabase
    .from("chat_quota_uso")
    .select("count")
    .eq("user_id", userId)
    .eq("data", data)
    .maybeSingle();
  return { used: row?.count ?? 0, limit: QUOTA_DAILY_LIMIT };
}

export async function checkAndIncrementQuota(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<QuotaCheckResult> {
  const data = oggiUTC();
  const { data: existing } = await supabase
    .from("chat_quota_uso")
    .select("count")
    .eq("user_id", userId)
    .eq("data", data)
    .maybeSingle();

  const used = existing?.count ?? 0;
  if (used >= QUOTA_DAILY_LIMIT) {
    return { allowed: false, used, limit: QUOTA_DAILY_LIMIT };
  }
  const newCount = used + 1;
  await supabase
    .from("chat_quota_uso")
    .upsert(
      { user_id: userId, data, count: newCount },
      { onConflict: "user_id,data" },
    );
  return { allowed: true, used: newCount, limit: QUOTA_DAILY_LIMIT };
}
