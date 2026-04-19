-- ============================================================
-- Migration 020 — Refactorisation complète MyLevain Agro
-- Cultures, BBCH dynamique, modalités enrichies
-- ============================================================

-- 1. Table cultures (référentiel)
CREATE TABLE IF NOT EXISTS cultures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  nom TEXT NOT NULL,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE cultures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_cultures" ON cultures FOR ALL USING (true) WITH CHECK (true);

-- 2. Table bbch_stades (dynamique par culture)
CREATE TABLE IF NOT EXISTS bbch_stades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  culture_id UUID NOT NULL REFERENCES cultures(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  ordre INTEGER DEFAULT 0,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE bbch_stades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_bbch_stades" ON bbch_stades FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_bbch_stades_culture_id ON bbch_stades(culture_id);

-- 3. Ajouter culture_id sur parcelles
ALTER TABLE parcelles ADD COLUMN IF NOT EXISTS culture_id UUID REFERENCES cultures(id);

-- 4. Ajouter stade_bbch_id sur traitements et observations
ALTER TABLE traitements ADD COLUMN IF NOT EXISTS stade_bbch_id UUID REFERENCES bbch_stades(id);
ALTER TABLE observations ADD COLUMN IF NOT EXISTS stade_bbch_id UUID REFERENCES bbch_stades(id);

-- 5. Enrichir modalites_levain avec champs terrain
ALTER TABLE modalites_levain ADD COLUMN IF NOT EXISTS levain_type TEXT;
ALTER TABLE modalites_levain ADD COLUMN IF NOT EXISTS levain_dilution TEXT;
ALTER TABLE modalites_levain ADD COLUMN IF NOT EXISTS phyto_type TEXT;
ALTER TABLE modalites_levain ADD COLUMN IF NOT EXISTS phyto_dose TEXT;

-- 6. Seed cultures
INSERT INTO cultures (code, nom) VALUES ('vigne', 'Vigne') ON CONFLICT (code) DO NOTHING;
INSERT INTO cultures (code, nom) VALUES ('ble', 'Blé') ON CONFLICT (code) DO NOTHING;
INSERT INTO cultures (code, nom) VALUES ('mais', 'Maïs') ON CONFLICT (code) DO NOTHING;
INSERT INTO cultures (code, nom) VALUES ('legumes', 'Légumes') ON CONFLICT (code) DO NOTHING;
INSERT INTO cultures (code, nom) VALUES ('fruitiers', 'Fruitiers') ON CONFLICT (code) DO NOTHING;

-- 7. Seed BBCH Vigne (Lorenz 1994)
INSERT INTO bbch_stades (culture_id, code, label, description, ordre) VALUES
  ((SELECT id FROM cultures WHERE code='vigne'), '00', 'Repos hivernal', 'Bourgeon d''hiver, écailles fermées', 1),
  ((SELECT id FROM cultures WHERE code='vigne'), '05', 'Bourgeon dans le coton', 'Début gonflement, bourre visible', 2),
  ((SELECT id FROM cultures WHERE code='vigne'), '09', 'Débourrement', 'Pointe verte visible', 3),
  ((SELECT id FROM cultures WHERE code='vigne'), '12', '2-3 feuilles étalées', 'Premières feuilles déployées', 4),
  ((SELECT id FROM cultures WHERE code='vigne'), '15', '5-6 feuilles étalées', 'Inflorescence visible', 5),
  ((SELECT id FROM cultures WHERE code='vigne'), '17', 'Grappes séparées', 'Boutons floraux individualisés', 6),
  ((SELECT id FROM cultures WHERE code='vigne'), '23', 'Floraison', '30% capuchons tombés', 7),
  ((SELECT id FROM cultures WHERE code='vigne'), '27', 'Nouaison', 'Baies en formation', 8),
  ((SELECT id FROM cultures WHERE code='vigne'), '31', 'Petit pois', 'Baies taille petit pois', 9),
  ((SELECT id FROM cultures WHERE code='vigne'), '33', 'Fermeture grappe', 'Baies se touchent', 10),
  ((SELECT id FROM cultures WHERE code='vigne'), '35', 'Véraison', 'Début changement couleur', 11),
  ((SELECT id FROM cultures WHERE code='vigne'), '38', 'Maturité', 'Baies mûres, récolte possible', 12),
  ((SELECT id FROM cultures WHERE code='vigne'), '41', 'Surmaturation', 'Concentration sucres', 13),
  ((SELECT id FROM cultures WHERE code='vigne'), '43', 'Chute des feuilles', 'Début sénescence', 14)
ON CONFLICT DO NOTHING;

-- 8. Seed BBCH Blé (Zadoks)
INSERT INTO bbch_stades (culture_id, code, label, description, ordre) VALUES
  ((SELECT id FROM cultures WHERE code='ble'), '00', 'Germination', 'Graine sèche', 1),
  ((SELECT id FROM cultures WHERE code='ble'), '10', 'Levée', 'Première feuille visible', 2),
  ((SELECT id FROM cultures WHERE code='ble'), '13', '3 feuilles', 'Stade 3 feuilles', 3),
  ((SELECT id FROM cultures WHERE code='ble'), '21', 'Début tallage', 'Première talle visible', 4),
  ((SELECT id FROM cultures WHERE code='ble'), '25', 'Tallage complet', '5 talles', 5),
  ((SELECT id FROM cultures WHERE code='ble'), '30', 'Épi 1 cm', 'Début montaison', 6),
  ((SELECT id FROM cultures WHERE code='ble'), '32', '2 nœuds', 'Montaison avancée', 7),
  ((SELECT id FROM cultures WHERE code='ble'), '39', 'Ligule dernière feuille', 'Dernière feuille visible', 8),
  ((SELECT id FROM cultures WHERE code='ble'), '51', 'Début épiaison', 'Épi pointe hors gaine', 9),
  ((SELECT id FROM cultures WHERE code='ble'), '59', 'Épiaison complète', 'Épi entièrement sorti', 10),
  ((SELECT id FROM cultures WHERE code='ble'), '61', 'Début floraison', 'Anthères visibles', 11),
  ((SELECT id FROM cultures WHERE code='ble'), '69', 'Fin floraison', 'Floraison terminée', 12),
  ((SELECT id FROM cultures WHERE code='ble'), '71', 'Grain laiteux', 'Grain aqueux à laiteux', 13),
  ((SELECT id FROM cultures WHERE code='ble'), '75', 'Grain pâteux mou', 'Grain pâteux', 14),
  ((SELECT id FROM cultures WHERE code='ble'), '85', 'Grain pâteux dur', 'Grain dur', 15),
  ((SELECT id FROM cultures WHERE code='ble'), '92', 'Maturité', 'Grain très dur, récolte', 16)
ON CONFLICT DO NOTHING;
