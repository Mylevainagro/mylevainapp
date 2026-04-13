"use client";

import { RapportPDFGenerator } from "@/components/rapport/RapportPDFGenerator";

export default function RapportPage() {
  return (
    <div>
      <h1 className="text-xl font-bold gradient-text mb-1">📄 Rapport PDF</h1>
      <p className="text-sm text-gray-500 mb-4">
        Générez un rapport professionnel pour un site et une campagne.
      </p>
      <RapportPDFGenerator />
    </div>
  );
}
