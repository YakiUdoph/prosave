import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

type SaveState = {
  panic: boolean;
  setPanic: (v: boolean) => void;
  connected: boolean;
  setConnected: (v: boolean) => void;
  intent: string;
  setIntent: (v: string) => void;
  selectedPlan: "A" | "B" | "C";
  setSelectedPlan: (v: "A" | "B" | "C") => void;
};

const SaveContext = createContext<SaveState | null>(null);

export function SaveProvider({ children }: { children: ReactNode }) {
  const [panic, setPanicState] = useState(false);
  const [connected, setConnected] = useState(false);
  const [intent, setIntent] = useState("Get me $700 USDC. Don't sell my ETH unless necessary.");
  const [selectedPlan, setSelectedPlan] = useState<"A" | "B" | "C">("B");

  const setPanic = useCallback((v: boolean) => setPanicState(v), []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("panic", panic);
    return () => root.classList.remove("panic");
  }, [panic]);

  const value = useMemo(
    () => ({
      panic,
      setPanic,
      connected,
      setConnected,
      intent,
      setIntent,
      selectedPlan,
      setSelectedPlan,
    }),
    [panic, setPanic, connected, intent, selectedPlan],
  );

  return <SaveContext.Provider value={value}>{children}</SaveContext.Provider>;
}

export function useSave() {
  const ctx = useContext(SaveContext);
  if (!ctx) throw new Error("useSave must be used inside SaveProvider");
  return ctx;
}
