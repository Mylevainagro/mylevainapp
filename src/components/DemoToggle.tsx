"use client";

import { useDemo } from "@/components/DemoProvider";

export function DemoToggle() {
  const { isDemo, toggleDemo } = useDemo();

  return (
    <button
      onClick={toggleDemo}
      className={`fixed bottom-[4.5rem] left-3 z-[60] flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold shadow-lg transition-all active:scale-95 ${
        isDemo
          ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-purple-200"
          : "bg-white/90 backdrop-blur-sm text-gray-500 border border-gray-200 shadow-gray-200/50"
      }`}
    >
      <span className="relative flex h-2 w-2">
        {isDemo && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/60" />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${isDemo ? "bg-white" : "bg-gray-400"}`} />
      </span>
      {isDemo ? "Démo" : "Réel"}
    </button>
  );
}
