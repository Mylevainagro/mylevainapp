export function PDFLaboImporter() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ParsedLaboResult | null>(null);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  const [vignoblesList, setVignoblesList] = useState<VignobleItem[]>([]);
  const [parcellesList, setParcellesList] = useState<ParcelleItem[]>([]);
  const [vignoble, setVignoble] = useState("");
  const [parcelleId, setParcelleId] = useState("");
  const [datePrelevement, setDatePrelevement] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [phase, setPhase] = useState<"T0" | "Tfinal">("T0");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
    visible: boolean;
  }>({ message: "", type: "success", visible: false });

  const hideToast = () => setToast((t) => ({ ...t, visible: false }));

  useEffect(() => {
    async function load() {
      const [v, p] = await Promise.all([
        supabase.from("sites").select("id, nom").order("nom"),
        supabase.from("parcelles").select("id, vignoble_id, nom").order("nom"),
      ]);

      if (v.data) setVignoblesList(v.data);
      if (p.data) setParcellesList(p.data);
    }

    load();
  }, []);

  const parcelles = vignoble
    ? parcellesList.filter((p) => {
        const selectedVignoble = vignoblesList.find((v) => v.nom === vignoble);
        return selectedVignoble && p.vignoble_id === selectedVignoble.id;
      })
    : [];

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
    setResult({
      valeurs: [],
      texte_brut: "",
      fichier_nom: selected.name,
    });
    setEditedValues({});
    setMessage(`PDF prêt : ${selected.name}`);
    setToast({
      message: `PDF "${selected.name}" prêt. Sélectionne la parcelle puis valide.`,
      type: "success",
      visible: true,
    });
  }

  function handleValueChange(champ: string, val: string) {
    setEditedValues((prev) => ({ ...prev, [champ]: val }));
  }

  async function handleSubmit() {
    setMessage("Clic détecté : enregistrement en cours...");

    if (!file) {
      setToast({
        message: "Sélectionne d'abord un PDF",
        type: "error",
        visible: true,
      });
      return;
    }

    if (!parcelleId) {
      setToast({
        message: "Sélectionne une parcelle",
        type: "error",
        visible: true,
      });
      return;
    }

    setSaving(true);

    try {
      const storagePath = `analyses-sol/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(storagePath, file, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) {
        throw new Error("Erreur upload PDF : " + uploadError.message);
      }

      const { data: urlData } = supabase.storage
        .from("documents")
        .getPublicUrl(storagePath);

      const record: Record<string, unknown> = {
        parcelle_id: parcelleId,
        date_prelevement: datePrelevement,
        phase,
        fichier_pdf_url: urlData.publicUrl,
        fichier_pdf_storage_path: storagePath,
        laboratoire: "Eurofins Galys",
      };

      for (const [champ, val] of Object.entries(editedValues)) {
        if (val !== "") {
          const num = parseFloat(val);
          record[champ] = isNaN(num) ? null : num;
        }
      }

      const { data: insertedAnalyse, error: insertError } = await supabase
        .from("analyses_sol")
        .insert(record)
        .select()
        .single();

      if (insertError || !insertedAnalyse) {
        throw new Error(
          "Erreur insertion analyse_sol : " +
            (insertError?.message || "analyse non créée")
        );
      }

      const extractionResponse = await fetch("/api/extract-soil-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analyseId: insertedAnalyse.id,
          storagePath,
        }),
      });

      const extractionResult = await extractionResponse.json();

      if (!extractionResponse.ok) {
        throw new Error(
          "Analyse créée, mais extraction PDF échouée : " +
            (extractionResult.error || "erreur inconnue")
        );
      }

      setToast({
        message: "Analyse enregistrée et PDF extrait ✓",
        type: "success",
        visible: true,
      });

      setMessage(
        `Extraction réussie : cuivre ${extractionResult.extracted?.cuivre ?? "?"}, MO ${
          extractionResult.extracted?.matiereOrganique ?? "?"
        }, CEC ${extractionResult.extracted?.cec ?? "?"}`
      );

      setTimeout(() => router.push("/"), 2000);
    } catch (err: any) {
      console.error("ERREUR HANDLE SUBMIT:", err);
      setToast({
        message: err?.message || "Erreur inattendue",
        type: "error",
        visible: true,
      });
      setMessage(err?.message || "Erreur inattendue");
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
      </div>

      {result && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">
            🔍 PDF prêt à extraire
          </h2>
          <p className="text-sm text-gray-600">
            Fichier : {result.fichier_nom}
          </p>
          <p className="text-xs text-gray-400">
            L’extraction automatique se fera après validation.
          </p>
        </div>
      )}

      {message && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-700">
          {message}
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={saving || !file}
        className="w-full bg-[#2d5016] text-white rounded-xl py-4 font-semibold text-lg shadow-md hover:bg-[#3a6b1e] disabled:opacity-50"
      >
        {saving ? "Enregistrement..." : "✅ Valider et enregistrer l'analyse"}
      </button>
    </div>
  );
}