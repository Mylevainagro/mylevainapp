"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

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
  const [isDemo, setIsDemo] = useState(false);

  const toggleDemo = useCallback(() => {
    setIsDemo((v) => !v);
  }, []);

  return (
    <DemoContext.Provider value={{ isDemo, toggleDemo }}>
      {children}
    </DemoContext.Provider>
  );
}
