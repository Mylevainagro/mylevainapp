"use client";

interface SliderNoteProps {
  label: string;
  value: number | null;
  onChange: (val: number) => void;
  max?: number;
}

export function SliderNote({ label, value, onChange, max = 5 }: SliderNoteProps) {
  const current = value ?? 0;
  const colors = max === 3
    ? ["bg-green-500", "bg-yellow-400", "bg-orange-500", "bg-red-500"]
    : ["bg-green-500", "bg-green-400", "bg-yellow-400", "bg-orange-400", "bg-orange-500", "bg-red-500"];

  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-sm w-36 shrink-0">{label}</span>
      <div className="flex gap-1.5 flex-1">
        {Array.from({ length: max + 1 }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${
              i === current
                ? `${colors[i]} text-white shadow-md scale-110`
                : "bg-gray-100 text-gray-400 hover:bg-gray-200"
            }`}
          >
            {i}
          </button>
        ))}
      </div>
    </div>
  );
}
