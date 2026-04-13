"use client";

import { RapportPDFGenerator } from "@/components/rapport/RapportPDFGenerator";

export default function RapportPage() {
  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">📄 Rapport PDF</h1>
        <p className="text-sm text-gray-500 mb-4">
          Générez un rapport professionnel pour un site et une campagne.
        </p>
        <RapportPDFGenerator />
      </div>
    </main>
  );
}
