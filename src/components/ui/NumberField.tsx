"use client";

interface NumberFieldProps {
  label: string;
  value: number | null;
  onChange: (val: number | null) => void;
  unit?: string;
  step?: number;
  min?: number;
  max?: number;
}

export function NumberField({ label, value, onChange, unit, step = 1, min, max }: NumberFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          step={step}
          min={min}
          max={max}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#2d5016]/30"
        />
        {unit && <span className="text-sm text-gray-500 shrink-0">{unit}</span>}
      </div>
    </div>
  );
}
