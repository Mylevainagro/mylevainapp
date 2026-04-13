# 🍇 MyLevain Agro Intelligence

**Plateforme de suivi terrain pour les essais de biostimulants en agriculture.**

MyLevain Agro permet aux opérateurs terrain de collecter, analyser et restituer les données d'essais agronomiques — en particulier l'effet du levain comme biostimulant sur la vigne et d'autres cultures.

---

## 🎯 À quoi sert cette application ?

MyLevain Agro répond à un besoin concret : **prouver scientifiquement l'effet du levain** comme biostimulant en agriculture, en collectant des données terrain rigoureuses et en les restituant sous forme de rapports professionnels.

### Le protocole

L'essai se fait sur **7 rangs** avec différentes modalités de traitement :

| Rang | Modalité | Description |
|------|----------|-------------|
| 1 | Témoin | Aucun traitement (référence) |
| 2 | Levain 1/4 | 1L surnageant + 3L eau |
| 3 | Levain 1/2 | 2L surnageant + 2L eau |
| 4 | Témoin | Aucun traitement (référence) |
| 5 | Levain 1/4 + Cuivre | Levain dilué + cuivre |
| 6 | Levain 1/2 + Cuivre | Levain concentré + cuivre |
| 7 | Témoin | Aucun traitement (référence) |

En comparant les rangs traités au levain vs les rangs témoins, on mesure l'impact sur la vigueur, la résistance aux maladies et le rendement.

### Ce que l'app permet de faire

```
📝 COLLECTER                    📊 ANALYSER                    📄 RESTITUER
─────────────                   ──────────                     ──────────
• Observations terrain          • Scores automatiques          • Export CSV/Excel/JSON
  (41+ indicateurs)               (plante, sanitaire, sol)     • Rapport PDF pro
• Traitements appliqués         • Comparaison par modalité     • Galerie photos
• Analyses de sol (PDF labo)    • Évolution N vs N-1           • Timeline événements
• Photos géolocalisées          • Corrélations rendement       • Validation complétude
• Données météo GPS             • Suivi rendement              
```

---

## 🚀 Comment utiliser l'application

### 1. Se connecter

Ouvrez l'app → page de connexion → entrez vos identifiants.

- **Admin** : `admin@mylevain.com` / `admin123`
- **Nouvel utilisateur** : cliquez "S'inscrire", remplissez le formulaire. Votre compte sera en attente d'approbation par l'admin.

### 2. Mode Démo vs Mode Réel

Un bouton en bas à gauche permet de basculer entre :

- **Mode Réel** : données depuis Supabase (votre vraie base de données)
- **Mode Démo** : données fictives réalistes pré-remplies (21 observations, 24 traitements, 2 analyses sol) — idéal pour les présentations investisseurs

Le mode persiste entre les pages.

### 3. Saisir une observation

**Accueil → 📝 Nouvelle observation**

Le formulaire contient 41+ champs organisés en sections :
- **Identification** : vignoble, parcelle, rang (modalité auto-remplie), date/heure
- **Météo** : conditions, température, humidité, vent (pré-rempli par GPS si disponible)
- **État plante** : vigueur, croissance, homogénéité, couleur, épaisseur, turgescence (notes 0-5)
- **Symptômes** : brûlures, nécroses, déformations
- **Maladies** : mildiou présence/intensité, localisation, progression, pression
- **Grappes** : nombre, taille, homogénéité
- **Rendement** : nombre grappes, poids moyen, rendement estimé/réel
- **Photos** : upload de photos terrain
- **Commentaires** : notes libres

Chaque indicateur a une icône **(?)** qui ouvre un guide de notation avec la méthodologie de mesure.

Les scores (plante et sanitaire) sont calculés automatiquement.

### 4. Saisie par lot (7 rangs)

**Accueil → 📋 Saisie par lot**

Pour un passage mensuel complet : saisissez les 7 rangs en une seule session. Les champs communs (date, météo, parcelle) sont partagés. La modalité de chaque rang est auto-remplie.

### 5. Enregistrer un traitement

**Accueil → 💧 Nouveau traitement**

