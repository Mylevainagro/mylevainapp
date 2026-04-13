"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";

export function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nom, setNom] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    if (mode === "login") {
      const err = await login(email, password);
      if (err) setError(err);
    } else {
      const err = await register(email, password, nom);
      if (err) {
        setError(err);
      } else {
        setSuccess("Inscription réussie ! En attente d'approbation par l'administrateur.");
        setMode("login");
        setNom("");
        setPassword("");
      }
    }
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-amber-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-600 to-emerald-800 shadow-lg shadow-emerald-200 mb-4">
            <span className="text-4xl">🍇</span>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-800 to-emerald-600 bg-clip-text text-transparent">
            MyLevain Agro
          </h1>
          <p className="text-sm text-gray-500 mt-1">Intelligence agronomique terrain</p>
        </div>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-gray-200/50 border border-white/60 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            {mode === "login" ? "Connexion" : "Créer un compte"}
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm mb-4">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
                <input
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  required
                  placeholder="Jean Dupont"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="email@exemple.fr"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl py-3.5 font-semibold shadow-lg shadow-emerald-200 hover:shadow-emerald-300 hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 transition-all"
            >
              {submitting
                ? "Chargement..."
                : mode === "login"
                ? "Se connecter"
                : "S'inscrire"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setSuccess(""); }}
              className="text-sm text-emerald-600 hover:text-emerald-800 font-medium transition-colors"
            >
              {mode === "login" ? "Pas encore de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          MyLevain Agro Intelligence © 2026 — melevain.com
        </p>
      </div>
    </div>
  );
}
