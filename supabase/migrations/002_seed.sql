-- ============================================================
-- Données initiales — Référentiel + Vignobles + Parcelles
-- ============================================================

-- Référentiel des 7 modalités (protocole essai-terrain.xlsx)
INSERT INTO referentiel_modalites (rang, modalite, description, surnageant_l, eau_l, volume_l) VALUES
  (1, 'Témoin', 'Aucun traitement', 0, 0, 0),
  (2, 'Levain 1/4', 'Dilution 1/4', 1, 3, 4),
  (3, 'Levain 1/2', 'Dilution 1/2', 2, 2, 4),
  (4, 'Levain 1/4', 'Répétition dilution 1/4', 1, 3, 4),
  (5, 'Levain 1/2', 'Répétition dilution 1/2', 2, 2, 4),
  (6, 'Levain 1/4 + Cuivre', 'Synergie 1/4 + cuivre', 1, 3, 4),
  (7, 'Levain 1/2 + Cuivre', 'Synergie 1/2 + cuivre', 2, 2, 4);

-- Vignobles
INSERT INTO vignobles (id, nom, localisation, appellation, type_sol) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Piotte', 'Bordeaux', NULL, NULL),
  ('a1000000-0000-0000-0000-000000000002', 'Pape Clément', 'Pessac-Léognan', 'Grand Cru Classé de Graves', 'Graves argilo-calcaire');

-- Parcelles (1 par vignoble pour commencer)
INSERT INTO parcelles (id, vignoble_id, nom, cepage, nb_rangs) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Parcelle principale', NULL, 7),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'Parcelle test', NULL, 7);
