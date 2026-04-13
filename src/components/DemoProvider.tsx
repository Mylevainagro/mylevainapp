"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

const STORAGE_KEY = "mylevain_demo_mode";

interface DemoContextType {
  isDemo: boolean;
  toggleDemo: () => void;
}

const DemoContext = createContext<DemoContextType>({
  isDemo: false,
  toggleDemo: () => {},
});

export function useDemo() {
  return useContext(DemoContext);
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [isDemo, setIsDemo] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "true";
  });

  // Sync to localStorage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isDemo));
  }, [isDemo]);

  const toggleDemo = useCallback(() => {
    setIsDemo((v) => !v);
  }, []);

  return (
    <DemoContext.Provider value={{ isDemo, toggleDemo }}>
      {children}
    </DemoContext.Provider>
  );
}
