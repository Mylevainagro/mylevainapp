-- ============================================================
-- Migration 008 : Phase 2 — Seed guide notation + types culture
-- ============================================================

-- Guide de notation — fiches méthodologiques
INSERT INTO guide_notation (code_indicateur, nom_indicateur, description, pourquoi_mesurer, methode_mesure, points_attention, echelle_type, seuils_json, exemple, unite, ordre_affichage) VALUES
('mildiou_frequence', 'Fréquence mildiou', 'Pourcentage de feuilles présentant des symptômes de mildiou', 'Évaluer la propagation de la maladie dans la parcelle', 'Examiner 20 feuilles aléatoires sur le rang. Compter celles présentant des taches huileuses (face supérieure) ou du feutrage blanc (face inférieure). Calculer : (nb feuilles atteintes / 20) × 100', 'Observer les deux faces de chaque feuille. Privilégier les feuilles du milieu du cep. Ne pas confondre avec des carences.', 'pourcentage', '{"0": "Aucune feuille atteinte", "25": "Faible — 1 à 5 feuilles", "50": "Modéré — 6 à 10 feuilles", "75": "Fort — 11 à 15 feuilles", "100": "Très fort — plus de 15 feuilles"}', 'Si 4 feuilles sur 20 présentent des taches → 20%', '%', 1),
('mildiou_intensite', 'Intensité mildiou', 'Sévérité des symptômes de mildiou sur les feuilles atteintes', 'Évaluer la gravité de l''infection sur les organes touchés', 'Sur les feuilles atteintes, évaluer la surface foliaire couverte par les symptômes. Attribuer une note de 0 à 5.', 'Distinguer les taches récentes (huileuses) des anciennes (nécrosées). Vérifier aussi les grappes.', 'numerique_0_5', '{"0": "Aucun symptôme", "1": "Traces — <5% surface", "2": "Léger — 5-15% surface", "3": "Modéré — 15-30% surface", "4": "Sévère — 30-50% surface", "5": "Très sévère — >50% surface"}', 'Taches couvrant environ 20% de la feuille → note 3', null, 2),
('oidium_frequence', 'Fréquence oïdium', 'Pourcentage de feuilles présentant des symptômes d''oïdium', 'Évaluer la propagation de l''oïdium dans la parcelle', 'Examiner 20 feuilles aléatoires. Compter celles présentant un feutrage blanc-grisâtre poudreux sur la face supérieure. Calculer : (nb feuilles atteintes / 20) × 100', 'L''oïdium se développe surtout par temps chaud et sec. Vérifier aussi les jeunes pousses et les grappes.', 'pourcentage', '{"0": "Aucune feuille atteinte", "25": "Faible", "50": "Modéré", "75": "Fort", "100": "Très fort"}', 'Si 3 feuilles sur 20 présentent du feutrage → 15%', '%', 3),
('oidium_intensite', 'Intensité oïdium', 'Sévérité des symptômes d''oïdium sur les organes atteints', 'Évaluer la gravité de l''infection oïdium', 'Sur les organes atteints, évaluer la surface couverte par le feutrage poudreux. Note de 0 à 5.', 'Sur grappes, l''oïdium provoque des craquelures. Vérifier les baies.', 'numerique_0_5', '{"0": "Aucun symptôme", "1": "Traces", "2": "Léger", "3": "Modéré", "4": "Sévère", "5": "Très sévère"}', 'Feutrage couvrant 10% de la feuille → note 2', null, 4),
('vigueur', 'Vigueur de la vigne', 'Évaluation globale de la vigueur végétative du cep', 'Suivre le développement de la plante et détecter les stress', 'Observer la longueur des entre-nœuds, le diamètre des rameaux, la taille des feuilles et la couleur générale. Attribuer une note de 0 à 5.', 'Comparer avec les ceps voisins. Tenir compte du stade phénologique. Une vigueur excessive peut favoriser les maladies.', 'numerique_0_5', '{"0": "Très faible — cep chétif", "1": "Faible — croissance réduite", "2": "Moyenne-faible", "3": "Moyenne — développement normal", "4": "Bonne — croissance vigoureuse", "5": "Très forte — croissance excessive"}', 'Rameaux de longueur normale, feuilles de taille moyenne, couleur vert foncé → note 4', null, 5),
('humidite_sol', 'Humidité du sol', 'Évaluation tactile et visuelle de l''humidité du sol', 'Contextualiser les observations et anticiper les risques fongiques', 'Prendre une poignée de terre à 10 cm de profondeur. Presser dans la main et observer.', 'L''humidité varie selon la profondeur et la position dans la parcelle. Faire le test à mi-rang.', 'categoriel', '{"Sec": "La terre s''effrite, ne forme pas de boule", "Humide": "La terre forme une boule qui se tient, sans eau visible", "Gorgé": "L''eau suinte quand on presse, sol brillant"}', 'La terre forme une boule compacte mais pas d''eau visible → Humide', null, 6),
('vie_biologique_visible', 'Vie biologique visible', 'Présence d''organismes vivants visibles dans et sur le sol', 'Évaluer l''activité biologique du sol comme indicateur de santé', 'Sur une surface de 30×30 cm, retourner la terre sur 10 cm. Compter les vers de terre, observer les champignons, insectes, racines actives.', 'Faire l''observation tôt le matin ou après une pluie. Les vers sont plus visibles en sol humide.', 'numerique_0_5', '{"0": "Aucune vie visible", "1": "Très peu — 1-2 organismes", "2": "Peu — quelques vers ou insectes", "3": "Modéré — vers + insectes + racines", "4": "Riche — abondance de vie", "5": "Très riche — sol grouillant de vie"}', '5 vers de terre, quelques insectes, mycélium visible → note 3', null, 7);

-- Types de culture
INSERT INTO types_culture (code, nom, description) VALUES
('viticulture', 'Viticulture', 'Culture de la vigne pour la production de raisin'),
('maraichage', 'Maraîchage', 'Culture de légumes et plantes potagères'),
('arboriculture', 'Arboriculture', 'Culture d''arbres fruitiers'),
('grandes_cultures', 'Grandes cultures', 'Céréales, oléagineux, protéagineux');

-- Espèces
INSERT INTO especes (type_culture_id, code, nom) VALUES
((SELECT id FROM types_culture WHERE code = 'viticulture'), 'vigne', 'Vigne'),
((SELECT id FROM types_culture WHERE code = 'grandes_cultures'), 'ble', 'Blé'),
((SELECT id FROM types_culture WHERE code = 'maraichage'), 'tomate', 'Tomate'),
((SELECT id FROM types_culture WHERE code = 'maraichage'), 'pomme_de_terre', 'Pomme de terre'),
((SELECT id FROM types_culture WHERE code = 'arboriculture'), 'pommier', 'Pommier'),
((SELECT id FROM types_culture WHERE code = 'arboriculture'), 'noisetier', 'Noisetier');

-- Variétés
INSERT INTO varietes (espece_id, code, nom) VALUES
((SELECT id FROM especes WHERE code = 'vigne'), 'merlot', 'Merlot'),
((SELECT id FROM especes WHERE code = 'vigne'), 'cabernet_sauvignon', 'Cabernet Sauvignon'),
((SELECT id FROM especes WHERE code = 'vigne'), 'chardonnay', 'Chardonnay'),
((SELECT id FROM especes WHERE code = 'pommier'), 'gala', 'Gala'),
((SELECT id FROM especes WHERE code = 'pommier'), 'golden', 'Golden');
