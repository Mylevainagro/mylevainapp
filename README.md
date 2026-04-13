# 🍇 MyLevain Agro Intelligence

**Plateforme d'intelligence agronomique terrain** pour le suivi des essais de biostimulants (levain) en viticulture et agriculture multi-cultures.

> Application web progressive (PWA) conçue pour une utilisation terrain sur mobile, avec mode hors-ligne, export de données et rapports PDF professionnels.

---

## 📋 Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Architecture](#architecture)
- [Fonctionnalités](#fonctionnalités)
- [Authentification & Rôles](#authentification--rôles)
- [Schéma de données](#schéma-de-données)
- [Installation](#installation)
- [Configuration](#configuration)
- [Utilisation](#utilisation)
- [Tests](#tests)
- [Déploiement](#déploiement)

---

## Vue d'ensemble

MyLevain Agro est une application de suivi terrain pour les essais agronomiques. Elle permet aux opérateurs de collecter des observations, traitements et analyses de sol sur des parcelles viticoles (et autres cultures), puis de générer des rapports et exports pour analyse.

### Schéma fonctionnel global

```
┌─────────────────────────────────────────────────────────┐
│                    OPÉRATEUR TERRAIN                     │
│                  (smartphone / tablette)                  │
└──────────────┬──────────────────────────┬───────────────┘
               │                          │
               ▼                          ▼
┌──────────────────────┐    ┌──────────────────────────┐
│   📝 Saisie terrain  │    │   📋 Saisie par lot      │
│  (observation unique) │    │  (7 rangs simultanés)    │
└──────────┬───────────┘    └────────────┬─────────────┘
           │                             │
           ▼                             ▼
┌──────────────────────────────────────────────────────────┐
│                   SUPABASE (PostgreSQL)                    │
│                                                           │
│  ┌─────────┐ ┌───────────┐ ┌────────────┐ ┌──────────┐  │
│  │Vignobles│ │Observations│ │Traitements │ │Analyses  │  │
│  │Parcelles│ │  (41+champs)│ │ (enrichis) │ │   Sol    │  │
│  │Sites    │ │  + Photos  │ │+ Campagne  │ │+ PDF labo│  │
│  │Zones    │ │  + Scores  │ │+ Matière   │ │+ Métaux  │  │
│  └─────────┘ └───────────┘ └────────────┘ └──────────┘  │
│                                                           │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐  │
│  │Guide notation│ │Types culture │ │ Résumé campagne  │  │
│  │(7 fiches)    │ │Espèces/Var.  │ │ Météo journalière│  │
│  └──────────────┘ └──────────────┘ └──────────────────┘  │
└──────────────────────────────────────────────────────────┘
               │                          │
               ▼                          ▼
┌──────────────────────┐    ┌──────────────────────────┐
│   📥 Export données  │    │   📄 Rapport PDF         │
│  CSV / Excel / JSON  │    │  professionnel avec      │
│  avec filtres        │    │  scores et graphiques    │
└──────────────────────┘    └──────────────────────────┘
```

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│              Client (PWA Next.js 14)             │
│                                                   │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Service  │  │ IndexedDB│  │  Interface     │  │
│  │ Worker   │  │ (offline)│  │  React + TW    │  │
│  │ (cache)  │  │          │  │  (App Router)  │  │
│  └──────────┘  └──────────┘  └───────────────┘  │
└──────────────────────┬───────────────────────────┘
                       │
              ┌────────┴────────┐
              ▼                 ▼
┌──────────────────┐  ┌──────────────────┐
│    Supabase      │  │   Open-Meteo     │
│  (DB + Storage)  │  │   (API météo)    │
│                  │  │   gratuite       │
└──────────────────┘  └──────────────────┘
```

### Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | Next.js 14 (App Router, `"use client"`) |
| Styling | Tailwind CSS 3 + Inter font |
| Base de données | Supabase (PostgreSQL) |
| Stockage fichiers | Supabase Storage (photos + PDFs) |
| Auth | Custom (bcrypt + localStorage sessions) |
| PDF | jsPDF + jspdf-autotable |
| Excel | SheetJS (xlsx) |
| PDF parsing | pdf-parse |
| Graphiques | Chart.js + react-chartjs-2 |
| Offline | Service Worker + IndexedDB (idb) |
| Météo | Open-Meteo API (gratuite, sans clé) |
| Tests | Vitest + fast-check (property-based) |
| Déploiement | Vercel |

---

## Fonctionnalités

### 🌿 Axe 1 — Aide terrain & qualité des données

| Fonctionnalité | Description |
|----------------|-------------|
| **Guide de notation** | Fiches méthodologiques contextuelles (?) pour chaque indicateur du formulaire. 7 fiches : mildiou fréquence/intensité, oïdium fréquence/intensité, vigueur, humidité sol, vie biologique. |
| **Validation formulaire** | Validation temps réel des plages numériques (notes 0-5, pression 0-3, % 0-100, température -10/50°C). Empêche la soumission si erreurs. |
| **Duplication** | Bouton "Dupliquer comme modèle" sur chaque observation pour pré-remplir un nouveau formulaire (date/heure mises à jour). |
| **Saisie par lot** | Formulaire pour 7 rangs simultanés. Champs communs partagés (date, météo, parcelle). Modalité auto-remplie par rang. Soumission partielle si certains rangs sont invalides. |

### 🌍 Axe 2 — Multi-cultures & données enrichies

| Fonctionnalité | Description |
|----------------|-------------|
| **Multi-cultures** | Support viticulture, maraîchage, arboriculture, grandes cultures. Indicateurs adaptés dynamiquement par type de culture. |
| **Traitements enrichis** | Type (cuivre/soufre/levain/biocontrôle/...), matière active, concentration, objectif, campagne. Carte "Dernier traitement" sur chaque parcelle. Filtrage par campagne et type. |
| **Comparaison N vs N-1** | Pourcentage d'évolution des passages (total et cuivre) entre campagne courante et précédente. |
| **Suivi rendement** | 4 indicateurs : nombre grappes, poids moyen, rendement estimé, rendement réel. Comparaison par modalité (témoin vs levain). Score rendement 0-5. |
| **Corrélation** | Coefficient de Pearson entre rendement et indicateurs (vigueur, sol, traitements). |
| **Import PDF labo** | Upload PDF d'analyse de laboratoire (Eurofins, etc.). Extraction automatique de 14 champs (pH, MO, C/N, métaux...). Prévisualisation et correction avant insertion. |

### 📊 Axe 3 — Restitution & export

| Fonctionnalité | Description |
|----------------|-------------|
| **Export CSV** | Un fichier par entité (observations, traitements, analyses sol). Filtres : site, zone, campagne, période, modalité. |
| **Export Excel** | Multi-onglets (Observations, Traitements, Analyses_Sol, Scores, Synthèse). |
| **Export JSON** | Objet structuré avec toutes les entités. UUID stables pour traçabilité. |
| **Validation complétude** | 3 niveaux (complet/partiel/incomplet) avant export ou rapport. L'export n'est jamais bloqué. |
| **Rapport PDF** | Document professionnel avec en-tête, scores (global/sol/plante/maladie/biostimulant), tableaux récapitulatifs, conclusion synthétique auto-générée. |

### 📱 Axe 4 — Expérience terrain

| Fonctionnalité | Description |
|----------------|-------------|
| **Météo GPS** | Données temps réel via Open-Meteo (température, humidité, précipitations, prévisions 3 jours). Pré-remplissage automatique des champs météo du formulaire. |
| **Mode offline** | Service Worker + IndexedDB. Saisie possible sans connexion. Synchronisation automatique au retour du réseau. Gestion des conflits (conservation des deux versions). |
| **Galerie photo** | Photos par parcelle triées par date. Filtrage par type (feuille/grappe/sol/rang/autre) et période. Vue plein écran avec navigation. |
| **Timeline** | Chronologie verticale unifiée (observations + traitements + analyses sol). Icônes et couleurs distinctes par type. Filtrage par type et période. |

### 🔐 Authentification & Rôles

| Fonctionnalité | Description |
|----------------|-------------|
| **Login/Register** | Page de connexion avec email + mot de passe (bcrypt). Inscription avec approbation requise. |
| **Rôle Admin** | Un seul administrateur. Accès à la page Admin (gestion vignobles, parcelles, modalités, paramètres, utilisateurs). |
| **Rôle User** | Opérateurs terrain approuvés par l'admin. Accès à toutes les fonctionnalités sauf Admin. |
| **Approbation** | Les nouveaux inscrits sont en attente. L'admin approuve ou rejette depuis la page Admin. |

---

## Schéma de données

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ types_culture│────▶│   especes    │────▶│   varietes   │
│              │     │              │     │              │
│ viticulture  │     │ vigne        │     │ merlot       │
│ maraîchage   │     │ blé          │     │ cab. sauv.   │
│ arboriculture│     │ tomate       │     │ chardonnay   │
│ gdes cultures│     │ pommier      │     │ gala, golden │
└──────────────┘     │ noisetier    │     └──────────────┘
                     │ pomme de terre│
                     └──────────────┘

┌──────────────┐     ┌──────────────┐
│    sites     │────▶│zones_culture │──┬──▶ resume_campagne
│              │     │              │  │
│ nom          │     │ nom, code    │  ├──▶ meteo_jour
│ type_site    │     │ surface_ha   │  │
│ localisation │     │ type_sol     │  └──▶ (observations via
│ appellation  │     │ lat/lng (GPS)│       parcelles transition)
└──────────────┘     │ irrigation   │
                     │ mode_conduite│
                     └──────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  vignobles   │────▶│  parcelles   │────▶│ observations │
│  (existant)  │     │  (existant)  │     │              │
│  + site_id   │     │  + zone_id   │     │ 41+ champs   │
└──────────────┘     └──────┬───────┘     │ + rendement  │
                            │             │ + scores     │
                            ├────────────▶│              │
                            │             └──────┬───────┘
                            │                    │
                            ├──▶ traitements     ├──▶ photos
                            │   (enrichis)       │
                            │   + type           └──▶ recommandations
                            │   + matière active
                            │   + campagne
                            │
                            └──▶ analyses_sol
                                + PDF labo

┌──────────────────┐     ┌──────────────────┐
│ guide_notation   │     │   app_users      │
│                  │     │                  │
│ 7 fiches métho.  │     │ email, password  │
│ seuils JSON      │     │ role (admin/user)│
│ échelle, exemple │     │ approved (bool)  │
└──────────────────┘     └──────────────────┘
```

---

## Installation

### Prérequis

- Node.js 18+
- npm ou yarn
- Un projet Supabase (gratuit sur [supabase.com](https://supabase.com))

### Étapes

```bash
# 1. Cloner le repo
git clone <repo-url>
cd mylevain-agro

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.local.example .env.local
# Éditer .env.local avec vos clés Supabase

# 4. Exécuter les migrations SQL dans Supabase
# (copier-coller chaque fichier de supabase/migrations/ dans l'éditeur SQL de Supabase)
# Ordre : 001 → 002 → 003 → 004 → 005 → 006 → 007 → 008 → 009

# 5. Lancer en développement
npm run dev
```

### Migrations SQL

| Fichier | Contenu |
|---------|---------|
| `001_schema.sql` | Tables de base (vignobles, parcelles, observations, traitements, analyses_sol, photos, recommandations) |
| `002_seed.sql` | Données initiales (vignobles, parcelles, modalités) |
| `003_metaux_recommandations.sql` | Colonnes métaux lourds + système de recommandations |
| `004_storage.sql` | Configuration Supabase Storage pour les photos |
| `005_admin_config.sql` | Table app_config pour les paramètres |
| `006_phase2_guide_multicult.sql` | Guide notation + multi-cultures (sites, zones, espèces, variétés) |
| `007_phase2_traitements_rendement_meteo.sql` | Traitements enrichis + rendement + météo + vues SQL |
| `008_phase2_seed.sql` | Seed guide notation (7 fiches) + types culture + espèces + variétés |
| `009_auth_users.sql` | Table app_users pour l'authentification |

---

## Configuration

### Variables d'environnement

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-clé-anon
```

### Compte administrateur

Le premier compte admin est créé via la migration `009_auth_users.sql`. Pour définir le mot de passe :

1. Aller dans l'éditeur SQL de Supabase
2. Générer un hash bcrypt pour votre mot de passe (via un outil en ligne ou Node.js : `require('bcryptjs').hashSync('votre_mdp', 10)`)
3. Mettre à jour : `UPDATE app_users SET password_hash = '$2b$10$...' WHERE email = 'admin@mylevain.fr';`

---

## Utilisation

### Flux de travail typique

```
1. Connexion (admin ou opérateur approuvé)
        │
        ▼
2. Page d'accueil — Actions rapides
        │
        ├──▶ 📝 Nouvelle observation (formulaire 41+ champs)
        │         │
        │         ├── Guide notation (?) pour chaque indicateur
        │         ├── Validation temps réel des plages
        │         ├── Pré-remplissage météo GPS
        │         └── Upload photos
        │
        ├──▶ 💧 Nouveau traitement (enrichi Phase 2)
        │         │
        │         ├── Type, matière active, concentration
        │         └── Campagne, objectif
        │
        ├──▶ 📋 Saisie par lot (7 rangs simultanés)
        │
        ├──▶ 📥 Export (CSV / Excel / JSON)
        │         │
        │         ├── Filtres (site, zone, campagne, période, modalité)
        │         └── Validation complétude avant export
        │
        ├──▶ 📄 Rapport PDF professionnel
        │         │
        │         ├── Scores (global, sol, plante, maladie, biostimulant)
        │         ├── Tableaux récapitulatifs
        │         └── Conclusion synthétique auto-générée
        │
        ├──▶ 🧪 Import PDF labo (analyses sol)
        │
        └──▶ ⚙️ Admin (admin uniquement)
                  │
                  ├── Gestion utilisateurs (approuver/révoquer)
                  ├── Gestion vignobles & parcelles
                  ├── Gestion modalités (protocole)
                  └── Paramètres & seuils
```

### Pages disponibles

| Route | Description | Accès |
|-------|-------------|-------|
| `/` | Accueil — actions rapides, vignobles, protocole | Tous |
| `/observations/new` | Formulaire d'observation (41+ champs) | Tous |
| `/observations` | Historique des observations | Tous |
| `/observations/batch` | Saisie par lot (7 rangs) | Tous |
| `/traitements/new` | Formulaire de traitement (enrichi) | Tous |
| `/traitements` | Historique des traitements (filtrable) | Tous |
| `/export` | Export CSV / Excel / JSON | Tous |
| `/rapport` | Génération rapport PDF | Tous |
| `/import/analyse-sol` | Import PDF labo | Tous |
| `/vignobles/[id]` | Fiche vignoble + parcelles | Tous |
| `/vignobles/[id]/galerie` | Galerie photos parcelle | Tous |
| `/vignobles/[id]/timeline` | Timeline événements parcelle | Tous |
| `/admin` | Administration (CRUD + utilisateurs) | Admin |

---

## Tests

L'application utilise une stratégie de test duale : tests unitaires + tests de propriétés (PBT).

```bash
# Lancer tous les tests
npm test

# Lancer un fichier spécifique
npx vitest --run src/__tests__/lib/validation.test.ts

# Lancer les tests de propriétés uniquement
npx vitest --run src/__tests__/properties/
```

### Couverture des propriétés (29 propriétés)

| # | Propriété | Module |
|---|-----------|--------|
| P1 | Mapping guide de notation | guide-notation |
| P2 | Indicateurs adaptés au type de culture | indicateurs-culture |
| P3-P5 | Round-trip export CSV/Excel/JSON | export |
| P6 | Correction des filtres d'export | export |
| P7 | Stabilité des UUID dans l'export | export |
| P8 | Assemblage données rapport PDF | rapport-pdf |
| P9 | Conclusion synthétique | rapport-pdf |
| P10 | Évaluation de complétude | completude |
| P11 | Export toujours autorisé | completude |
| P12 | Champs non détectés PDF labo | pdf-labo-parser |
| P13 | Dernier traitement le plus récent | traitements |
| P14 | Correction vue nb_passages | traitements |
| P15 | Filtrage des traitements | traitements |
| P16 | Pourcentage d'évolution N vs N-1 | comparaison |
| P17 | Comparaison rendement par modalité | rendement |
| P18 | Bornes coefficient de corrélation | correlation |
| P19 | Pré-remplissage météo | meteo |
| P20 | Round-trip stockage offline | offline |
| P21 | Préservation versions conflit | offline |
| P22 | Validation formulaire observation | validation |
| P23 | Duplication d'observation | duplication |
| P24 | Pré-remplissage lot (batch) | batch |
| P25 | Soumission lot erreurs partielles | batch |
| P26 | Tri et filtrage galerie photo | gallery |
| P27 | Fusion et tri timeline | timeline |
| P28 | Mapping type événement timeline | timeline |
| P29 | Filtrage timeline | timeline |

---

## Déploiement

### Vercel (recommandé)

```bash
# 1. Installer Vercel CLI
npm i -g vercel

# 2. Déployer
vercel

# 3. Configurer les variables d'environnement dans le dashboard Vercel
```

### Variables d'environnement Vercel

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Structure du projet

```
mylevain-agro/
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service Worker (offline)
│   └── icon-*.png             # Icônes PWA
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Layout principal (Auth + Nav)
│   │   ├── page.tsx           # Accueil
│   │   ├── globals.css        # Styles globaux + Tailwind
│   │   ├── admin/             # Page administration
│   │   ├── observations/      # Saisie + historique + batch
│   │   ├── traitements/       # Saisie + historique
│   │   ├── vignobles/[id]/    # Fiche + galerie + timeline
│   │   ├── export/            # Export données
│   │   ├── rapport/           # Rapport PDF
│   │   ├── import/            # Import PDF labo
│   │   └── api/auth/          # API routes (login, register, users)
│   ├── components/
│   │   ├── AuthProvider.tsx    # Contexte auth
│   │   ├── AuthGate.tsx       # Protection des routes
│   │   ├── LoginPage.tsx      # Page de connexion
│   │   ├── BottomNav.tsx      # Navigation mobile
│   │   ├── forms/             # Formulaires (observation, batch, rendement)
│   │   ├── ui/                # Composants UI (slider, select, help, validation, offline)
│   │   ├── admin/             # Composants admin (cards, modals)
│   │   ├── export/            # Export panel + complétude
│   │   ├── rapport/           # Générateur rapport PDF
│   │   ├── import/            # Importeur PDF labo
│   │   ├── gallery/           # Galerie photos
│   │   ├── timeline/          # Timeline événements
│   │   ├── meteo/             # Widget météo
│   │   ├── stats/             # Comparaison N vs N-1
│   │   └── traitements/       # Carte dernier traitement
│   └── lib/
│       ├── types.ts           # Interfaces TypeScript (30+)
│       ├── auth.ts            # Helpers auth (session)
│       ├── constants.ts       # Constantes (modalités, options)
│       ├── scoring.ts         # Calcul des scores (plante, sanitaire, rendement)
│       ├── validation.ts      # Validation formulaire
│       ├── duplication.ts     # Duplication d'observation
│       ├── batch.ts           # Logique saisie par lot
│       ├── export.ts          # Export CSV/Excel/JSON + filtres
│       ├── completude.ts      # Validation complétude
│       ├── rapport-pdf.ts     # Génération rapport PDF
│       ├── pdf-labo-parser.ts # Parseur PDF analyses labo
│       ├── meteo.ts           # API Open-Meteo
│       ├── offline.ts         # IndexedDB + sync
│       ├── timeline.ts        # Fusion/tri/filtrage timeline
│       ├── gallery.ts         # Filtrage/tri galerie photos
│       ├── traitements.ts     # Helpers traitements
│       ├── comparaison.ts     # Calcul % évolution N vs N-1
│       ├── rendement.ts       # Groupement rendement par modalité
│       ├── correlation.ts     # Coefficient de Pearson
│       ├── indicateurs-culture.ts  # Indicateurs par type culture
│       ├── guide-notation.ts  # Mapping champs → guide notation
│       └── supabase/
│           └── client.ts      # Client Supabase
├── supabase/
│   └── migrations/            # 9 fichiers SQL
└── __tests__/
    ├── lib/                   # Tests unitaires
    └── properties/            # Tests de propriétés (fast-check)
```

---

## Licence

Projet privé — MyLevain Agro Intelligence © 2026
