CREATE TYPE tipo_evento_inserimento AS ENUM (
  'quarantena_inizio',
  'quarantena_fine',
  'presentazione_visiva_inizio',
  'presentazione_visiva_fine',
  'convivenza_inizio',
  'completato',
  'nota'
);

CREATE TABLE eventi_inserimento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pollaio_id uuid NOT NULL REFERENCES pollai(id) ON DELETE CASCADE,
  animale_id uuid NOT NULL REFERENCES animali(id) ON DELETE CASCADE,
  tipo tipo_evento_inserimento NOT NULL,
  data date NOT NULL DEFAULT current_date,
  note text,
  foto_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_eventi_inserimento_animale ON eventi_inserimento(animale_id, data DESC);
CREATE INDEX idx_eventi_inserimento_pollaio ON eventi_inserimento(pollaio_id, data DESC);

ALTER TABLE eventi_inserimento ENABLE ROW LEVEL SECURITY;

CREATE POLICY ei_select ON eventi_inserimento
  FOR SELECT TO authenticated
  USING (is_my_pollaio(pollaio_id));

CREATE POLICY ei_insert ON eventi_inserimento
  FOR INSERT TO authenticated
  WITH CHECK (is_my_pollaio(pollaio_id));

CREATE POLICY ei_update ON eventi_inserimento
  FOR UPDATE TO authenticated
  USING (is_my_pollaio(pollaio_id));

CREATE POLICY ei_delete ON eventi_inserimento
  FOR DELETE TO authenticated
  USING (is_my_pollaio(pollaio_id));

CREATE OR REPLACE FUNCTION animale_in_inserimento(p_animale_id uuid)
RETURNS boolean
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM eventi_inserimento WHERE animale_id = p_animale_id)
     AND NOT EXISTS (
       SELECT 1 FROM eventi_inserimento
       WHERE animale_id = p_animale_id AND tipo = 'completato'
     );
$$;

GRANT EXECUTE ON FUNCTION animale_in_inserimento(uuid) TO authenticated;

COMMENT ON TABLE eventi_inserimento IS
  'Timeline di eventi liberi che documentano l''inserimento di una nuova gallina nel pollaio (quarantena, visiva, convivenza, completato, nota).';