Champs : produit, dose, méthode, type (cuivre/soufre/levain/biocontrôle), matière active, concentration, objectif, campagne.

### 6. Consulter l'historique

- **📋 Historique** (nav du bas) : toutes les observations avec filtres rang/mois + bouton "Dupliquer comme modèle"
- **💧 Traitements** (nav du bas) : tous les traitements avec filtres campagne/type

### 7. Exporter les données

**Plus → 📥 Export**

Choisissez le format (CSV, Excel multi-onglets, JSON) et appliquez des filtres (site, zone, campagne, période, modalité). L'app vérifie la complétude des données avant l'export.

### 8. Générer un rapport PDF

**Plus → 📄 Rapport PDF**

Sélectionnez un site et une campagne → le rapport contient :
- En-tête (site, parcelle, cépage, période)
- Scores (global, sol, plante, maladie, biostimulant)
- Tableaux récapitulatifs (observations, traitements, analyses sol)
- Conclusion synthétique auto-générée

**En mode démo**, les sites sont pré-remplis — sélectionnez "Château Piotte" et campagne "2026" pour générer un rapport complet.

### 9. Importer une analyse de sol (PDF labo)

**Plus → 🧪 Import labo**

Uploadez un PDF d'analyse de laboratoire (Eurofins, etc.). L'app extrait automatiquement les valeurs (pH, matière organique, C/N, métaux lourds...) et vous permet de les corriger avant insertion.

### 10. Administration (admin uniquement)

**Plus → ⚙️ Admin**

- **Gestion utilisateurs** : approuver/révoquer les comptes, supprimer des utilisateurs
- **Gestion vignobles & parcelles** : CRUD complet
- **Gestion modalités** : modifier le protocole (rangs, volumes)
- **Paramètres & seuils** : configuration de l'app

---

## 🔐 Gestion des accès

| Action | Qui peut le faire |
|--------|-------------------|
| Se connecter | Tout utilisateur approuvé |
| S'inscrire | Tout le monde (compte en attente) |
| Approuver un compte | Admin uniquement |
| Accéder à l'Admin | Admin uniquement |
| Saisir des observations | Tout utilisateur approuvé |
| Exporter / Rapport PDF | Tout utilisateur approuvé |

**Flux d'inscription :**
1. L'utilisateur s'inscrit (nom, email, mot de passe)
2. Message : "En attente d'approbation par l'administrateur"
3. L'admin va dans Admin → Gestion utilisateurs → clique "✅ Approuver"
4. L'utilisateur peut maintenant se connecter

---

## 🏗️ Architecture technique

```
Next.js 14 (App Router)  ←→  Supabase (PostgreSQL + Storage)
     │                              │
     ├── Tailwind CSS 3             ├── 20+ tables
     ├── TypeScript strict          ├── Vues SQL
     ├── Service Worker (offline)   ├── Storage (photos + PDFs)
     ├── IndexedDB (sync queue)     └── Row Level Security
     └── Open-Meteo API (météo)
```

### Stack

- **Frontend** : Next.js 14, React, Tailwind CSS 3, Inter font
- **Backend** : Supabase (PostgreSQL), API Routes Next.js (auth)
- **PDF** : jsPDF + jspdf-autotable
- **Excel** : SheetJS (xlsx)
- **Tests** : Vitest + fast-check (309 tests, 29 propriétés)
- **Déploiement** : Vercel

---

## 📦 Installation

```bash
cd mylevain-agro
npm install
cp .env.local.example .env.local  # configurer les clés Supabase
npm run dev                        # http://localhost:3000
```

### Migrations SQL

Exécuter dans l'ordre dans le SQL Editor de Supabase :
`001_schema.sql` → `002_seed.sql` → ... → `009_auth_users.sql`

### Tests

```bash
npm test          # 309 tests (unitaires + propriétés)
npm run build     # vérifier le build production
```

---

## 📱 Fonctionnalités PWA

- Installable sur mobile (Add to Home Screen)
- Mode hors-ligne (Service Worker + IndexedDB)
- Synchronisation automatique au retour du réseau
- Indicateur visuel du mode offline

---

## 📄 Licence

Projet privé — MyLevain Agro Intelligence © 2026 — mylevain.com
