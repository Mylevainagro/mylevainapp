-- ============================================================
-- Migration 021 — Saisie par lots (observations)
-- ============================================================

-- Table observation_lots (enfants d'une session d'observation par lot)
CREATE TABLE IF NOT EXISTS observation_lots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL, -- identifiant de la session de saisie
  parcelle_id UUID NOT NULL REFERENCES parcelles(id),
  placette_id UUID REFERENCES placettes(id),
  rang TEXT, -- "R1", "R2"… (si mode rang)
  modalite_id TEXT NOT NULL,
  date TEXT NOT NULL,
  stade_bbch TEXT,
  -- Indicateurs rapides
  vigueur INTEGER CHECK (vigueur >= 0 AND vigueur <= 5),
  croissance INTEGER CHECK (croissance >= 0 AND croissance <= 5),
  couleur_feuilles INTEGER CHECK (couleur_feuilles >= 0 AND couleur_feuilles <= 5),
  turgescence INTEGER CHECK (turgescence >= 0 AND turgescence <= 5),
  -- Symptômes
  brulures INTEGER CHECK (brulures >= 0 AND brulures <= 5),
  necroses INTEGER CHECK (necroses >= 0 AND necroses <= 5),
  escargots BOOLEAN DEFAULT false,
  acariens BOOLEAN DEFAULT false,
  -- Maladie rapide
  maladie_type TEXT,
  maladie_nb_feuilles INTEGER,
  maladie_surface_pct NUMERIC,
  -- Rendement
  nb_grappes INTEGER,
  poids_moyen_grappe NUMERIC,
  poids_100_baies NUMERIC,
  -- Notes
  dose TEXT,
  commentaire TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE observation_lots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_observation_lots" ON observation_lots FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_observation_lots_session ON observation_lots(session_id);
CREATE INDEX IF NOT EXISTS idx_observation_lots_parcelle ON observation_lots(parcelle_id);
