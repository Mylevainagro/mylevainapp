-- ============================================================
-- Migration 019 — Sites unifiés (type_exploitation, adresse, GPS)
-- Suppression doublons admin
-- ============================================================

-- Ajouter les nouveaux champs sur sites
ALTER TABLE sites ADD COLUMN IF NOT EXISTS type_exploitation TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS adresse TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS longitude NUMERIC;

-- Ajouter les nouveaux champs sur parcelles
ALTER TABLE parcelles ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id);
ALTER TABLE parcelles ADD COLUMN IF NOT EXISTS surface NUMERIC;
ALTER TABLE parcelles ADD COLUMN IF NOT EXISTS type_culture TEXT;
ALTER TABLE parcelles ADD COLUMN IF NOT EXISTS variete TEXT;
ALTER TABLE parcelles ADD COLUMN IF NOT EXISTS sol TEXT;
