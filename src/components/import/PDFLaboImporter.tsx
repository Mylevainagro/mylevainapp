"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Toast } from "@/components/Toast";
import { SelectField } from "@/components/ui/SelectField";
import type { ParsedLaboResult, ParsedLaboValue } from "@/lib/types";
import { parseLaboText } from "@/lib/pdf-labo-parser";

// ============================================================
// PDFLaboImporter — Import PDF d'analyses de laboratoire
// Exigences : 6.3, 6.4, 6.5, 6.6
// ============================================================

/** Labels lisibles pour chaque champ d'analyse sol */
const CHAMP_LABELS: Record<string, string> = {
  ph: "pH",
  matiere_organique_pct: "Matière organique (%)",
  rapport_c_n: "Rapport C/N",
  azote_total: "Azote total",
  phosphore: "Phosphore",
  potassium: "Potassium",
  biomasse_microbienne: "Biomasse microbienne",
  respiration_sol: "Respiration du sol",
  cuivre_total: "Cuivre total",
  cuivre_biodisponible: "Cuivre biodisponible",
  cadmium_total: "Cadmium total",
  plomb_total: "Plomb total",
  arsenic_total: "Arsenic total",
  manganese_total: "Manganèse total",
};

/** Badge de confiance avec couleur */
function ConfianceBadge({ confiance }: { confiance: ParsedLaboValue["confiance"] }) {
  const styles: Record<string, string> = {
    haute: "bg-green-100 text-green-800",
    moyenne: "bg-yellow-100 text-yellow-800",
    basse: "bg-orange-100 text-orange-800",
    non_detecte: "bg-red-100 text-red-800",
  };
  const labels: Record<string, string> = {
    haute: "Haute",
    moyenne: "Moyenne",
    basse: "Basse",
    non_detecte: "⚠ Non détecté",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[confiance]}`}>
      {labels[confiance]}
    </span>
  );
}

interface ParcelleItem {
  id: string;
  nom: string;
  vignoble_id: string;
}

interface VignobleItem {
  id: string;
  nom: string;
}

export function PDFLaboImporter() {
  const router = useRouter();

  // State: parsing
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<ParsedLaboResult | null>(null);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  // State: metadata
  const [vignoblesList, setVignoblesList] = useState<VignobleItem[]>([]);
  const [parcellesList, setParcellesList] = useState<ParcelleItem[]>([]);
  const [vignoble, setVignoble] = useState("");
  const [parcelleId, setParcelleId] = useState("");
  const [datePrelevement, setDatePrelevement] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [phase, setPhase] = useState<"T0" | "Tfinal">("T0");

  // State: saving
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
    visible: boolean;
  }>({ message: "", type: "success", visible: false });
  const hideToast = useCallback(
    () => setToast((t) => ({ ...t, visible: false })),
    []
  );

  // Load vignobles & parcelles
  useEffect(() => {
    async function load() {
      const [v, p] = await Promise.all([
        supabase.from("vignobles").select("id, nom").order("nom"),
        supabase
          .from("parcelles")
          .select("id, vignoble_id, nom")
          .order("nom"),
      ]);
      if (v.data) setVignoblesList(v.data);
      if (p.data) setParcellesList(p.data);
    }
    load();
  }, []);

  const parcelles = vignoble
    ? parcellesList.filter((p) => {
        const v = vignoblesList.find((vv) => vv.nom === vignoble);
        return v && p.vignoble_id === v.id;
      })
    : [];

  // Handle file selection and parsing
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.type !== "application/pdf") {
      setToast({
        message: "Seuls les fichiers PDF sont acceptés",
        type: "error",
        visible: true,
      });
      return;
    }
    setFile(selected);
    setParsing(true);
    setResult(null);
    setEditedValues({});

    try {
      // Read file as ArrayBuffer, extract text via pdf-parse
      const arrayBuffer = await selected.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const pdfParse = (await import("pdf-parse")).default;
      const pdfData = await pdfParse(buffer);
      const parsed = parseLaboText(pdfData.text, selected.name);
      setResult(parsed);

      // Pre-fill editable values
      const initial: Record<string, string> = {};
      for (const v of parsed.valeurs) {
        initial[v.champ] = v.valeur !== null ? String(v.valeur) : "";
      }
      setEditedValues(initial);
    } catch (err) {
      setToast({
        message: "Erreur lors du parsing du PDF",
        type: "error",
        visible: true,
      });
    } finally {
      setParsing(false);
    }
  }

  function handleValueChange(champ: string, val: string) {
    setEditedValues((prev) => ({ ...prev, [champ]: val }));
  }

  // Submit: insert into analyses_sol + upload PDF to Supabase Storage
  async function handleSubmit() {
    if (!parcelleId) {
      setToast({
        message: "Sélectionne un vignoble et une parcelle",
        type: "error",
        visible: true,
      });
      return;
    }
    if (!file || !result) return;

    setSaving(true);

    try {
      // 1. Upload PDF to Supabase Storage
      const storagePath = `analyses-sol/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(storagePath, file, { contentType: "application/pdf" });

      let fichierPdfUrl: string | null = null;
      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from("documents")
          .getPublicUrl(storagePath);
        fichierPdfUrl = urlData.publicUrl;
      }

      // 2. Build the record from edited values
      const record: Record<string, unknown> = {
        parcelle_id: parcelleId,
        date_prelevement: datePrelevement,
        phase,
        fichier_pdf_url: fichierPdfUrl,
      };

      for (const [champ, val] of Object.entries(editedValues)) {
        if (val !== "") {
          const num = parseFloat(val);
          record[champ] = isNaN(num) ? null : num;
        } else {
          record[champ] = null;
        }
      }

      // 3. Insert into analyses_sol
      const { error: insertError } = await supabase
        .from("analyses_sol")
        .insert(record);

      if (insertError) {
        setToast({
          message: "Erreur insertion : " + insertError.message,
          type: "error",
          visible: true,
        });
      } else {
        setToast({
          message: "Analyse sol enregistrée ✓",
          type: "success",
          visible: true,
        });
        setTimeout(() => router.push("/"), 1500);
      }
    } catch {
      setToast({
        message: "Erreur inattendue lors de l'enregistrement",
        type: "error",
        visible: true,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onClose={hideToast}
      />

      {/* Metadata: vignoble, parcelle, date, phase */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">
          📍 Identification
        </h2>
        <SelectField
          label="Vignoble"
          value={vignoble}
          onChange={(v) => {
            setVignoble(v);
            setParcelleId("");
          }}
          options={vignoblesList.map((v) => v.nom)}
        />
        {parcelles.length > 0 && (
          <SelectField
            label="Parcelle"
            value={parcelleId}
            onChange={setParcelleId}
            options={parcelles.map((p) => p.id)}
          />
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Date prélèvement
            </label>
            <input
              type="date"
              value={datePrelevement}
              onChange={(e) => setDatePrelevement(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <SelectField
            label="Phase"
            value={phase}
            onChange={(v) => setPhase(v as "T0" | "Tfinal")}
            options={["T0", "Tfinal"]}
          />
        </div>
      </div>

      {/* File upload */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">
          📄 Fichier PDF labo
        </h2>
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-6 cursor-pointer hover:border-[#2d5016]/50 transition-colors">
          <span className="text-3xl mb-2">📎</span>
          <span className="text-sm text-gray-500">
            {file ? file.name : "Cliquer pour sélectionner un PDF"}
          </span>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
        {parsing && (
          <p className="text-sm text-gray-500 animate-pulse">
            Analyse du PDF en cours...
          </p>
        )}
      </div>

      {/* Preview table of detected values */}
      {result && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">
            🔍 Valeurs détectées
          </h2>
          <p className="text-xs text-gray-400">
            Fichier : {result.fichier_nom}
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="py-2 pr-2 font-medium text-gray-600">
                    Champ
                  </th>
                  <th className="py-2 pr-2 font-medium text-gray-600">
                    Valeur
                  </th>
                  <th className="py-2 font-medium text-gray-600">
                    Confiance
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.valeurs.map((v) => (
                  <tr
                    key={v.champ}
                    className={`border-b border-gray-100 ${
                      v.confiance === "non_detecte" ? "bg-red-50/50" : ""
                    }`}
                  >
                    <td className="py-2 pr-2 text-gray-700">
                      {CHAMP_LABELS[v.champ] || v.champ}
                      {v.valeur_brute && (
                        <span className="block text-xs text-gray-400 truncate max-w-[200px]">
                          {v.valeur_brute}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        step="any"
                        value={editedValues[v.champ] ?? ""}
                        onChange={(e) =>
                          handleValueChange(v.champ, e.target.value)
                        }
                        placeholder={
                          v.confiance === "non_detecte"
                            ? "Saisir manuellement"
                            : ""
                        }
                        className={`border rounded-lg px-2 py-1 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-[#2d5016]/30 ${
                          v.confiance === "non_detecte"
                            ? "border-red-300 bg-red-50"
                            : "border-gray-200"
                        }`}
                      />
                    </td>
                    <td className="py-2">
                      <ConfianceBadge confiance={v.confiance} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="flex gap-3 text-xs text-gray-500 pt-2">
            <span>
              ✅{" "}
              {result.valeurs.filter((v) => v.confiance === "haute").length}{" "}
              détectés
            </span>
            <span>
              ⚠️{" "}
              {
                result.valeurs.filter((v) => v.confiance === "non_detecte")
                  .length
              }{" "}
              non détectés
            </span>
          </div>
        </div>
      )}

      {/* Submit button */}
      {result && (
        <button
          onClick={handleSubmit}
          disabled={saving || !parcelleId}
          className="w-full bg-[#2d5016] text-white rounded-xl py-4 font-semibold text-lg shadow-md hover:bg-[#3a6b1e] disabled:opacity-50"
        >
          {saving
            ? "Enregistrement..."
            : "✅ Valider et enregistrer l'analyse"}
        </button>
      )}
    </div>
  );
}
