-- Colonne sulla tabella pollai
ALTER TABLE pollai
  ADD COLUMN pubblico_attivo boolean DEFAULT false NOT NULL,
  ADD COLUMN pubblico_slug text UNIQUE,
  ADD COLUMN descrizione_pubblica text;

ALTER TABLE pollai
  ADD CONSTRAINT pollai_pubblico_slug_format
  CHECK (pubblico_slug IS NULL OR pubblico_slug ~ '^[a-z0-9-]{3,40}$');

CREATE INDEX idx_pollai_pubblico_slug ON pollai(pubblico_slug)
  WHERE pubblico_attivo = true;

-- RLS policies pubbliche (lettura anonima quando il pollaio è pubblico)
CREATE POLICY pollai_select_public ON pollai
  FOR SELECT TO anon, authenticated
  USING (pubblico_attivo = true);

CREATE POLICY animali_select_public ON animali
  FOR SELECT TO anon, authenticated
  USING (
    pollaio_id IN (SELECT id FROM pollai WHERE pubblico_attivo = true)
    AND defunta_il IS NULL
    AND attivo = true
  );

-- RPC stats aggregate per pagina pubblica (security definer)
CREATE OR REPLACE FUNCTION public_pollaio_stats(p_slug text)
RETURNS TABLE(uova_totali bigint, uova_ultimo_mese bigint, galline_count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE((SELECT COUNT(*) FROM uova u
              JOIN pollai p ON u.pollaio_id = p.id
              WHERE p.pubblico_slug = p_slug AND p.pubblico_attivo = true), 0),
    COALESCE((SELECT COUNT(*) FROM uova u
              JOIN pollai p ON u.pollaio_id = p.id
              WHERE p.pubblico_slug = p_slug AND p.pubblico_attivo = true
                AND u.data_deposizione >= (current_date - 30)), 0),
    COALESCE((SELECT COUNT(*) FROM animali a
              JOIN pollai p ON a.pollaio_id = p.id
              WHERE p.pubblico_slug = p_slug AND p.pubblico_attivo = true
                AND a.attivo = true AND a.defunta_il IS NULL), 0);
$$;

GRANT EXECUTE ON FUNCTION public_pollaio_stats(text) TO anon, authenticated;

COMMENT ON COLUMN pollai.pubblico_attivo IS 'Se true, la pagina pubblica /p/<slug> è accessibile a chiunque.';
COMMENT ON COLUMN pollai.pubblico_slug IS 'Slug univoco per la URL pubblica, formato [a-z0-9-]{3,40}.';
COMMENT ON COLUMN pollai.descrizione_pubblica IS 'Testo mostrato nella pagina pubblica del pollaio.';
