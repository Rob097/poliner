ALTER TABLE animali
  ADD COLUMN descrizione_pubblica text;

COMMENT ON COLUMN animali.descrizione_pubblica IS
  'Descrizione/presentazione opzionale dell''animale, visibile nella pagina pubblica del pollaio quando attiva.';
