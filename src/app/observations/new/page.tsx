import { ObservationForm } from "@/components/forms/ObservationForm";

export default function NewObservationPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-[#2d5016] mb-4">📝 Nouvelle observation</h1>
      <ObservationForm />
    </div>
  );
}
