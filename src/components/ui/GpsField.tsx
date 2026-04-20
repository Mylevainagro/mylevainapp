"use client";

import { useState } from "react";

interface GpsFieldProps {
  latitude: number | null;
  longitude: number | null;
  onChangeLatitude: (v: number | null) => void;
  onChangeLongitude: (v: number | null) => void;
}

export function GpsField({ latitude, longitude, onChangeLatitude, onChangeLongitude }: GpsFieldProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

  function fetchGps() {
    if (!navigator.geolocation) {
      setStatus("error");
      return;
    }
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChangeLatitude(Math.round(pos.coords.latitude * 1000000) / 1000000);
        onChangeLongitude(Math.round(pos.coords.longitude * 1000000) / 1000000);
        setStatus("ok");
      },
      () => setStatus("error"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function clearGps() {
    onChangeLatitude(null);
    onChangeLongitude(null);
    setStatus("idle");
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">📍 Coordonnées GPS</label>
        <div className="flex gap-1.5">
          <button type="button" onClick={fetchGps}
            className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg font-medium hover:bg-emerald-100 transition-colors flex items-center gap-1">
            {status === "loading" ? (
              <><span className="w-3 h-3 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" /> Localisation…</>
            ) : (
              <>🔄 {latitude ? "Actualiser" : "Localiser"}</>
            )}
          </button>
          {(latitude || longitude) && (
            <button type="button" onClick={clearGps}
              className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-lg hover:bg-red-100 transition-colors">
              ✕
            </button>
          )}
        </div>
      </div>

      {status === "error" && (
        <p className="text-xs text-amber-600">GPS indisponible — saisissez manuellement ou réessayez.</p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-medium text-gray-500">Latitude</label>
          <input type="number" step="0.000001" value={latitude ?? ""} onChange={e => onChangeLatitude(e.target.value ? Number(e.target.value) : null)}
            className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm" placeholder="44.8378" />
        </div>
        <div>
          <label className="text-[10px] font-medium text-gray-500">Longitude</label>
          <input type="number" step="0.000001" value={longitude ?? ""} onChange={e => onChangeLongitude(e.target.value ? Number(e.target.value) : null)}
            className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm" placeholder="-0.5792" />
        </div>
      </div>

      {latitude && longitude && status === "ok" && (
        <p className="text-[10px] text-emerald-600">✓ Position récupérée : {latitude}, {longitude}</p>
      )}
    </div>
  );
}
