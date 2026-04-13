-- ============================================================
-- Migration 009 : Authentification — Table utilisateurs
-- Un seul admin, les autres sont approuvés par l'admin
-- IDEMPOTENT : rejouable sans erreur
-- ============================================================

CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nom TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login TIMESTAMPTZ
);

-- Index pour la recherche par email
CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);

-- Insérer l'admin par défaut (mot de passe: admin123)
-- ON CONFLICT = ne fait rien si l'email existe déjà
INSERT INTO app_users (email, password_hash, nom, role, approved) VALUES
('admin@mylevain.com', '$2b$10$maPpddgAFxKF0jvQ5qZ.0eh3B3pdr4Pn2UHoas/S5ZtUuqUE0W3KO', 'Administrateur', 'admin', true)
ON CONFLICT (email) DO NOTHING;
