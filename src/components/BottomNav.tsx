"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

const NAV_ITEMS = [
  { href: "/", label: "Accueil", icon: "🏡", exact: true },
  { href: "/observations/new", label: "Observation", icon: "📝", exact: true },
  { href: "/observations", label: "Historique", icon: "📋", exact: true },
  { href: "/traitements", label: "Traitement", icon: "💧", exact: false },
];

const MORE_ITEMS = [
  { href: "/export", label: "Export données", icon: "📥" },
  { href: "/rapport", label: "Rapport PDF", icon: "📄" },
  { href: "/import/analyse-sol", label: "Import labo", icon: "🧪" },
  { href: "/observations/batch", label: "Saisie par lot", icon: "📋" },
];

const ADMIN_ITEM = { href: "/admin", label: "Administration", icon: "⚙️" };

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const allMoreItems = user?.role === 'admin'
    ? [...MORE_ITEMS, ADMIN_ITEM]
    : MORE_ITEMS;

  const moreActive = allMoreItems.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    if (moreOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [moreOpen]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#1a3328]/95 backdrop-blur-xl border-t border-[#2f5244]/60 z-50 safe-area-bottom">
      <div className="max-w-lg mx-auto flex justify-around py-1.5">
        {NAV_ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-1.5 px-3 rounded-2xl transition-all ${
                active
                  ? "text-emerald-300 bg-emerald-900/30 font-semibold"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <span className={`text-xl mb-0.5 transition-transform ${active ? "scale-110" : ""}`}>
                {item.icon}
              </span>
              <span className="text-[10px] leading-tight">{item.label}</span>
              {active && <div className="w-1 h-1 rounded-full bg-emerald-300 mt-0.5" />}
            </Link>
          );
        })}

        {/* Plus menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className={`flex flex-col items-center py-1.5 px-3 rounded-2xl transition-all ${
              moreActive
                ? "text-emerald-300 bg-emerald-900/30 font-semibold"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <span className={`text-xl mb-0.5 transition-transform ${moreOpen ? "rotate-45" : ""} ${moreActive ? "scale-110" : ""}`}>
              ➕
            </span>
            <span className="text-[10px] leading-tight">Plus</span>
            {moreActive && <div className="w-1 h-1 rounded-full bg-emerald-300 mt-0.5" />}
          </button>

          {moreOpen && (
            <div className="absolute bottom-full right-0 mb-3 bg-[#243d33] border border-[#2f5244] rounded-2xl shadow-xl py-2 min-w-[180px] animate-slideDown">
              {allMoreItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                      active
                        ? "text-emerald-300 bg-emerald-900/20 font-semibold"
                        : "text-gray-300 hover:bg-[#2f5244]/50"
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
