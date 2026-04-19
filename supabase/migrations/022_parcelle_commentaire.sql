-- Migration 022 — Commentaire sur parcelles
ALTER TABLE parcelles ADD COLUMN IF NOT EXISTS commentaire TEXT;
