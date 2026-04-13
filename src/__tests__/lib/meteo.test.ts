import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchMeteo, prefillMeteoFields, descriptionFromWMO } from "@/lib/meteo";
import type { MeteoData } from "@/lib/types";

// ---------- descriptionFromWMO ----------

describe("descriptionFromWMO", () => {
  it("returns 'Ciel dégagé' for code 0", () => {
    expect(descriptionFromWMO(0)).toBe("Ciel dégagé");
  });

  it("returns 'Partiellement nuageux' for codes 1-3", () => {
    expect(descriptionFromWMO(1)).toBe("Partiellement nuageux");
    expect(descriptionFromWMO(3)).toBe("Partiellement nuageux");
  });

  it("returns 'Pluie' for codes 61-67", () => {
    expect(descriptionFromWMO(61)).toBe("Pluie");
    expect(descriptionFromWMO(67)).toBe("Pluie");
  });

  it("returns 'Orage' for codes 95-99", () => {
    expect(descriptionFromWMO(95)).toBe("Orage");
    expect(descriptionFromWMO(99)).toBe("Orage");
  });

  it("returns 'Inconnu' for codes >= 100", () => {
    expect(descriptionFromWMO(100)).toBe("Inconnu");
  });
});

// ---------- prefillMeteoFields ----------

describe("prefillMeteoFields", () => {
  it("maps actuelle.temperature to temperature field", () => {
    const meteo: MeteoData = {
      actuelle: {
        temperature: 22.3,
        humidite: 65,
        precipitations: 0,
        vent_kmh: 12,
        description: "Ciel dégagé",
      },
      previsions: [],
    };
    const result = prefillMeteoFields(meteo);
    expect(result.temperature).toBe(22.3);
  });

  it("maps actuelle.humidite to humidite field", () => {
    const meteo: MeteoData = {
      actuelle: {
        temperature: 18,
        humidite: 72,
        precipitations: 1.2,
        vent_kmh: 5,
        description: "Pluie",
      },
      previsions: [],
    };
    const result = prefillMeteoFields(meteo);
    expect(result.humidite).toBe(72);
  });

  it("rounds temperature to 1 decimal", () => {
    const meteo: MeteoData = {
      actuelle: {
        temperature: 18.456,
        humidite: 65.7,
        precipitations: 0,
        vent_kmh: 0,
        description: "Ciel dégagé",
      },
      previsions: [],
    };
    const result = prefillMeteoFields(meteo);
    expect(result.temperature).toBe(18.5);
  });

  it("rounds humidite to integer", () => {
    const meteo: MeteoData = {
      actuelle: {
        temperature: 20,
        humidite: 65.7,
        precipitations: 0,
        vent_kmh: 0,
        description: "Ciel dégagé",
      },
      previsions: [],
    };
    const result = prefillMeteoFields(meteo);
    expect(result.humidite).toBe(66);
  });

  it("returns both fields as an object", () => {
    const meteo: MeteoData = {
      actuelle: {
        temperature: 25,
        humidite: 50,
        precipitations: 0,
        vent_kmh: 10,
        description: "Partiellement nuageux",
      },
      previsions: [],
    };
    const result = prefillMeteoFields(meteo);
    expect(result).toEqual({ temperature: 25, humidite: 50 });
  });
});

// ---------- fetchMeteo ----------

describe("fetchMeteo", () => {
  const mockApiResponse = {
    current: {
      temperature_2m: 22.5,
      relative_humidity_2m: 68,
      precipitation: 0.2,
      wind_speed_10m: 15.3,
      weather_code: 1,
    },
    daily: {
      time: ["2025-06-20", "2025-06-21", "2025-06-22"],
      temperature_2m_max: [25, 27, 23],
      temperature_2m_min: [14, 16, 12],
      precipitation_sum: [0, 2.5, 0.1],
      weather_code: [0, 61, 3],
    },
  };

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockApiResponse),
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls Open-Meteo API with correct URL", async () => {
    await fetchMeteo(44.8378, -0.5792);
    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(call).toContain("api.open-meteo.com");
    expect(call).toContain("latitude=44.8378");
    expect(call).toContain("longitude=-0.5792");
  });

  it("returns actuelle with correct values", async () => {
    const result = await fetchMeteo(44.8378, -0.5792);
    expect(result.actuelle.temperature).toBe(22.5);
    expect(result.actuelle.humidite).toBe(68);
    expect(result.actuelle.precipitations).toBe(0.2);
    expect(result.actuelle.vent_kmh).toBe(15.3);
    expect(result.actuelle.description).toBe("Partiellement nuageux");
  });

  it("returns 3 days of previsions", async () => {
    const result = await fetchMeteo(44.8378, -0.5792);
    expect(result.previsions).toHaveLength(3);
  });

  it("maps previsions correctly", async () => {
    const result = await fetchMeteo(44.8378, -0.5792);
    expect(result.previsions[0]).toEqual({
      date: "2025-06-20",
      temp_min: 14,
      temp_max: 25,
      precipitations: 0,
      description: "Ciel dégagé",
    });
    expect(result.previsions[1].description).toBe("Pluie");
  });

  it("throws on API error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      })
    );
    await expect(fetchMeteo(44.8378, -0.5792)).rejects.toThrow(
      "Open-Meteo API error: 500 Internal Server Error"
    );
  });

  it("throws on network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network error"))
    );
    await expect(fetchMeteo(44.8378, -0.5792)).rejects.toThrow("Network error");
  });
});
