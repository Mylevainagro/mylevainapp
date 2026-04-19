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
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 bg-gradient-to-br from-emerald-100 via-white to-amber-50" />
      <div className="fixed top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-200/40 blur-3xl animate-pulse-slow" />
      <div className="fixed bottom-[-15%] right-[-10%] w-[400px] h-[400px] rounded-full bg-amber-200/30 blur-3xl animate-pulse-slow-delayed" />
      <div className="fixed top-[30%] right-[5%] w-[200px] h-[200px] rounded-full bg-emerald-300/20 blur-2xl animate-float" />

      <div className="w-full max-w-sm relative z-10 animate-fadeIn">
        {/* Logo section */}
        <div className="text-center mb-10">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-emerald-400/20 rounded-3xl blur-xl scale-150 animate-pulse-slow" />
            <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-800 shadow-2xl shadow-emerald-300/50 mb-5 transform hover:scale-105 transition-transform duration-300">
              <span className="text-5xl drop-shadow-md">🍇</span>
            </div>
          </div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-emerald-900 via-emerald-700 to-emerald-500 bg-clip-text text-transparent tracking-tight">
            MyLevain Agro
          </h1>
          <p className="text-sm text-gray-500 mt-2 font-medium tracking-wide">
            Intelligence agronomique terrain
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl shadow-gray-200/60 border border-white/80 p-7 relative overflow-hidden">
          {/* Subtle top accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-emerald-600 to-amber-500 rounded-t-3xl" />

          {/* Tab switcher */}
          <div className="flex bg-gray-100/80 rounded-2xl p-1 mb-6">
            <button
              type="button"
              onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 ${
                mode === "login"
                  ? "bg-white text-emerald-700 shadow-md shadow-gray-200/50"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => { setMode("register"); setError(""); setSuccess(""); }}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 ${
                mode === "register"
                  ? "bg-white text-emerald-700 shadow-md shadow-gray-200/50"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Inscription
            </button>
          </div>

          {error && (
            <div className="bg-red-50/80 backdrop-blur-sm border border-red-200/60 text-red-700 rounded-2xl px-4 py-3 text-sm mb-5 flex items-center gap-2 animate-fadeIn">
              <span className="text-base">⚠️</span>
              {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-50/80 backdrop-blur-sm border border-emerald-200/60 text-emerald-700 rounded-2xl px-4 py-3 text-sm mb-5 flex items-center gap-2 animate-fadeIn">
              <span className="text-base">✅</span>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div className="animate-fadeIn">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Nom complet
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-base">👤</span>
                  <input
                    type="text"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    required
                    placeholder="Jean Dupont"
                    className="w-full border border-gray-200/80 rounded-xl pl-10 pr-4 py-3.5 text-sm bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all placeholder:text-gray-400"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Email
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-base">✉️</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="email@exemple.fr"
                  className="w-full border border-gray-200/80 rounded-xl pl-10 pr-4 py-3.5 text-sm bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all placeholder:text-gray-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-base">🔒</span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="w-full border border-gray-200/80 rounded-xl pl-10 pr-12 py-3.5 text-sm bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl py-4 font-bold text-base shadow-lg shadow-emerald-200/60 hover:shadow-emerald-300/80 hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 active:scale-[0.98] mt-2 relative overflow-hidden group"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Chargement...
                </span>
              ) : mode === "login" ? (
                "Se connecter →"
              ) : (
                "Créer mon compte →"
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 space-y-2">
          <p className="text-xs text-gray-400 font-medium">
            MyLevain Agro Intelligence © 2026
          </p>
          <p className="text-xs text-gray-300">
            mylevain.com
          </p>
        </div>
      </div>
    </div>
  );
}
