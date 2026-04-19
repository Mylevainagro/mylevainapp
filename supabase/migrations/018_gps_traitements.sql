-- ============================================================
-- Migration 018 — GPS auto sur traitements
-- ============================================================

ALTER TABLE traitements ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE traitements ADD COLUMN IF NOT EXISTS longitude NUMERIC;
