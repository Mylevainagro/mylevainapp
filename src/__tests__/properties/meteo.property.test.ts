// Feature: phase2-evolution, Property 19: Pré-remplissage météo depuis l'API
// **Validates: Requirements 9.5**
//
// Property 19: Pour toute donnée MeteoData valide retournée par l'API, la
// fonction de pré-remplissage doit mapper actuelle.temperature vers le champ
// temperature du formulaire et actuelle.humidite vers le champ humidite du
// formulaire.

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { prefillMeteoFields } from '@/lib/meteo';
import type { MeteoData, MeteoActuelle, PrevisionJour } from '@/lib/types';

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Realistic temperature range (-40 to 60°C) */
const temperatureArb = fc.double({ min: -40, max: 60, noNaN: true, noDefaultInfinity: true });

/** Realistic humidity range (0 to 100%) */
const humiditeArb = fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true });

/** Realistic precipitation (0 to 500 mm) */
const precipitationsArb = fc.double({ min: 0, max: 500, noNaN: true, noDefaultInfinity: true });

/** Realistic wind speed (0 to 200 km/h) */
const ventArb = fc.double({ min: 0, max: 200, noNaN: true, noDefaultInfinity: true });

/** Weather description */
const descriptionArb = fc.constantFrom(
  'Ciel dégagé',
  'Partiellement nuageux',
  'Brouillard',
  'Bruine',
  'Pluie',
  'Neige',
  'Averses',
  'Orage',
  'Inconnu',
);

/** Generate a valid MeteoActuelle */
const meteoActuelleArb: fc.Arbitrary<MeteoActuelle> = fc.record({
  temperature: temperatureArb,
  humidite: humiditeArb,
  precipitations: precipitationsArb,
  vent_kmh: ventArb,
  description: descriptionArb,
});

/** Generate a valid PrevisionJour */
const previsionJourArb: fc.Arbitrary<PrevisionJour> = fc.record({
  date: fc.integer({ min: 0, max: 3650 }).map((days) => {
    const d = new Date(2020, 0, 1);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }),
  temp_min: temperatureArb,
  temp_max: temperatureArb,
  precipitations: precipitationsArb,
  description: descriptionArb,
});

/** Generate a valid MeteoData with 0-5 previsions */
const meteoDataArb: fc.Arbitrary<MeteoData> = fc.record({
  actuelle: meteoActuelleArb,
  previsions: fc.array(previsionJourArb, { minLength: 0, maxLength: 5 }),
});

// ---------------------------------------------------------------------------
// Property 19: Pré-remplissage météo depuis l'API
// ---------------------------------------------------------------------------

describe('Property 19: Pré-remplissage météo depuis l\'API', () => {
  it('prefillMeteoFields maps actuelle.temperature to temperature and actuelle.humidite to humidite', () => {
    fc.assert(
      fc.property(meteoDataArb, (meteo) => {
        const result = prefillMeteoFields(meteo);

        // temperature must be actuelle.temperature rounded to 1 decimal
        const expectedTemp = Math.round(meteo.actuelle.temperature * 10) / 10;
        expect(result.temperature).toBe(expectedTemp);

        // humidite must be actuelle.humidite rounded to integer
        const expectedHum = Math.round(meteo.actuelle.humidite);
        expect(result.humidite).toBe(expectedHum);
      }),
      { numRuns: 100 },
    );
  });
});
