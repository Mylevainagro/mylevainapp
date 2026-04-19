"use client";

import { BatchObservationForm } from "@/components/forms/BatchObservationForm";

export default function BatchObservationPage() {
  return (
    <div>
      <h1 className="text-xl font-bold gradient-text mb-1">📋 Saisie par lots</h1>
      <p className="text-sm text-gray-500 mb-4">
        Saisissez plusieurs observations en une seule session — par rangs ou par placettes.
      </p>
      <BatchObservationForm />
    </div>
  );
}
