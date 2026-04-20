-- Migration 028 — Parcelle rangs enrichis (témoin, produit2, dose2)
ALTER TABLE parcelle_rangs ADD COLUMN IF NOT EXISTS temoin BOOLEAN DEFAULT false;
ALTER TABLE parcelle_rangs ADD COLUMN IF NOT EXISTS produit2 TEXT;
ALTER TABLE parcelle_rangs ADD COLUMN IF NOT EXISTS dose2 TEXT;
