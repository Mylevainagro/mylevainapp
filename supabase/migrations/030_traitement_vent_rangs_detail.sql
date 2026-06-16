-- Migration 030 — Vent sur traitements + détails volumes par rang
ALTER TABLE traitements ADD COLUMN IF NOT EXISTS vent TEXT;

-- Colonnes détail sur traitement_rangs
ALTER TABLE traitement_rangs ADD COLUMN IF NOT EXISTS p1_volume_prepare NUMERIC;
ALTER TABLE traitement_rangs ADD COLUMN IF NOT EXISTS p1_ph_bouillie NUMERIC;
ALTER TABLE traitement_rangs ADD COLUMN IF NOT EXISTS p1_volume_restant NUMERIC;
ALTER TABLE traitement_rangs ADD COLUMN IF NOT EXISTS p2_volume_prepare NUMERIC;
ALTER TABLE traitement_rangs ADD COLUMN IF NOT EXISTS p2_ph_bouillie NUMERIC;
ALTER TABLE traitement_rangs ADD COLUMN IF NOT EXISTS p2_volume_restant NUMERIC;
