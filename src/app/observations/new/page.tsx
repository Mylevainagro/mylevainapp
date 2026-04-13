"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ObservationForm } from "@/components/forms/ObservationForm";
import { supabase } from "@/lib/supabase/client";
import { dupliquerObservation } from "@/lib/duplication";
import type { Observation, ObservationFormData } from "@/lib/types";

export default function NewObservationPage() {
  const searchParams = useSearchParams();
  const duplicateId = searchParams.get("duplicate");
  const [initialData, setInitialData] = useState<ObservationFormData | undefined>(undefined);
  const [loading, setLoading] = useState(!!duplicateId);

  useEffect(() => {
    if (!duplicateId) return;
    async function loadSource() {
      const { data, error } = await supabase
        .from("observations")
        .select("*")
        .eq("id", duplicateId)
        .single();
      if (!error && data) {
        setInitialData(dupliquerObservation(data as Observation));
      }
      setLoading(false);
    }
    loadSource();
  }, [duplicateId]);

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3 animate-pulse">📋</div>
        <p className="text-gray-400">Chargement du modèle...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-[#2d5016] mb-4">
        {initialData ? "📋 Nouvelle observation (depuis modèle)" : "📝 Nouvelle observation"}
      </h1>
      <ObservationForm initialData={initialData} />
    </div>
  );
}
