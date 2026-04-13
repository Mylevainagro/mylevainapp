import type { MeteoData, MeteoActuelle, PrevisionJour } from "@/lib/types";

/**
 * Décrit la météo à partir du code WMO (World Meteorological Organization).
 */
function descriptionFromWMO(code: number): string {
  if (code === 0) return "Ciel dégagé";
  if (code <= 3) return "Partiellement nuageux";
  if (code <= 48) return "Brouillard";
  if (code <= 57) return "Bruine";
  if (code <= 67) return "Pluie";
  if (code <= 77) return "Neige";
  if (code <= 82) return "Averses";
  if (code <= 86) return "Averses de neige";
  if (code <= 99) return "Orage";
  return "Inconnu";
}

/**
 * Appelle l'API Open-Meteo (gratuite, sans clé API) pour récupérer
 * la météo actuelle et les prévisions 3 jours pour des coordonnées GPS.
 *
 * Exigences : 9.1, 9.2
 */
export async function fetchMeteo(
  lat: number,
  lng: number
): Promise<MeteoData> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code` +
    `&timezone=auto&forecast_days=3`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Open-Meteo API error: ${response.status} ${response.statusText}`
    );
  }

  const json = await response.json();

  const actuelle: MeteoActuelle = {
    temperature: json.current.temperature_2m,
    humidite: json.current.relative_humidity_2m,
    precipitations: json.current.precipitation,
    vent_kmh: json.current.wind_speed_10m,
    description: descriptionFromWMO(json.current.weather_code ?? 0),
  };

  const previsions: PrevisionJour[] = (json.daily?.time ?? []).map(
    (date: string, i: number) => ({
      date,
      temp_min: json.daily.temperature_2m_min[i],
      temp_max: json.daily.temperature_2m_max[i],
      precipitations: json.daily.precipitation_sum[i],
      description: descriptionFromWMO(json.daily.weather_code?.[i] ?? 0),
    })
  );

  return { actuelle, previsions };
}

/**
 * Fonction pure de pré-remplissage des champs météo du formulaire
 * d'observation à partir des données MeteoData.
 *
 * Exigence : 9.5
 */
export function prefillMeteoFields(
  meteo: MeteoData
): { temperature: number; humidite: number } {
  return {
    temperature: Math.round(meteo.actuelle.temperature * 10) / 10,
    humidite: Math.round(meteo.actuelle.humidite),
  };
}

// Re-export for convenience
export { descriptionFromWMO };
