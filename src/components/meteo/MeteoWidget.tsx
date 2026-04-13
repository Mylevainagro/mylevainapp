"use client";

import { useEffect, useState } from "react";
import type { MeteoData } from "@/lib/types";
import { fetchMeteo } from "@/lib/meteo";

interface MeteoWidgetProps {
  latitude: number | null;
  longitude: number | null;
}

/**
 * Widget météo temps réel affichant température, humidité,
 * précipitations et prévisions 2-3 jours.
 *
 * Exigences : 9.2, 9.3, 9.6
 */
export default function MeteoWidget({ latitude, longitude }: MeteoWidgetProps) {
  const [meteo, setMeteo] = useState<MeteoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (latitude == null || longitude == null) {
      setMeteo(null);
      setError(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    fetchMeteo(latitude, longitude)
      .then((data) => {
        if (!cancelled) {
          setMeteo(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [latitude, longitude]);

  // No coordinates available
  if (latitude == null || longitude == null) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
        📍 Coordonnées GPS non renseignées — météo indisponible
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-400 animate-pulse">
        ⏳ Chargement météo…
      </div>
    );
  }

  // API error or no data
  if (error || !meteo) {
    return (
      <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-600">
        ⚠️ Météo indisponible — les champs météo restent modifiables
      </div>
    );
  }

  const { actuelle, previsions } = meteo;

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
      {/* Current weather */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-blue-800">🌤 Météo actuelle</h3>
        <span className="text-xs text-blue-500">{actuelle.description}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-white rounded px-3 py-2">
          <span className="text-gray-500">🌡 Température</span>
          <p className="font-medium">{actuelle.temperature}°C</p>
        </div>
        <div className="bg-white rounded px-3 py-2">
          <span className="text-gray-500">💧 Humidité</span>
          <p className="font-medium">{actuelle.humidite}%</p>
        </div>
        <div className="bg-white rounded px-3 py-2">
          <span className="text-gray-500">🌧 Précipitations</span>
          <p className="font-medium">{actuelle.precipitations} mm</p>
        </div>
        <div className="bg-white rounded px-3 py-2">
          <span className="text-gray-500">💨 Vent</span>
          <p className="font-medium">{actuelle.vent_kmh} km/h</p>
        </div>
      </div>

      {/* Forecast */}
      {previsions.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-blue-700 mb-1">
            Prévisions
          </h4>
          <div className="space-y-1">
            {previsions.map((jour: { date: string; temp_min: number; temp_max: number; precipitations: number; description: string }) => (
              <div
                key={jour.date}
                className="flex items-center justify-between bg-white rounded px-3 py-1.5 text-xs"
              >
                <span className="text-gray-600 w-24">
                  {new Date(jour.date + "T00:00:00").toLocaleDateString("fr-FR", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                <span className="text-gray-500">{jour.description}</span>
                <span className="font-medium">
                  {jour.temp_min}° / {jour.temp_max}°
                </span>
                <span className="text-blue-500">{jour.precipitations} mm</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
