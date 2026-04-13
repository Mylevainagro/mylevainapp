"use client";

import { BatchObservationForm } from "@/components/forms/BatchObservationForm";

export default function BatchObservationPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-[#2d5016] mb-4">
        📝 Saisie par lot — 7 rangs
      </h1>
      <p className="text-sm text-gray-500 mb-4">
        Saisissez les observations des 7 rangs en une seule session. Les champs communs (date, météo, parcelle) sont partagés.
      </p>
      <BatchObservationForm />
    </div>
  );
}
