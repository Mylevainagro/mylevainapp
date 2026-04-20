-- ============================================================
-- Migration 029 — Année protocole, photos parcelle, PDF plan
-- ============================================================

-- Année du protocole sur parcelle
ALTER TABLE parcelles ADD COLUMN IF NOT EXISTS annee_protocole TEXT;

-- Photo parcelle et PDF plan expérimental
ALTER TABLE parcelles ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE parcelles ADD COLUMN IF NOT EXISTS plan_pdf_url TEXT;
