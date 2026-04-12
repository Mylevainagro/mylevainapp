-- ============================================================
-- MyLevain Agro Intelligence — Schéma complet
-- ============================================================

-- Vignobles
CREATE TABLE vignobles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  localisation TEXT,
  appellation TEXT,
  type_sol TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Parcelles
CREATE TABLE parcelles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vignoble_id UUID REFERENCES vignobles(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  cepage TEXT,
  nb_rangs INTEGER DEFAULT 7,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Observations (41 champs — cœur de l'app)
CREATE TABLE observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcelle_id UUID REFERENCES parcelles(id) ON DELETE CASCADE,
  rang INTEGER NOT NULL CHECK (rang BETWEEN 1 AND 7),
  modalite TEXT NOT NULL,
  date DATE NOT NULL,
  heure TIME,
  mois TEXT,

  -- Météo
  meteo TEXT,
  temperature REAL,
  humidite REAL,
  vent TEXT,
  pluie_recente BOOLEAN,
  derniere_pluie DATE,
  humidite_sol TEXT,

  -- Traitement appliqué
  volume_applique_l REAL,
  ph_surnageant REAL,
  surnageant_l REAL,
  eau_l REAL,
  cuivre BOOLEAN,
  date_surnageant DATE,
  date_cuivre DATE,

  -- État plante (0-5)
  vigueur INTEGER CHECK (vigueur BETWEEN 0 AND 5),
  croissance INTEGER CHECK (croissance BETWEEN 0 AND 5),
  homogeneite INTEGER CHECK (homogeneite BETWEEN 0 AND 5),
  couleur_feuilles INTEGER CHECK (couleur_feuilles BETWEEN 0 AND 5),
  epaisseur_feuilles INTEGER CHECK (epaisseur_feuilles BETWEEN 0 AND 5),
  turgescence INTEGER CHECK (turgescence BETWEEN 0 AND 5),

  -- Symptômes négatifs (0-5)
  brulures INTEGER CHECK (brulures BETWEEN 0 AND 5),
  necroses INTEGER CHECK (necroses BETWEEN 0 AND 5),
  deformations INTEGER CHECK (deformations BETWEEN 0 AND 5),

  -- Maladies
  mildiou_presence INTEGER CHECK (mildiou_presence BETWEEN 0 AND 5),
  mildiou_intensite REAL,
  localisation_mildiou TEXT,
  progression TEXT,
  pression_mildiou INTEGER CHECK (pression_mildiou BETWEEN 0 AND 3),

  -- Grappes
  nb_grappes_par_cep INTEGER,
  taille_grappes INTEGER CHECK (taille_grappes BETWEEN 0 AND 5),
  homogeneite_grappes INTEGER CHECK (homogeneite_grappes BETWEEN 0 AND 5),

  -- Scores calculés
  score_plante REAL,
  score_sanitaire REAL,
  score_mildiou REAL,
  score_vigueur REAL,
  score_sol REAL,
  score_biostimulant REAL,

  -- Notes
  commentaires TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Traitements
CREATE TABLE traitements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcelle_id UUID REFERENCES parcelles(id) ON DELETE CASCADE,
  rang INTEGER NOT NULL CHECK (rang BETWEEN 1 AND 7),
  modalite TEXT NOT NULL,
  date DATE NOT NULL,
  produit TEXT NOT NULL,
  dose TEXT,
  methode_application TEXT,
  temperature REAL,
  humidite REAL,
  conditions_meteo TEXT,
  operateur TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Analyses sol (pack minimal + métaux lourds)
CREATE TABLE analyses_sol (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcelle_id UUID REFERENCES parcelles(id) ON DELETE CASCADE,
  date_prelevement DATE NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('T0', 'Tfinal')),

  -- Pack minimal
  ph REAL,
  matiere_organique_pct REAL,
  rapport_c_n REAL,
  azote_total REAL,
  phosphore REAL,
  potassium REAL,
  biomasse_microbienne REAL,
  respiration_sol REAL,
  bacteries_totales REAL,
  champignons_totaux REAL,

  -- Métaux lourds — total + biodisponible (mg/kg)
  cuivre_total REAL,
  cuivre_biodisponible REAL,
  cadmium_total REAL,
  cadmium_biodisponible REAL,
  plomb_total REAL,
  plomb_biodisponible REAL,
  arsenic_total REAL,
  arsenic_biodisponible REAL,
  manganese_total REAL,
  manganese_biodisponible REAL,

  -- Scores calculés
  score_sante_sol REAL,
  score_contamination_metaux REAL,

  fichier_pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Photos
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id UUID REFERENCES observations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('feuille', 'grappe', 'sol', 'rang', 'autre')),
  url TEXT NOT NULL,
  legende TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Référentiel modalités (table statique)
CREATE TABLE referentiel_modalites (
  rang INTEGER PRIMARY KEY,
  modalite TEXT NOT NULL,
  description TEXT,
  surnageant_l REAL DEFAULT 0,
  eau_l REAL DEFAULT 0,
  volume_l REAL DEFAULT 0
);

-- Recommandations (outil décisionnel)
CREATE TABLE recommandations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcelle_id UUID REFERENCES parcelles(id) ON DELETE CASCADE,
  rang INTEGER CHECK (rang BETWEEN 1 AND 7),
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('preventif', 'curatif', 'observation')),
  niveau_risque TEXT NOT NULL CHECK (niveau_risque IN ('faible', 'moyen', 'eleve')),
  maladie_cible TEXT,
  action TEXT NOT NULL CHECK (action IN ('traiter', 'attendre', 'surveiller')),
  produit TEXT CHECK (produit IN ('levain', 'cuivre', 'levain + cuivre', 'autre')),
  dose TEXT,
  frequence TEXT,
  explication TEXT,
  score_confiance REAL CHECK (score_confiance BETWEEN 0 AND 100),
  source TEXT NOT NULL CHECK (source IN ('regle_metier', 'ia', 'operateur')),
  statut TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'appliquee', 'ignoree')),
  date_application DATE,
  retour_terrain TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
