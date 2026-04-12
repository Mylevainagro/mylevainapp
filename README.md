# 🍇 MyLevain Agro Intelligence

Outil de suivi terrain en viticulture — Campagne 2026.

Pilote : Château Pape Clément + Piotte.

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Supabase** (PostgreSQL + Storage + Auth)
- **Tailwind CSS 3**
- **Vercel** (déploiement)

## Lancer en local

```bash
cd mylevain-agro
npm install
npm run dev
```

Ouvrir `http://localhost:3000`

## Variables d'environnement

Créer un fichier `.env.local` :

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```
