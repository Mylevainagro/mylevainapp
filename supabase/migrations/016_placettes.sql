-- ============================================================
-- Migration 016 — Placettes (unité expérimentale d'observation)
-- Spec terrain Wilfried — notion de placette
-- ============================================================

-- 1. Table placettes
CREATE TABLE IF NOT EXISTS placettes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parcelle_id UUID NOT NULL REFERENCES parcelles(id) ON DELETE CASCADE,
  modalite_id TEXT, -- code modalité (M0, M1, M2…)
  nom TEXT NOT NULL, -- ex: "Placette 1", "Placette 2"
  nb_ceps INTEGER DEFAULT 7,
  description_position TEXT, -- ex: "début du rang 3", "milieu rang 5"
  pieds_marques TEXT, -- ex: "pieds 10 à 16"
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE placettes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_select_placettes" ON placettes FOR SELECT USING (true);
CREATE POLICY "allow_insert_placettes" ON placettes FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_update_placettes" ON placettes FOR UPDATE USING (true);
CREATE POLICY "allow_delete_placettes" ON placettes FOR DELETE USING (true);

-- 2. Ajouter placette_id dans observations
ALTER TABLE observations ADD COLUMN IF NOT EXISTS placette_id UUID REFERENCES placettes(id);

-- 3. Index
CREATE INDEX IF NOT EXISTS idx_placettes_parcelle_id ON placettes(parcelle_id);
CREATE INDEX IF NOT EXISTS idx_observations_placette_id ON observations(placette_id);
