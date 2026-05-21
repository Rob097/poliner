ALTER TABLE eventi_salute
  ADD COLUMN home_hospital boolean DEFAULT false NOT NULL,
  ADD COLUMN hh_da date,
  ADD COLUMN hh_a date;

CREATE INDEX idx_eventi_salute_hh_attivo ON eventi_salute(pollaio_id)
  WHERE home_hospital = true AND hh_a IS NULL;

COMMENT ON COLUMN eventi_salute.home_hospital IS
  'L''animale è stato spostato a casa per cure. hh_da/hh_a delimitano il periodo. hh_a NULL = ancora in casa.';
COMMENT ON COLUMN eventi_salute.hh_da IS 'Data di inizio Home Hospital.';
COMMENT ON COLUMN eventi_salute.hh_a IS 'Data di fine Home Hospital. NULL = ancora in casa.';
