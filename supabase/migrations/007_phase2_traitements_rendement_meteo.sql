-- ============================================================
-- Migration 007 : Phase 2 — Traitements enrichis + Rendement + Météo
-- ============================================================

-- Enrichissement traitements
ALTER TABLE traitements ADD COLUMN IF NOT EXISTS type_traitement TEXT
  CHECK (type_traitement IN ('cuivre', 'soufre', 'levain', 'biocontrole', 'phytosanitaire', 'fertilisation', 'autre'));
ALTER TABLE traitements ADD COLUMN IF NOT EXISTS matiere_active TEXT;
ALTER TABLE traitements ADD COLUMN IF NOT EXISTS concentration REAL;
ALTER TABLE traitements ADD COLUMN IF NOT EXISTS unite TEXT;
ALTER TABLE traitements ADD COLUMN IF NOT EXISTS objectif TEXT;
ALTER TABLE traitements ADD COLUMN IF NOT EXISTS campagne TEXT;

-- Résumé campagne
CREATE TABLE resume_campagne (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_culture_id UUID REFERENCES zones_culture(id) ON DELETE CASCADE,
  campagne TEXT NOT NULL,
  nb_passages_cuivre INTEGER DEFAULT 0,
  nb_passages_total INTEGER DEFAULT 0,
  pression_mildiou_estimee REAL,
  pression_oidium_estimee REAL,
  incidents_sanitaires TEXT,
  commentaire_general TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(zone_culture_id, campagne)
);

-- Indicateurs rendement dans observations
ALTER TABLE observations ADD COLUMN IF NOT EXISTS nombre_grappes INTEGER;
ALTER TABLE observations ADD COLUMN IF NOT EXISTS poids_moyen_grappe REAL;
ALTER TABLE observations ADD COLUMN IF NOT EXISTS rendement_estime REAL;
ALTER TABLE observations ADD COLUMN IF NOT EXISTS rendement_reel REAL;

-- Météo journalière
CREATE TABLE meteo_jour (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_culture_id UUID REFERENCES zones_culture(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  temperature REAL,
  humidite REAL,
  pluie REAL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(zone_culture_id, date)
);

-- Vues SQL pour traitements
CREATE OR REPLACE VIEW derniers_traitements AS
SELECT DISTINCT ON (parcelle_id, rang)
  id, parcelle_id, rang, modalite, date, produit, dose,
  type_traitement, campagne,
  (CURRENT_DATE - date) AS jours_depuis
FROM traitements
ORDER BY parcelle_id, rang, date DESC;

CREATE OR REPLACE VIEW nb_passages AS
SELECT
  parcelle_id,
  campagne,
  COUNT(*) AS nb_total,
  COUNT(*) FILTER (WHERE type_traitement = 'cuivre') AS nb_cuivre
FROM traitements
WHERE campagne IS NOT NULL
GROUP BY parcelle_id, campagne;
