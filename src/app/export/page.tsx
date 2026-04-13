"use client";

import { ExportPanel } from "@/components/export/ExportPanel";

export default function ExportPage() {
  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">📥 Export des données</h1>
        <p className="text-sm text-gray-500 mb-4">
          Exportez vos observations, traitements et analyses en CSV, Excel ou JSON.
        </p>
        <ExportPanel />
      </div>
    </main>
  );
}
