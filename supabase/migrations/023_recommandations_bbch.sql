-- ============================================================
-- Migration 023 — Recommandations traitement par stade BBCH
-- ============================================================

CREATE TABLE IF NOT EXISTS recommandations_bbch (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  culture_id UUID NOT NULL REFERENCES cultures(id) ON DELETE CASCADE,
  bbch_min TEXT NOT NULL,
  bbch_max TEXT NOT NULL,
  type TEXT NOT NULL,
  priorite TEXT NOT NULL CHECK (priorite IN ('optionnel', 'faible', 'moyenne', 'moderee', 'elevee', 'critique')),
  message TEXT NOT NULL,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE recommandations_bbch ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_recommandations_bbch" ON recommandations_bbch FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_recommandations_bbch_culture ON recommandations_bbch(culture_id);

-- Seed recommandations vigne
INSERT INTO recommandations_bbch (culture_id, bbch_min, bbch_max, type, priorite, message) VALUES
  ((SELECT id FROM cultures WHERE code='vigne'), '05', '09', 'Biostimulation levain', 'elevee', 'Passage recommandé pour stimuler le démarrage végétatif et activer le microbiote du sol après l''hiver.'),
  ((SELECT id FROM cultures WHERE code='vigne'), '12', '16', 'Biostimulation levain', 'elevee', 'Soutien de la croissance foliaire et renforcement du microbiote racinaire. Période clé pour la vigueur.'),
  ((SELECT id FROM cultures WHERE code='vigne'), '17', '19', 'Biostimulation levain', 'elevee', 'Préparation pré-floraison. Renforcer les défenses naturelles avant la période sensible au mildiou.'),
  ((SELECT id FROM cultures WHERE code='vigne'), '23', '27', 'Biostimulation levain', 'critique', 'Période critique : floraison et nouaison. Passage levain fortement recommandé pour limiter la pression mildiou et soutenir la fécondation.'),
  ((SELECT id FROM cultures WHERE code='vigne'), '27', '31', 'Biostimulation levain', 'moderee', 'Accompagnement post-floraison. Soutien de la formation des baies et maintien de la protection sanitaire.'),
  ((SELECT id FROM cultures WHERE code='vigne'), '31', '35', 'Biostimulation levain', 'moyenne', 'Soutien pendant la formation et la fermeture des grappes. Maintenir la pression sur le mildiou.'),
  ((SELECT id FROM cultures WHERE code='vigne'), '35', '38', 'Biostimulation levain', 'moderee', 'Préparation véraison. Accompagner la maturation et maintenir la santé foliaire.'),
  ((SELECT id FROM cultures WHERE code='vigne'), '41', '43', 'Biostimulation levain', 'optionnel', 'Post-récolte : passage optionnel pour la récupération du sol et la vie microbienne avant l''hiver.');
