"use client";

import type { CompletudeResult } from "@/lib/types";

// ============================================================
// CompletudeStatus — Affichage du statut de complétude
// Exigences : 5.3, 5.5
// ============================================================

interface CompletudeStatusProps {
  result: CompletudeResult;
  onContinue: () => void;
  onGoBack: () => void;
}

const STATUS_CONFIG: Record<
  CompletudeResult["status"],
  { label: string; emoji: string; badgeClass: string; borderClass: string }
> = {
  complete: {
    label: "Rapport complet",
    emoji: "✅",
    badgeClass: "bg-green-100 text-green-800 border-green-300",
    borderClass: "border-green-200",
  },
  partial: {
    label: "Rapport partiel",
    emoji: "⚠️",
    badgeClass: "bg-yellow-100 text-yellow-800 border-yellow-300",
    borderClass: "border-yellow-200",
  },
  incomplete: {
    label: "Rapport incomplet",
    emoji: "❌",
    badgeClass: "bg-red-100 text-red-800 border-red-300",
    borderClass: "border-red-200",
  },
};

export function CompletudeStatus({ result, onContinue, onGoBack }: CompletudeStatusProps) {
  const config = STATUS_CONFIG[result.status];

  return (
    <div className={`bg-white rounded-xl border ${config.borderClass} p-4 space-y-3`}>
      {/* Status badge */}
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${config.badgeClass}`}
        >
          {config.emoji} {config.label}
        </span>
      </div>

      {/* Message */}
      <p className="text-sm text-gray-600">{result.message}</p>

      {/* Missing required items */}
      {result.missing_required.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">
            Éléments requis manquants
          </h3>
          <ul className="list-disc list-inside text-sm text-red-600 space-y-0.5">
            {result.missing_required.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Missing recommended items */}
      {result.missing_recommended.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-yellow-700 uppercase tracking-wide mb-1">
            Éléments recommandés manquants
          </h3>
          <ul className="list-disc list-inside text-sm text-yellow-600 space-y-0.5">
            {result.missing_recommended.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 pt-1">
        <button
          onClick={onContinue}
          className="flex-1 bg-[#2d5016] text-white rounded-lg py-2.5 text-sm font-medium hover:bg-[#3a6b1e] transition-colors"
        >
          Continuer quand même
        </button>
        <button
          onClick={onGoBack}
          className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Retourner compléter
        </button>
      </div>
    </div>
  );
}
