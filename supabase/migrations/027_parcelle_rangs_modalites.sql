-- ============================================================
-- Migration 027 — Modalités par rang de parcelle
-- ============================================================

CREATE TABLE IF NOT EXISTS parcelle_rangs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parcelle_id UUID NOT NULL REFERENCES parcelles(id) ON DELETE CASCADE,
  rang INTEGER NOT NULL,
  produit TEXT,
  dose TEXT,
  modalite_code TEXT, -- lien vers modalites_levain.code (M0, M1…)
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(parcelle_id, rang)
);

ALTER TABLE parcelle_rangs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_parcelle_rangs" ON parcelle_rangs FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_parcelle_rangs_parcelle ON parcelle_rangs(parcelle_id);
