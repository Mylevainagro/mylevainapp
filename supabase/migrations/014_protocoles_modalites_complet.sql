-- ============================================================
-- Migration 014 : Protocoles complets (13) + Modalités dédiées (M0/M1/M2)
-- IDEMPOTENT
-- ============================================================

-- ---- Protocoles manquants (6 supplémentaires) ----
INSERT INTO protocoles (code, label, type, description, ordre) VALUES
  ('P4S', 'Surnageant + phyto 100% et 50%', 'sequentiel', 'Surnageant selon modalité + cuivre/phyto 100% et cuivre/phyto 50%', 7),
  ('P5S', 'Surnageant + phyto 100% et 25%', 'sequentiel', 'Surnageant selon modalité + cuivre/phyto 100% et cuivre/phyto 25%', 8),
  ('P6S', 'Surnageant + phyto 50% et 25%', 'sequentiel', 'Surnageant selon modalité + cuivre/phyto 50% et cuivre/phyto 25%', 9),
  ('P4MT', 'Surnageant + phyto 100% et 50% (simultané)', 'meme_temps', 'Surnageant selon modalité + cuivre/phyto 100% et 50% en même temps', 10),
  ('P5MT', 'Surnageant + phyto 100% et 25% (simultané)', 'meme_temps', 'Surnageant selon modalité + cuivre/phyto 100% et 25% en même temps', 11),
  ('P6MT', 'Surnageant + phyto 50% et 25% (simultané)', 'meme_temps', 'Surnageant selon modalité + cuivre/phyto 50% et 25% en même temps', 12)
ON CONFLICT (code) DO NOTHING;

-- ---- Table Modalités dédiée (M0/M1/M2) ----
CREATE TABLE IF NOT EXISTS modalites_levain (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  dilution TEXT,
  description TEXT,
  actif BOOLEAN DEFAULT true,
  ordre INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO modalites_levain (code, label, dilution, description, ordre) VALUES
  ('M0', 'Témoin', 'Aucune', 'Témoin sans traitement levain', 0),
  ('M1', 'Levain 1/4', '1/4', 'Dilution levain 1 volume pour 3 volumes eau', 1),
  ('M2', 'Levain 1/2', '1/2', 'Dilution levain 1 volume pour 1 volume eau', 2)
ON CONFLICT (code) DO NOTHING;

-- ---- Lien traitement → modalité levain ----
ALTER TABLE traitements ADD COLUMN IF NOT EXISTS modalite_levain_id UUID REFERENCES modalites_levain(id);
