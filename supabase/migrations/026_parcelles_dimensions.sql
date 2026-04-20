-- Migration 026 — Dimensions parcelles (nb_rangs, longueur, écartement)
ALTER TABLE parcelles ADD COLUMN IF NOT EXISTS longueur NUMERIC;
ALTER TABLE parcelles ADD COLUMN IF NOT EXISTS ecartement NUMERIC;
