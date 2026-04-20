-- Migration 025 — GPS sur parcelles
ALTER TABLE parcelles ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE parcelles ADD COLUMN IF NOT EXISTS longitude NUMERIC;
