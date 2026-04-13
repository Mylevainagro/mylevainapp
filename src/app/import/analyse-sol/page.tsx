"use client";

import { PDFLaboImporter } from "@/components/import/PDFLaboImporter";

export default function ImportAnalyseSolPage() {
  return (
    <div>
      <h1 className="text-xl font-bold gradient-text mb-1">🧪 Import PDF — Analyse de sol</h1>
      <p className="text-sm text-gray-500 mb-4">
        Importe un PDF d&apos;analyse de laboratoire (Eurofins, etc.). Les valeurs seront extraites automatiquement.
      </p>
      <PDFLaboImporter />
    </div>
  );
}
