import { describe, it, expect } from 'vitest';
import { parseLaboText } from '@/lib/pdf-labo-parser';

describe('parseLaboText', () => {
  it('extracts pH value with haute confiance', () => {
    const text = 'pH eau : 7,2\nMatière organique : 3,5%';
    const result = parseLaboText(text, 'test.pdf');

    const ph = result.valeurs.find((v) => v.champ === 'ph');
    expect(ph).toBeDefined();
    expect(ph!.valeur).toBeCloseTo(7.2);
    expect(ph!.confiance).toBe('haute');
  });

  it('extracts matiere_organique_pct with percentage', () => {
    const text = 'Matière organique : 3,5 %';
    const result = parseLaboText(text, 'labo.pdf');

    const mo = result.valeurs.find((v) => v.champ === 'matiere_organique_pct');
    expect(mo).toBeDefined();
    expect(mo!.valeur).toBeCloseTo(3.5);
    expect(mo!.confiance).toBe('haute');
  });

  it('extracts C/N ratio', () => {
    const text = 'Rapport C/N : 12,8';
    const result = parseLaboText(text, 'test.pdf');

    const cn = result.valeurs.find((v) => v.champ === 'rapport_c_n');
    expect(cn!.valeur).toBeCloseTo(12.8);
    expect(cn!.confiance).toBe('haute');
  });

  it('extracts heavy metals (Cu, Cd, Pb, As, Mn)', () => {
    const text = [
      'Cuivre total : 45,3 mg/kg',
      'Cuivre biodisponible : 12,1 mg/kg',
      'Cadmium total : 0,25 mg/kg',
      'Plomb total : 18,7 mg/kg',
      'Arsenic total : 5,4 mg/kg',
      'Manganèse total : 320,0 mg/kg',
    ].join('\n');

    const result = parseLaboText(text, 'metaux.pdf');

    expect(result.valeurs.find((v) => v.champ === 'cuivre_total')!.valeur).toBeCloseTo(45.3);
    expect(result.valeurs.find((v) => v.champ === 'cuivre_biodisponible')!.valeur).toBeCloseTo(12.1);
    expect(result.valeurs.find((v) => v.champ === 'cadmium_total')!.valeur).toBeCloseTo(0.25);
    expect(result.valeurs.find((v) => v.champ === 'plomb_total')!.valeur).toBeCloseTo(18.7);
    expect(result.valeurs.find((v) => v.champ === 'arsenic_total')!.valeur).toBeCloseTo(5.4);
    expect(result.valeurs.find((v) => v.champ === 'manganese_total')!.valeur).toBeCloseTo(320.0);
  });

  it('marks undetected fields as non_detecte with null value', () => {
    const text = 'pH eau : 6,8';
    const result = parseLaboText(text, 'minimal.pdf');

    const undetected = result.valeurs.filter((v) => v.confiance === 'non_detecte');
    expect(undetected.length).toBeGreaterThan(0);
    for (const v of undetected) {
      expect(v.valeur).toBeNull();
    }
  });

  it('returns all 14 champs in valeurs array', () => {
    const result = parseLaboText('', 'empty.pdf');
    expect(result.valeurs).toHaveLength(14);

    const champs = result.valeurs.map((v) => v.champ);
    expect(champs).toContain('ph');
    expect(champs).toContain('matiere_organique_pct');
    expect(champs).toContain('rapport_c_n');
    expect(champs).toContain('azote_total');
    expect(champs).toContain('phosphore');
    expect(champs).toContain('potassium');
    expect(champs).toContain('biomasse_microbienne');
    expect(champs).toContain('respiration_sol');
    expect(champs).toContain('cuivre_total');
    expect(champs).toContain('cuivre_biodisponible');
    expect(champs).toContain('cadmium_total');
    expect(champs).toContain('plomb_total');
    expect(champs).toContain('arsenic_total');
    expect(champs).toContain('manganese_total');
  });

  it('preserves texte_brut and fichier_nom', () => {
    const text = 'Some PDF content';
    const result = parseLaboText(text, 'eurofins_2025.pdf');

    expect(result.texte_brut).toBe(text);
    expect(result.fichier_nom).toBe('eurofins_2025.pdf');
  });

  it('handles chemical symbol patterns (Cu, Pb, etc.)', () => {
    const text = 'Cu total = 32,1\nPb total = 14,5\nAs total = 3,2\nMn total = 250,0';
    const result = parseLaboText(text, 'symbols.pdf');

    expect(result.valeurs.find((v) => v.champ === 'cuivre_total')!.valeur).toBeCloseTo(32.1);
    expect(result.valeurs.find((v) => v.champ === 'plomb_total')!.valeur).toBeCloseTo(14.5);
    expect(result.valeurs.find((v) => v.champ === 'arsenic_total')!.valeur).toBeCloseTo(3.2);
    expect(result.valeurs.find((v) => v.champ === 'manganese_total')!.valeur).toBeCloseTo(250.0);
  });

  it('handles dot decimal separator', () => {
    const text = 'pH eau : 6.5';
    const result = parseLaboText(text, 'dot.pdf');

    const ph = result.valeurs.find((v) => v.champ === 'ph');
    expect(ph!.valeur).toBeCloseTo(6.5);
  });

  it('extracts biological indicators', () => {
    const text = 'Biomasse microbienne : 450,2 mg C/kg\nRespiration du sol : 28,5 mg CO2/kg/j';
    const result = parseLaboText(text, 'bio.pdf');

    expect(result.valeurs.find((v) => v.champ === 'biomasse_microbienne')!.valeur).toBeCloseTo(450.2);
    expect(result.valeurs.find((v) => v.champ === 'respiration_sol')!.valeur).toBeCloseTo(28.5);
  });
});
