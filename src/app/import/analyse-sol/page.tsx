"use client";

import { PDFLaboImporter } from "@/components/import/PDFLaboImporter";

export default function ImportAnalyseSolPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-[#2d5016] mb-4">
        🧪 Import PDF — Analyse de sol
      </h1>
      <p className="text-sm text-gray-500 mb-4">
        Importe un PDF d&apos;analyse de laboratoire (Eurofins, etc.). Les
        valeurs seront extraites automatiquement et tu pourras les corriger
        avant enregistrement.
      </p>
      <PDFLaboImporter />
    </div>
  );
}
