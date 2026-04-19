-- ============================================================
-- Migration v2 terrain Wilfried — Avril 2026
-- Restructuration observations + traitements
-- ============================================================

-- 1. Nouvelles colonnes observations
ALTER TABLE observations ADD COLUMN IF NOT EXISTS stade_bbch TEXT;
ALTER TABLE observations ADD COLUMN IF NOT EXISTS repetition INTEGER;
ALTER TABLE observations ADD COLUMN IF NOT EXISTS escargots BOOLEAN;
ALTER TABLE observations ADD COLUMN IF NOT EXISTS acariens BOOLEAN;
ALTER TABLE observations ADD COLUMN IF NOT EXISTS poids_100_baies NUMERIC;

-- 2. Table maladies_observations (structure Wilfried — 20 feuilles)
CREATE TABLE IF NOT EXISTS maladies_observations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  observation_id UUID NOT NULL REFERENCES observations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('mildiou', 'oidium', 'botrytis', 'black_rot')),
  zone TEXT NOT NULL CHECK (zone IN ('feuille', 'grappe')),
  nb_feuilles_atteintes INTEGER DEFAULT 0 CHECK (nb_feuilles_atteintes >= 0 AND nb_feuilles_atteintes <= 20),
  frequence_pct NUMERIC GENERATED ALWAYS AS (ROUND(nb_feuilles_atteintes * 100.0 / 20, 1)) STORED,
  surface_atteinte_pct NUMERIC DEFAULT 0 CHECK (surface_atteinte_pct >= 0 AND surface_atteinte_pct <= 100),
  intensite_pct NUMERIC GENERATED ALWAYS AS (ROUND(nb_feuilles_atteintes * 100.0 / 20 * surface_atteinte_pct / 100, 1)) STORED,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS pour maladies_observations
ALTER TABLE maladies_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_select_maladies_observations" ON maladies_observations FOR SELECT USING (true);
CREATE POLICY "allow_insert_maladies_observations" ON maladies_observations FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_update_maladies_observations" ON maladies_observations FOR UPDATE USING (true);
CREATE POLICY "allow_delete_maladies_observations" ON maladies_observations FOR DELETE USING (true);

-- 3. Nouvelles colonnes traitements
ALTER TABLE traitements ADD COLUMN IF NOT EXISTS stade TEXT;
ALTER TABLE traitements ADD COLUMN IF NOT EXISTS zone_traitee_type TEXT CHECK (zone_traitee_type IN ('rang', 'surface'));
ALTER TABLE traitements ADD COLUMN IF NOT EXISTS zone_traitee_rang TEXT;
ALTER TABLE traitements ADD COLUMN IF NOT EXISTS zone_traitee_surface_m2 NUMERIC;
ALTER TABLE traitements ADD COLUMN IF NOT EXISTS type_application TEXT CHECK (type_application IN ('pulve_dos', 'tracteur', 'panneaux_recuperateurs'));
ALTER TABLE traitements ADD COLUMN IF NOT EXISTS prelevement_sol BOOLEAN DEFAULT false;
ALTER TABLE traitements ADD COLUMN IF NOT EXISTS couvert TEXT;
ALTER TABLE traitements ADD COLUMN IF NOT EXISTS volume_bouillie_l NUMERIC;
ALTER TABLE traitements ADD COLUMN IF NOT EXISTS ph_eau NUMERIC;
ALTER TABLE traitements ADD COLUMN IF NOT EXISTS ph_bouillie NUMERIC;
ALTER TABLE traitements ADD COLUMN IF NOT EXISTS origine_eau TEXT;

-- 4. Index pour performance
CREATE INDEX IF NOT EXISTS idx_maladies_obs_observation_id ON maladies_observations(observation_id);
CREATE INDEX IF NOT EXISTS idx_maladies_obs_type ON maladies_observations(type);
