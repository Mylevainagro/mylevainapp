-- ============================================================
-- Migration 006 : Phase 2 — Guide notation + Multi-cultures
-- ============================================================

-- Guide de notation terrain
CREATE TABLE guide_notation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_indicateur TEXT UNIQUE NOT NULL,
  nom_indicateur TEXT NOT NULL,
  description TEXT,
  pourquoi_mesurer TEXT,
  methode_mesure TEXT,
  points_attention TEXT,
  echelle_type TEXT NOT NULL CHECK (echelle_type IN (
    'numerique_0_5', 'numerique_0_3', 'pourcentage', 'categoriel'
  )),
  seuils_json JSONB DEFAULT '{}',
  exemple TEXT,
  unite TEXT,
  actif BOOLEAN DEFAULT true,
  ordre_affichage INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Types de culture
CREATE TABLE types_culture (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  nom TEXT NOT NULL,
  description TEXT,
  actif BOOLEAN DEFAULT true
);

-- Espèces
CREATE TABLE especes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_culture_id UUID REFERENCES types_culture(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  nom TEXT NOT NULL,
  description TEXT,
  actif BOOLEAN DEFAULT true
);

-- Variétés
CREATE TABLE varietes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  espece_id UUID REFERENCES especes(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  nom TEXT NOT NULL,
  description TEXT,
  actif BOOLEAN DEFAULT true
);

-- Sites (généralisation de vignobles)
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  type_site TEXT,
  localisation TEXT,
  appellation TEXT,
  description TEXT,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Zones de culture (généralisation de parcelles)
CREATE TABLE zones_culture (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  type_culture_id UUID REFERENCES types_culture(id),
  espece_id UUID REFERENCES especes(id),
  variete_id UUID REFERENCES varietes(id),
  nom TEXT NOT NULL,
  code TEXT,
  surface_ha NUMERIC(8,2),
  nb_lignes_ou_rangs INTEGER,
  type_sol TEXT,
  irrigation BOOLEAN,
  mode_conduite TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  notes TEXT,
  actif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Colonnes de transition sur tables existantes
ALTER TABLE vignobles ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id);
ALTER TABLE parcelles ADD COLUMN IF NOT EXISTS zone_culture_id UUID REFERENCES zones_culture(id);
