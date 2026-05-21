/**
 * Risultato standard per i server action.
 *
 * Storicamente alcuni action ritornavano `error` e altri `errore`. Adesso
 * tutti devono usare questa interfaccia, con `error` come campo unico.
 *
 * Per gli action che ritornano dati aggiuntivi, estendere via intersection:
 *   `Promise<ActionResult & { id?: string }>`
 */
export interface ActionResult {
  ok: boolean;
  error?: string;
}
