# lib/queries

Read-side data loaders, organizzati per dominio/pagina. Ogni file espone
funzioni `async` che incapsulano i `supabase.from(...).select(...)` usati
da una specifica pagina o feature.

Linee guida:

- Le query restituiscono dati già normalizzati per la UI (no `as unknown as`
  nelle pagine — il cast vive qui se proprio serve).
- Errori loggati con `console.error` ma non lanciati di default: si torna
  un valore "vuoto" sicuro (es. `[]`, `null`) così la pagina non crasha.
- Le scritture rimangono in `lib/actions/` o `app/<route>/actions.ts`.

Non è un layer ORM: è solo dove vivono le `select()` perché non si ripetano
in più pagine.
