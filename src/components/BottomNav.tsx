"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Accueil", icon: "🏡", exact: true },
  { href: "/observations/new", label: "Saisie", icon: "📝", exact: true },
  { href: "/observations", label: "Historique", icon: "📋", exact: true },
  { href: "/traitements", label: "Traitement", icon: "💧", exact: false },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 z-50 safe-area-bottom">
      <div className="max-w-lg mx-auto flex justify-around py-1">
        {NAV_ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-2 px-4 rounded-xl transition-all ${
                active
                  ? "text-[#2d5016] bg-[#2d5016]/5 font-semibold"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <span className={`text-xl mb-0.5 transition-transform ${active ? "scale-110" : ""}`}>
                {item.icon}
              </span>
              <span className="text-[10px] leading-tight">{item.label}</span>
              {active && (
                <div className="w-1 h-1 rounded-full bg-[#2d5016] mt-0.5" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
