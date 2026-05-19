import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { GiornoPrevisione } from "./meteo";

/**
 * Salva lo snapshot meteo di oggi nello storico, se non esiste già.
 * Fire-and-forget: errori vengono ignorati (è un nice-to-have, non blocca la UX).
 */
export async function salvaMeteoStorico(
  supabase: SupabaseClient<Database>,
  pollaioId: string,
  giornoOggi: GiornoPrevisione | null,
): Promise<void> {
  if (!giornoOggi) return;
  try {
    await supabase
      .from("meteo_storico")
      .upsert(
        {
          pollaio_id: pollaioId,
          data: giornoOggi.date,
          temp_min: giornoOggi.tempMin,
          temp_max: giornoOggi.tempMax,
          precipitazioni_mm: giornoOggi.precipitazioniMm,
          vento_max_kmh: giornoOggi.ventoMaxKmh,
          condizione: giornoOggi.pomeriggio.icona,
        },
        { onConflict: "pollaio_id,data", ignoreDuplicates: true },
      );
  } catch {
    // ignora — non vogliamo bloccare la pagina meteo per uno snapshot
  }
}
