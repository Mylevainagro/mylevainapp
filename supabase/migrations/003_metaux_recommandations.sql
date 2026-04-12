-- ============================================================
-- Migration 003 : Métaux lourds + Recommandations + Scores avancés
-- ============================================================

-- ============================================================
-- 1. MÉTAUX LOURDS dans analyses_sol
-- ============================================================
ALTER TABLE analyses_sol ADD COLUMN IF NOT EXISTS cuivre_total REAL;
ALTER TABLE analyses_sol ADD COLUMN IF NOT EXISTS cuivre_biodisponible REAL;
ALTER TABLE analyses_sol ADD COLUMN IF NOT EXISTS cadmium_total REAL;
ALTER TABLE analyses_sol ADD COLUMN IF NOT EXISTS cadmium_biodisponible REAL;
ALTER TABLE analyses_sol ADD COLUMN IF NOT EXISTS plomb_total REAL;
ALTER TABLE analyses_sol ADD COLUMN IF NOT EXISTS plomb_biodisponible REAL;
ALTER TABLE analyses_sol ADD COLUMN IF NOT EXISTS arsenic_total REAL;
ALTER TABLE analyses_sol ADD COLUMN IF NOT EXISTS arsenic_biodisponible REAL;
ALTER TABLE analyses_sol ADD COLUMN IF NOT EXISTS manganese_total REAL;
ALTER TABLE analyses_sol ADD COLUMN IF NOT EXISTS manganese_biodisponible REAL;

-- Scores sol calculés
ALTER TABLE analyses_sol ADD COLUMN IF NOT EXISTS score_sante_sol REAL;
ALTER TABLE analyses_sol ADD COLUMN IF NOT EXISTS score_contamination_metaux REAL;

-- ============================================================
-- 2. SCORES AVANCÉS dans observations
-- ============================================================
ALTER TABLE observations ADD COLUMN IF NOT EXISTS score_mildiou REAL;
ALTER TABLE observations ADD COLUMN IF NOT EXISTS score_vigueur REAL;
ALTER TABLE observations ADD COLUMN IF NOT EXISTS score_sol REAL;
ALTER TABLE observations ADD COLUMN IF NOT EXISTS score_biostimulant REAL;

-- ============================================================
-- 3. TABLE RECOMMANDATIONS (outil décisionnel)
-- ============================================================
CREATE TABLE recommandations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcelle_id UUID REFERENCES parcelles(id) ON DELETE CASCADE,
  rang INTEGER CHECK (rang BETWEEN 1 AND 7),
  date DATE NOT NULL,

  -- Type de recommandation
  type TEXT NOT NULL CHECK (type IN ('preventif', 'curatif', 'observation')),

  -- Niveau de risque évalué
  niveau_risque TEXT NOT NULL CHECK (niveau_risque IN ('faible', 'moyen', 'eleve')),

  -- Maladie ciblée
  maladie_cible TEXT, -- mildiou, oïdium, botrytis, etc.

  -- Action recommandée
  action TEXT NOT NULL CHECK (action IN ('traiter', 'attendre', 'surveiller')),

  -- Produit recommandé
  produit TEXT CHECK (produit IN ('levain', 'cuivre', 'levain + cuivre', 'autre')),
  dose TEXT,
  frequence TEXT, -- ex: "tous les 10 jours", "après pluie"

  -- Explication lisible
  explication TEXT,

  -- Confiance dans la recommandation (0-100%)
  score_confiance REAL CHECK (score_confiance BETWEEN 0 AND 100),

  -- Source de la recommandation
  source TEXT NOT NULL CHECK (source IN ('regle_metier', 'ia', 'operateur')),

  -- Suivi
  statut TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'appliquee', 'ignoree')),
  date_application DATE,
  retour_terrain TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS pour recommandations
ALTER TABLE recommandations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON recommandations FOR ALL USING (true) WITH CHECK (true);
