-- ============================================================
-- Migration 017 — Traitements multi-rangs (1 fiche = N rangs)
-- Spec refactorisation saisie traitement
-- ============================================================

-- 1. Table traitement_rangs (détail par rang)
CREATE TABLE IF NOT EXISTS traitement_rangs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  traitement_id UUID NOT NULL REFERENCES traitements(id) ON DELETE CASCADE,
  rang TEXT NOT NULL, -- "R1", "R2"…
  modalite_id TEXT NOT NULL, -- code modalité (M0, M1, M2…)
  dose TEXT,
  commentaire TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE traitement_rangs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_select_traitement_rangs" ON traitement_rangs FOR SELECT USING (true);
CREATE POLICY "allow_insert_traitement_rangs" ON traitement_rangs FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_update_traitement_rangs" ON traitement_rangs FOR UPDATE USING (true);
CREATE POLICY "allow_delete_traitement_rangs" ON traitement_rangs FOR DELETE USING (true);

-- 2. Ajouter colonnes mode sur traitements
ALTER TABLE traitements ADD COLUMN IF NOT EXISTS mode TEXT CHECK (mode IN ('rang', 'surface')) DEFAULT 'rang';
ALTER TABLE traitements ADD COLUMN IF NOT EXISTS nb_rangs INTEGER;
ALTER TABLE traitements ADD COLUMN IF NOT EXISTS surface_ha NUMERIC;
ALTER TABLE traitements ADD COLUMN IF NOT EXISTS modalite_globale TEXT; -- pour mode surface
ALTER TABLE traitements ADD COLUMN IF NOT EXISTS heure TEXT;

-- 3. Index
CREATE INDEX IF NOT EXISTS idx_traitement_rangs_traitement_id ON traitement_rangs(traitement_id);
