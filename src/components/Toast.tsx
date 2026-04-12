"use client";

import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  visible: boolean;
  onClose: () => void;
}

const ICONS = { success: "✅", error: "❌", info: "ℹ️" };
const COLORS = {
  success: "bg-green-50 border-green-200 text-green-800",
  error: "bg-red-50 border-red-200 text-red-800",
  info: "bg-blue-50 border-blue-200 text-blue-800",
};

export function Toast({ message, type = "success", visible, onClose }: ToastProps) {
  useEffect(() => {
    if (visible) {
      const t = setTimeout(onClose, 3000);
      return () => clearTimeout(t);
    }
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-[200] flex justify-center animate-slideDown">
      <div className={`${COLORS[type]} border rounded-xl px-4 py-3 shadow-lg text-sm font-medium flex items-center gap-2 max-w-md`}>
        <span>{ICONS[type]}</span>
        {message}
      </div>
    </div>
  );
}
