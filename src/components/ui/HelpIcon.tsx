"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { GuideNotationDrawer } from "@/components/ui/GuideNotationDrawer";

// Simple in-memory cache: code_indicateur → boolean (fiche exists & actif)
const ficheCache = new Map<string, boolean>();

interface HelpIconProps {
  codeIndicateur: string;
}

export function HelpIcon({ codeIndicateur }: HelpIconProps) {
  const [exists, setExists] = useState<boolean | null>(
    ficheCache.has(codeIndicateur) ? ficheCache.get(codeIndicateur)! : null
  );
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Already cached
    if (ficheCache.has(codeIndicateur)) {
      setExists(ficheCache.get(codeIndicateur)!);
      return;
    }

    let cancelled = false;

    supabase
      .from("guide_notation")
      .select("id")
      .eq("code_indicateur", codeIndicateur)
      .eq("actif", true)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const found = !!data;
        ficheCache.set(codeIndicateur, found);
        setExists(found);
      });

    return () => {
      cancelled = true;
    };
  }, [codeIndicateur]);

  // Exigence 1.5: render nothing if no fiche exists
  if (!exists) return null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold hover:bg-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1 shrink-0"
        aria-label={`Aide pour ${codeIndicateur}`}
      >
        ?
      </button>

      <GuideNotationDrawer
        codeIndicateur={codeIndicateur}
        isOpen={open}
        onClose={() => setOpen(false)}
        triggerRef={btnRef as React.RefObject<HTMLElement>}
      />
    </>
  );
}
