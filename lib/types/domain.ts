/**
 * Tipi di dominio condivisi.
 *
 * Sono tipi "narrow" usati pervasivamente nell'app — fonte unica di verità.
 * Per i tipi di riga DB (con tutti i campi opzionali) usare invece i tipi
 * generati in `lib/supabase/database.types.ts`.
 */

/** Galline o galli — il tipo di animale gestito nel pollaio. */
export type Tipo = "gallina" | "gallo";

/** Ruoli per membri di un pollaio. */
export type RuoloPollaio = "admin" | "guest";

/**
 * Stati di un uovo nel ciclo di vita.
 * `non_commestibile` è assegnato dal DB alle uova deposte durante una
 * sospensione (farmaci); `scartato` è la fine di un uovo buttato via.
 */
export type StatoUovo =
  | "disponibile"
  | "non_commestibile"
  | "scartato"
  | "consumato"
  | "regalato";

/** Modalità di conservazione degli uova. */
export type Conservazione = "ambiente" | "frigo";
