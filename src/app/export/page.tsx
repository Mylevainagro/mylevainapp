"use client";

import { ExportPanel } from "@/components/export/ExportPanel";

export default function ExportPage() {
  return (
    <div>
      <h1 className="text-xl font-bold gradient-text mb-1">📥 Export des données</h1>
      <p className="text-sm text-gray-500 mb-4">
        Exportez vos observations, traitements et analyses en CSV, Excel ou JSON.
      </p>
      <ExportPanel />
    </div>
  );
}
