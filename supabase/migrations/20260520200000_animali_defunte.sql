ALTER TABLE animali
  ADD COLUMN defunta_il date,
  ADD COLUMN causa_decesso text,
  ADD COLUMN note_decesso text;

CREATE INDEX idx_animali_defunta_il ON animali(pollaio_id, defunta_il)
  WHERE defunta_il IS NOT NULL;

COMMENT ON COLUMN animali.defunta_il IS
  'Data del decesso. NULL = viva. Diverso da attivo=false (archiviazione per cessione, regalo, ecc).';
COMMENT ON COLUMN animali.causa_decesso IS 'Causa del decesso, testo libero opzionale.';
COMMENT ON COLUMN animali.note_decesso IS 'Note aggiuntive sul decesso.';
