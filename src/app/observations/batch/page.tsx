"use client";

import { BatchObservationForm } from "@/components/forms/BatchObservationForm";

export default function BatchObservationPage() {
  return (
    <div>
      <h1 className="text-xl font-bold gradient-text mb-1">📋 Saisie par lot — 7 rangs</h1>
      <p className="text-sm text-gray-500 mb-4">
        Saisissez les observations des 7 rangs en une seule session. Les champs communs sont partagés.
      </p>
      <BatchObservationForm />
    </div>
  );
}
