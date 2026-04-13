-- ============================================================
-- Migration 009 : Authentification — Table utilisateurs
-- Un seul admin, les autres sont approuvés par l'admin
-- ============================================================

CREATE TABLE app_users (
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
CREATE INDEX idx_app_users_email ON app_users(email);

-- Insérer l'admin par défaut (mot de passe: admin123 — à changer en production)
-- Le hash est généré côté app avec bcrypt, ici on met un placeholder
-- L'admin sera créé au premier lancement via le seed ou l'interface
INSERT INTO app_users (email, password_hash, nom, role, approved) VALUES
('admin@mylevain.fr', '$2b$10$maPpddgAFxKF0jvQ5qZ.0eh3B3pdr4Pn2UHoas/S5ZtUuqUE0W3KO', 'Administrateur', 'admin', true);
