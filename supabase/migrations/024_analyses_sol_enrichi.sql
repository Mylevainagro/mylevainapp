-- ============================================================
-- Migration 024 — Analyses sol enrichies (saisie manuelle)
-- ============================================================

ALTER TABLE analyses_sol ADD COLUMN IF NOT EXISTS laboratoire TEXT;
ALTER TABLE analyses_sol ADD COLUMN IF NOT EXISTS ph_kcl NUMERIC;
ALTER TABLE analyses_sol ADD COLUMN IF NOT EXISTS carbone NUMERIC;
ALTER TABLE analyses_sol ADD COLUMN IF NOT EXISTS zinc NUMERIC;
ALTER TABLE analyses_sol ADD COLUMN IF NOT EXISTS texture_sol TEXT;
ALTER TABLE analyses_sol ADD COLUMN IF NOT EXISTS activite_microbienne NUMERIC;
